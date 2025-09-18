#!/bin/bash

# AiSearch - Stop Services Script
# Use this script to stop your application and save costs when not needed

set -e

# Configuration
AWS_REGION="ap-south-1"
CLUSTER_NAME="aisearch-free-cluster"

echo "🛑 Stopping AiSearch services to save costs..."

# Function to check if service exists and is active
service_exists() {
    aws ecs describe-services --cluster $CLUSTER_NAME --services "$1" --region $AWS_REGION --query 'services[?status==`ACTIVE`]' --output text | grep -q "$1" 2>/dev/null
}

# Function to stop service by setting desired count to 0
stop_service() {
    local service_name=$1
    if service_exists "$service_name"; then
        echo "🔻 Stopping $service_name..."
        aws ecs update-service \
            --cluster $CLUSTER_NAME \
            --service "$service_name" \
            --desired-count 0 \
            --region $AWS_REGION >/dev/null
        echo "✅ $service_name stopped (set to 0 tasks)"
    else
        echo "⚠️  Service $service_name not found or already inactive"
    fi
}

# Stop all services
stop_service "aisearch-frontend"
stop_service "aisearch-backend" 
stop_service "aisearch-searxng"

echo ""
echo "⏳ Waiting for all tasks to stop gracefully..."

# Wait for tasks to stop
for service in aisearch-frontend aisearch-backend aisearch-searxng; do
    if service_exists "$service"; then
        echo "⏳ Waiting for $service tasks to stop..."
        aws ecs wait services-stable --cluster $CLUSTER_NAME --services "$service" --region $AWS_REGION
    fi
done

echo ""
echo "✅ All services stopped successfully!"
echo ""
echo "💰 Cost Impact:"
echo "   - ECS Fargate compute costs: $0 (no running tasks)"
echo "   - Storage costs still apply: ECR images (~$0.10/GB/month)"
echo "   - CloudWatch logs: Only new logs will be charged"
echo ""
echo "🚀 To restart your application, run: ./start-services.sh"
echo ""
echo "🗑️  To completely remove all resources and stop all charges:"
echo "   Run: ./cleanup-all.sh"