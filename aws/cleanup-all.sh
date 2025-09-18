#!/bin/bash

# AiSearch - Complete Cleanup Script
# WARNING: This will delete ALL resources and stop ALL charges
# Use this only when you want to completely remove the application

set -e

# Configuration
AWS_REGION="ap-south-1"
CLUSTER_NAME="aisearch-free-cluster"
YOUR_ACCOUNT_ID="058264529499"

echo "⚠️  WARNING: This will DELETE ALL AiSearch resources from AWS!"
echo "This includes:"
echo "- ECS Services and Cluster"
echo "- ECR Repositories and Images"
echo "- CloudWatch Log Groups"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "🗑️  Starting complete cleanup of AiSearch resources..."

# Step 1: Stop and delete ECS services
echo "🛑 Deleting ECS services..."
for service in aisearch-frontend aisearch-backend aisearch-searxng; do
    if aws ecs describe-services --cluster $CLUSTER_NAME --services "$service" --region $AWS_REGION --query 'services[?status==`ACTIVE`]' --output text | grep -q "$service" 2>/dev/null; then
        echo "🔻 Stopping and deleting $service..."
        
        # Scale down to 0 first
        aws ecs update-service --cluster $CLUSTER_NAME --service "$service" --desired-count 0 --region $AWS_REGION >/dev/null
        
        # Wait for tasks to stop
        aws ecs wait services-stable --cluster $CLUSTER_NAME --services "$service" --region $AWS_REGION
        
        # Delete the service
        aws ecs delete-service --cluster $CLUSTER_NAME --service "$service" --region $AWS_REGION >/dev/null
        echo "✅ $service deleted"
    else
        echo "⚠️  Service $service not found or already deleted"
    fi
done

# Step 2: Delete ECS cluster
echo "🏗️ Deleting ECS cluster..."
if aws ecs describe-clusters --clusters $CLUSTER_NAME --region $AWS_REGION --query 'clusters[?status==`ACTIVE`]' --output text | grep -q "$CLUSTER_NAME" 2>/dev/null; then
    aws ecs delete-cluster --cluster $CLUSTER_NAME --region $AWS_REGION >/dev/null
    echo "✅ ECS cluster deleted"
else
    echo "⚠️  ECS cluster not found or already deleted"
fi

# Step 3: Delete ECR repositories
echo "📦 Deleting ECR repositories..."
for repo in backend frontend searxng; do
    if aws ecr describe-repositories --repository-names "aisearch/$repo" --region $AWS_REGION >/dev/null 2>&1; then
        echo "🗑️  Deleting ECR repository: aisearch/$repo"
        aws ecr delete-repository --repository-name "aisearch/$repo" --force --region $AWS_REGION >/dev/null
        echo "✅ aisearch/$repo repository deleted"
    else
        echo "⚠️  ECR repository aisearch/$repo not found"
    fi
done

# Step 4: Delete CloudWatch log groups
echo "📊 Deleting CloudWatch log groups..."
for service in backend frontend searxng; do
    log_group="/ecs/aisearch-$service"
    if aws logs describe-log-groups --log-group-name-prefix "$log_group" --region $AWS_REGION --query 'logGroups[?logGroupName==`'$log_group'`]' --output text | grep -q "$log_group" 2>/dev/null; then
        aws logs delete-log-group --log-group-name "$log_group" --region $AWS_REGION
        echo "✅ Log group $log_group deleted"
    else
        echo "⚠️  Log group $log_group not found"
    fi
done

# Step 5: Deregister task definitions (optional - they don't cost money but cleanup is cleaner)
echo "📋 Deregistering task definitions..."
for task_def in aisearch-backend-free aisearch-frontend-free aisearch-searxng-free; do
    # Get all revisions of the task definition
    revisions=$(aws ecs list-task-definitions --family-prefix "$task_def" --region $AWS_REGION --query 'taskDefinitionArns' --output text)
    
    if [ "$revisions" != "" ]; then
        for revision in $revisions; do
            aws ecs deregister-task-definition --task-definition "$revision" --region $AWS_REGION >/dev/null
        done
        echo "✅ Task definition family $task_def deregistered"
    fi
done

echo ""
echo "🎉 Complete cleanup finished!"
echo ""
echo "💰 Cost Impact:"
echo "✅ All compute costs stopped (ECS Fargate)"
echo "✅ All storage costs stopped (ECR repositories)"
echo "✅ All logging costs stopped (CloudWatch logs)"
echo ""
echo "📊 Your AWS bill should now show $0 charges for AiSearch resources"
echo ""
echo "🚀 To redeploy later, run: ./deploy-free-tier.sh"