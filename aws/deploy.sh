#!/bin/bash

# AWS Deployment Script for AiSearch
# Make sure to replace <YOUR_ACCOUNT_ID> with your actual AWS account ID

set -e

# Configuration
AWS_REGION="us-east-1"
CLUSTER_NAME="aisearch-cluster"
YOUR_ACCOUNT_ID="058264529499"  # REPLACE THIS
DOMAIN_NAME="aisearch.com"  # REPLACE THIS

echo "🚀 Starting AWS deployment for AiSearch..."

# Step 1: Create ECR repositories
echo "📦 Creating ECR repositories..."
aws ecr create-repository --repository-name aisearch/backend --region $AWS_REGION || true
aws ecr create-repository --repository-name aisearch/frontend --region $AWS_REGION || true
aws ecr create-repository --repository-name aisearch/searxng --region $AWS_REGION || true

# Step 2: Login to ECR
echo "🔐 Logging into ECR..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Step 3: Build and push Docker images
echo "🔨 Building Docker images..."
docker build -f infrastructure/docker/backend.Dockerfile -t aisearch/backend .
docker build -f infrastructure/docker/frontend.Dockerfile -t aisearch/frontend .  
docker build -f searxng.dockerfile -t aisearch/searxng .

echo "🏷️ Tagging images for ECR..."
docker tag aisearch/backend:latest $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/backend:latest
docker tag aisearch/frontend:latest $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/frontend:latest
docker tag aisearch/searxng:latest $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/searxng:latest

echo "📤 Pushing images to ECR..."
docker push $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/backend:latest
docker push $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/frontend:latest
docker push $YOUR_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/aisearch/searxng:latest

# Step 4: Create ECS cluster
echo "🏗️ Creating ECS cluster..."
aws ecs create-cluster --cluster-name $CLUSTER_NAME --region $AWS_REGION || true

# Step 5: Create CloudWatch log groups
echo "📊 Creating CloudWatch log groups..."
aws logs create-log-group --log-group-name /ecs/aisearch-backend --region $AWS_REGION || true
aws logs create-log-group --log-group-name /ecs/aisearch-frontend --region $AWS_REGION || true
aws logs create-log-group --log-group-name /ecs/aisearch-searxng --region $AWS_REGION || true

# Step 6: Register task definitions (you'll need to update the JSON files with your account ID first)
echo "📋 Registering ECS task definitions..."
echo "⚠️  Please update the task definition files with your account ID before running:"
echo "   - aws/ecs-backend-task-definition.json"
echo "   - aws/ecs-frontend-task-definition.json" 
echo "   - aws/ecs-searxng-task-definition.json"
echo ""
echo "Then run:"
echo "aws ecs register-task-definition --cli-input-json file://aws/ecs-backend-task-definition.json --region $AWS_REGION"
echo "aws ecs register-task-definition --cli-input-json file://aws/ecs-frontend-task-definition.json --region $AWS_REGION"
echo "aws ecs register-task-definition --cli-input-json file://aws/ecs-searxng-task-definition.json --region $AWS_REGION"

echo "✅ Base infrastructure setup complete!"
echo "🔧 Next steps:"
echo "1. Update task definition files with your AWS account ID"
echo "2. Create VPC and subnets (see manual steps in README)"
echo "3. Set up Application Load Balancer"
echo "4. Create ECS services"
echo "5. Configure domain and SSL certificate"