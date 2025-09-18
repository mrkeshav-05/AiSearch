#!/bin/bash

# AiSearch - Free Tier AWS Deployment Script
# Optimized for cost-effectiveness and easy start/stop functionality

set -e

# Configuration
AWS_REGION="ap-south-1"
CLUSTER_NAME="aisearch-free-cluster"
YOUR_ACCOUNT_ID="058264529499"
APP_NAME="aisearch"

# Free tier optimized settings
CPU_UNITS="256"      # 0.25 vCPU (Free tier eligible)
MEMORY_MB="512"      # 512 MB (Free tier eligible)

echo "💰 Starting FREE TIER AWS deployment for AiSearch..."
echo "📊 Using minimal resources: ${CPU_UNITS} CPU units, ${MEMORY_MB}MB memory per service"

# Function to check if resource exists
resource_exists() {
    local resource_type=$1
    local resource_name=$2
    case $resource_type in
        "ecr")
            aws ecr describe-repositories --repository-names "$resource_name" --region $AWS_REGION >/dev/null 2>&1
            ;;
        "cluster")
            aws ecs describe-clusters --clusters "$resource_name" --region $AWS_REGION --query 'clusters[?status==`ACTIVE`]' --output text | grep -q "$resource_name"
            ;;
        "log-group")
            aws logs describe-log-groups --log-group-name-prefix "$resource_name" --region $AWS_REGION --query 'logGroups[?logGroupName==`'$resource_name'`]' --output text | grep -q "$resource_name"
            ;;
    esac
}

# Step 1: Create ECR repositories (Free tier: 500MB per month)
echo "📦 Creating ECR repositories..."
for repo in backend frontend searxng; do
    if ! resource_exists ecr "aisearch/$repo"; then
        aws ecr create-repository --repository-name "aisearch/$repo" --region $AWS_REGION
        echo "✅ Created ECR repository: aisearch/$repo"
    else
        echo "⚠️  ECR repository aisearch/$repo already exists"
    fi
done

# Step 2: Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Step 3: Build and push Docker images with optimization
echo "🔨 Building optimized Docker images..."
docker build -f infrastructure/docker/backend.Dockerfile --target production -t aisearch/backend .
docker build -f infrastructure/docker/frontend.Dockerfile --target production -t aisearch/frontend .  
docker build -f searxng.dockerfile -t aisearch/searxng .

echo "🏷️ Tagging images for ECR..."
docker tag aisearch/backend:latest $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/backend:latest
docker tag aisearch/frontend:latest $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/frontend:latest
docker tag aisearch/searxng:latest $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/searxng:latest

echo "📤 Pushing images to ECR..."
docker push $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/backend:latest
docker push $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/frontend:latest
docker push $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/searxng:latest

# Step 4: Create ECS cluster (Free tier eligible)
echo "🏗️ Creating ECS cluster..."
if ! resource_exists cluster $CLUSTER_NAME; then
    aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION
    echo "✅ Created ECS cluster: $CLUSTER_NAME"
else
    echo "⚠️  ECS cluster $CLUSTER_NAME already exists"
fi

# Step 5: Create CloudWatch log groups (Free tier: 5GB per month)
echo "📊 Creating CloudWatch log groups..."
for service in backend frontend searxng; do
    log_group="/ecs/aisearch-$service"
    if ! resource_exists log-group "$log_group"; then
        aws logs create-log-group --log-group-name "$log_group" --region $AWS_REGION
        # Set retention to 7 days to stay within free tier
        aws logs put-retention-policy --log-group-name "$log_group" --retention-in-days 7 --region $AWS_REGION
        echo "✅ Created log group: $log_group (7 day retention)"
    else
        echo "⚠️  Log group $log_group already exists"
    fi
done

echo ""
echo "✅ FREE TIER infrastructure setup complete!"
echo ""
echo "💡 Next steps for cost optimization:"
echo "1. Run: ./start-services.sh to start your application"
echo "2. Run: ./stop-services.sh to stop services when not needed"
echo "3. Monitor usage in AWS console to stay within free tier limits"
echo ""
echo "📊 Free Tier Limits Reminder:"
echo "- ECS Fargate: 20GB-hours compute per month (always free)"
echo "- ECR: 500MB storage per month (12 months free)"
echo "- CloudWatch Logs: 5GB ingestion per month (always free)"
echo "- ALB: 750 hours per month (12 months free)"
echo ""
echo "💰 Estimated monthly cost: $0-5 if staying within free tier limits"