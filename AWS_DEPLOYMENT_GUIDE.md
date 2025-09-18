# AWS Deployment Guide for AiSearch

## Overview
This guide will help you deploy your AiSearch application to AWS using containerized services with ECS, Application Load Balancer, and ECR.

## Architecture Overview
```
Internet → Route 53 → CloudFront → ALB → ECS Fargate Services
                                         ├── Frontend (Next.js)
                                         ├── Backend (Node.js API)
                                         └── SearXNG (Search Engine)
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **AWS CLI** installed and configured
3. **Docker** installed locally
4. **Domain name** (optional but recommended)

## Step-by-Step Deployment

### Phase 1: Initial Setup

#### 1. Configure AWS CLI
```bash
aws configure
# Enter your AWS Access Key ID
# Enter your AWS Secret Access Key  
# Default region: us-east-1
# Default output format: json
```

#### 2. Set Environment Variables
```bash
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export AWS_REGION="us-east-1"
export CLUSTER_NAME="aisearch-cluster"
```

### Phase 2: Infrastructure Setup

#### 3. Create VPC and Networking
```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=aisearch-vpc}]' \
  --query 'Vpc.VpcId' --output text)

# Create Internet Gateway
IGW_ID=$(aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=aisearch-igw}]' \
  --query 'InternetGateway.InternetGatewayId' --output text)

# Attach Internet Gateway to VPC
aws ec2 attach-internet-gateway --vpc-id $VPC_ID --internet-gateway-id $IGW_ID

# Create public subnets
SUBNET_1=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=aisearch-public-1}]' \
  --query 'Subnet.SubnetId' --output text)

SUBNET_2=$(aws ec2 create-subnet \
  --vpc-id $VPC_ID \
  --cidr-block 10.0.2.0/24 \
  --availability-zone us-east-1b \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=aisearch-public-2}]' \
  --query 'Subnet.SubnetId' --output text)

# Create route table and routes
ROUTE_TABLE_ID=$(aws ec2 create-route-table \
  --vpc-id $VPC_ID \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=aisearch-public-rt}]' \
  --query 'RouteTable.RouteTableId' --output text)

aws ec2 create-route --route-table-id $ROUTE_TABLE_ID --destination-cidr-block 0.0.0.0/0 --gateway-id $IGW_ID

# Associate subnets with route table
aws ec2 associate-route-table --subnet-id $SUBNET_1 --route-table-id $ROUTE_TABLE_ID
aws ec2 associate-route-table --subnet-id $SUBNET_2 --route-table-id $ROUTE_TABLE_ID

# Enable auto-assign public IP
aws ec2 modify-subnet-attribute --subnet-id $SUBNET_1 --map-public-ip-on-launch
aws ec2 modify-subnet-attribute --subnet-id $SUBNET_2 --map-public-ip-on-launch
```

#### 4. Create Security Groups
```bash
# Security group for ALB
ALB_SG=$(aws ec2 create-security-group \
  --group-name aisearch-alb-sg \
  --description "Security group for AiSearch ALB" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

# Allow HTTP and HTTPS traffic to ALB
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $ALB_SG --protocol tcp --port 443 --cidr 0.0.0.0/0

# Security group for ECS services
ECS_SG=$(aws ec2 create-security-group \
  --group-name aisearch-ecs-sg \
  --description "Security group for AiSearch ECS services" \
  --vpc-id $VPC_ID \
  --query 'GroupId' --output text)

# Allow traffic from ALB to ECS services
aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 3000 --source-group $ALB_SG
aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 8000 --source-group $ALB_SG
aws ec2 authorize-security-group-ingress --group-id $ECS_SG --protocol tcp --port 8080 --source-group $ECS_SG
```

### Phase 3: Container Registry & Images

#### 5. Run the Automated Deployment Script
```bash
# Update the script with your AWS account ID first
cd aws/
./deploy.sh
```

### Phase 4: Application Load Balancer

#### 6. Create Application Load Balancer
```bash
# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name aisearch-alb \
  --subnets $SUBNET_1 $SUBNET_2 \
  --security-groups $ALB_SG \
  --query 'LoadBalancers[0].LoadBalancerArn' --output text)

