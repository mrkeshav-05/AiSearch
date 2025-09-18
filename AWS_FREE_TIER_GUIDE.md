# AiSearch - FREE TIER AWS Deployment Guide

## 🎯 Overview
Deploy your AiSearch application on AWS using **FREE TIER** resources with easy start/stop functionality to minimize costs. Perfect for development, testing, or personal use.

## 💰 Cost Breakdown
- **Monthly Cost**: $0-5 (if staying within free tier limits)
- **When Stopped**: ~$0.50/month (only ECR storage)
- **Free Tier Benefits**: 12 months free + always free tiers

### AWS Free Tier Limits
| Service | Free Tier Limit | AiSearch Usage |
|---------|----------------|----------------|
| ECS Fargate | 20 GB-hours/month (always free) | ~15 GB-hours/month |
| ECR Storage | 500 MB/month (12 months) | ~200-300 MB |
| CloudWatch Logs | 5 GB/month (always free) | ~1-2 GB/month |
| Data Transfer | 100 GB/month (always free) | Varies by usage |

## 🚀 Quick Start

### Prerequisites
1. AWS Account with free tier eligibility
2. AWS CLI installed and configured
3. Docker installed locally

### Step 1: One-Time Setup
```bash
# Clone your repository
cd /path/to/AiSearch

# Run the free tier deployment script
./aws/deploy-free-tier.sh
```

### Step 2: Register Task Definitions
```bash
cd aws/

# Register the optimized task definitions
aws ecs register-task-definition --cli-input-json file://ecs-backend-free-task-definition.json --region us-east-1
aws ecs register-task-definition --cli-input-json file://ecs-frontend-free-task-definition.json --region us-east-1
aws ecs register-task-definition --cli-input-json file://ecs-searxng-free-task-definition.json --region us-east-1
```

### Step 3: Start Your Application
```bash
# Start all services
./aws/start-services.sh

# Get your application URL (wait 2-3 minutes after starting)
./aws/get-app-url.sh
```

### Step 4: Stop When Not Needed
```bash
# Stop all services to save costs
./aws/stop-services.sh
```

## 🛠️ Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `deploy-free-tier.sh` | Initial setup and image deployment | Run once |
| `start-services.sh` | Start application services | When you want to use the app |
| `stop-services.sh` | Stop services to save costs | When done using the app |
| `get-app-url.sh` | Get current application URLs | Check service status |
| `cleanup-all.sh` | Complete resource cleanup | Remove everything |

## 📊 Resource Specifications

### Optimized for Free Tier
- **CPU**: 0.25 vCPU per service (256 CPU units)
- **Memory**: 512 MB per service
- **Total Resources**: 0.75 vCPU, 1.5 GB RAM when running
- **Services**: 3 containers (Frontend, Backend, SearXNG)

### Network Configuration
- Uses default VPC and subnets (free)
- Public IP assignment for internet access
- Default security group (allows all outbound traffic)

## 🔧 Typical Usage Workflow

### Daily Development
```bash
# Morning: Start your application
./aws/start-services.sh

# Get your app URL
./aws/get-app-url.sh

# Work with your application...

# Evening: Stop to save costs
./aws/stop-services.sh
```

### Weekend/Extended Breaks
```bash
# Stop services
./aws/stop-services.sh

# Cost: ~$0.50/month (just ECR storage)
```

### Complete Shutdown
```bash
# Remove everything (if not using for extended period)
./aws/cleanup-all.sh

# Cost: $0/month
# Note: You'll need to run deploy-free-tier.sh again to restart
```

## 🔍 Monitoring Your Costs

### AWS Cost Dashboard
1. Go to AWS Console → Billing & Cost Management
2. Check "Free Tier" usage
3. Set up billing alerts for $1-2

### Key Metrics to Monitor
- **ECS Fargate**: Should stay under 20 GB-hours/month
- **ECR Storage**: Should stay under 500 MB
- **Data Transfer**: Monitor for unexpected spikes

## 🛡️ Security Configuration