# Create target groups
FRONTEND_TG=$(aws elbv2 create-target-group \
  --name aisearch-frontend-tg \
  --protocol HTTP \
  --port 3000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path / \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

BACKEND_TG=$(aws elbv2 create-target-group \
  --name aisearch-backend-tg \
  --protocol HTTP \
  --port 8000 \
  --vpc-id $VPC_ID \
  --target-type ip \
  --health-check-path /health \
  --query 'TargetGroups[0].TargetGroupArn' --output text)

# Create listeners
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=$FRONTEND_TG

# Create listener rule for API traffic
aws elbv2 create-rule \
  --listener-arn $(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[0].ListenerArn' --output text) \
  --priority 100 \
  --conditions Field=path-pattern,Values='/api/*' \
  --actions Type=forward,TargetGroupArn=$BACKEND_TG
```

### Phase 5: Secrets Management

#### 7. Store API Keys in AWS Secrets Manager
```bash
# Store Google API Key
aws secretsmanager create-secret \
  --name "aisearch/google-api-key" \
  --description "Google API Key for AiSearch" \
  --secret-string "YOUR_GOOGLE_API_KEY"

# Store OpenAI API Key  
aws secretsmanager create-secret \
  --name "aisearch/openai-api-key" \
  --description "OpenAI API Key for AiSearch" \
  --secret-string "YOUR_OPENAI_API_KEY"
```

### Phase 6: ECS Services

#### 8. Update Task Definition Files
Before registering task definitions, update the following in each JSON file:
- Replace `<YOUR_ACCOUNT_ID>` with your actual AWS account ID
- Update environment variables as needed

#### 9. Register Task Definitions
```bash
aws ecs register-task-definition --cli-input-json file://ecs-backend-task-definition.json
aws ecs register-task-definition --cli-input-json file://ecs-frontend-task-definition.json  
aws ecs register-task-definition --cli-input-json file://ecs-searxng-task-definition.json
```

#### 10. Create ECS Services
```bash
# Create SearXNG service first (internal dependency)
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name aisearch-searxng \
  --task-definition aisearch-searxng \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --enable-execute-command

# Create Backend service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name aisearch-backend \
  --task-definition aisearch-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$BACKEND_TG,containerName=backend,containerPort=8000" \
  --enable-execute-command

# Create Frontend service
aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name aisearch-frontend \
  --task-definition aisearch-frontend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=$FRONTEND_TG,containerName=frontend,containerPort=3000" \
  --enable-execute-command
```

## Production Optimizations

### SSL Certificate & Domain Setup
1. **Get SSL Certificate from AWS Certificate Manager**
2. **Set up Route 53 hosted zone** for your domain
3. **Update ALB listener** to use HTTPS

### Monitoring & Logging
- **CloudWatch**: Already configured in task definitions
- **X-Ray**: Add for distributed tracing
- **CloudWatch Alarms**: Set up for key metrics

### Auto Scaling
```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/$CLUSTER_NAME/aisearch-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 1 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/$CLUSTER_NAME/aisearch-backend \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name aisearch-backend-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

### Security Best Practices
1. **Use least privilege IAM roles**
2. **Enable VPC Flow Logs**
3. **Set up AWS WAF** for the ALB
4. **Enable GuardDuty** for threat detection
5. **Use AWS Config** for compliance monitoring

## Estimated Monthly Costs (us-east-1)

- **ECS Fargate**: ~$50-100/month (depending on CPU/memory usage)
- **Application Load Balancer**: ~$20/month
- **ECR Storage**: ~$1-5/month
- **CloudWatch Logs**: ~$5-15/month
- **Data Transfer**: Variable based on traffic

**Total**: ~$75-150/month for a moderate traffic application

## Troubleshooting

### Common Issues
1. **Task not starting**: Check CloudWatch logs and task definition
2. **Health check failures**: Verify health check endpoints
3. **Connection issues**: Check security groups and network configuration
4. **Service discovery**: Ensure proper service naming and networking

### Useful Commands
```bash
# Check service status
aws ecs describe-services --cluster $CLUSTER_NAME --services aisearch-backend

# View service logs
aws logs tail /ecs/aisearch-backend --follow

# Update service with new task definition
aws ecs update-service --cluster $CLUSTER_NAME --service aisearch-backend --task-definition aisearch-backend:2
```

## Next Steps After Deployment

1. **Set up CI/CD pipeline** using AWS CodePipeline
2. **Implement blue-green deployments**
3. **Add CloudFront CDN** for better performance
4. **Set up backup strategies**
5. **Implement comprehensive monitoring dashboards**

---

**Need Help?** Check the troubleshooting section or review AWS ECS documentation for additional guidance.