### IAM Roles Required
```bash
# Create ECS task execution role (if not exists)
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

### Secrets Management
```bash
# Store your API keys securely
aws secretsmanager create-secret --name "aisearch/google-api-key" --secret-string "YOUR_GOOGLE_API_KEY"
aws secretsmanager create-secret --name "aisearch/openai-api-key" --secret-string "YOUR_OPENAI_API_KEY"
```

## 🐛 Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check service status
aws ecs describe-services --cluster aisearch-free-cluster --services aisearch-frontend --region us-east-1

# Check task logs
aws logs tail /ecs/aisearch-frontend --follow --region us-east-1
```

#### Can't Access Application
1. **Security Groups**: Ensure default security group allows inbound traffic
2. **Task Status**: Check if tasks are running with `get-app-url.sh`
3. **Health Checks**: Tasks may be restarting due to failed health checks

#### Free Tier Exceeded
1. **Stop Services**: Run `stop-services.sh` immediately
2. **Check Usage**: AWS Console → Billing → Free Tier
3. **Optimize**: Reduce running time or clean up resources

### Useful Debug Commands
```bash
# List running tasks
aws ecs list-tasks --cluster aisearch-free-cluster --region us-east-1

# Describe a specific task
aws ecs describe-tasks --cluster aisearch-free-cluster --tasks TASK_ARN --region us-east-1

# Check CloudWatch logs
aws logs describe-log-streams --log-group-name /ecs/aisearch-backend --region us-east-1
```

## 🔄 Updates & Maintenance

### Updating Your Application
```bash
# 1. Build and push new images
./aws/deploy-free-tier.sh

# 2. Update services (they'll automatically pull new images)
aws ecs update-service --cluster aisearch-free-cluster --service aisearch-frontend --force-new-deployment --region us-east-1
```

### Backup Strategy
- **Code**: Keep in Git repository
- **Images**: Stored in ECR (automatically backed up)
- **Data**: Application is stateless, no data backup needed

## 📈 Scaling Options

### Within Free Tier
- **Vertical**: Can't increase CPU/memory (already optimized)
- **Horizontal**: Can run 1 task per service max (free tier limit)

### Beyond Free Tier
```bash
# Increase task count (will incur charges)
aws ecs update-service --cluster aisearch-free-cluster --service aisearch-frontend --desired-count 2 --region us-east-1

# Increase resources (will incur charges)
# Edit task definitions with higher CPU/memory values
```

## 🎓 Best Practices

### Cost Optimization
1. **Always stop services** when not in use
2. **Monitor free tier usage** monthly
3. **Set billing alerts** at $1-2
4. **Clean up old ECR images** periodically
5. **Use 7-day log retention** (already configured)

### Development Workflow
1. **Start services** only when actively developing
2. **Test in batches** rather than constant running
3. **Use local development** for initial coding
4. **Deploy to AWS** for integration testing

### Security
1. **Never commit AWS credentials** to code
2. **Use IAM roles** instead of access keys
3. **Store secrets** in AWS Secrets Manager
4. **Review security groups** regularly

## 🆘 Emergency Procedures

### Unexpected High Bills
```bash
# IMMEDIATELY stop all services
./aws/stop-services.sh

# Check what's running
aws ecs list-services --cluster aisearch-free-cluster --region us-east-1

# If needed, completely clean up
./aws/cleanup-all.sh
```

### Complete Reset
```bash
# Clean everything
./aws/cleanup-all.sh

# Wait 5 minutes, then redeploy
./aws/deploy-free-tier.sh
```

## 📞 Support

### AWS Free Tier Questions
- AWS Documentation: https://aws.amazon.com/free/
- AWS Support (Basic): Free tier includes basic support

### Application Issues
- Check CloudWatch logs first
- Use the troubleshooting section above
- GitHub Issues: Your repository

---

## 🎉 Success!

Your AiSearch application is now deployed on AWS using free tier resources. Remember:

- **Start**: `./aws/start-services.sh` 
- **Stop**: `./aws/stop-services.sh`
- **URL**: `./aws/get-app-url.sh`
- **Cost**: Monitor via AWS Console

Happy searching! 🔍