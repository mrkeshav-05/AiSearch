#!/bin/bash

# AiSearch - Start Services Script
# Use this script to start your application when needed

set -e

# Configuration
AWS_REGION="ap-south-1"
CLUSTER_NAME="aisearch-free-cluster"
YOUR_ACCOUNT_ID="058264529499"

echo "🚀 Starting AiSearch services..."

# Function to check if service exists
service_exists() {
    aws ecs describe-services --cluster $CLUSTER_NAME --services "$1" --region $AWS_REGION --query 'services[?status==`ACTIVE`]' --output text | grep -q "$1" 2>/dev/null
}

# Function to get subnet IDs (assumes default VPC)
get_default_subnets() {
    aws ec2 describe-subnets --filters "Name=default-for-az,Values=true" --query 'Subnets[].SubnetId' --output text --region $AWS_REGION | tr '\t' ','
}

# Function to get default security group
get_default_security_group() {
    aws ec2 describe-security-groups --filters "Name=group-name,Values=default" --query 'SecurityGroups[0].GroupId' --output text --region $AWS_REGION
}

# Get network configuration
SUBNETS=$(get_default_subnets)
SECURITY_GROUP=$(get_default_security_group)

echo "📡 Using network configuration:"
echo "   Subnets: $SUBNETS"
echo "   Security Group: $SECURITY_GROUP"

# Start SearXNG service first (internal dependency)
echo "🔍 Starting SearXNG service..."
if ! service_exists "aisearch-searxng"; then
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name aisearch-searxng \
        --task-definition aisearch-searxng-free \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
        --region $AWS_REGION
    echo "✅ SearXNG service created"
else
    # Update existing service to desired count 1
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service aisearch-searxng \
        --desired-count 1 \
        --region $AWS_REGION >/dev/null
    echo "✅ SearXNG service started (updated to 1 task)"
fi

# Wait a moment for SearXNG to start
echo "⏳ Waiting 30 seconds for SearXNG to initialize..."
sleep 30

# Start Backend service
echo "🖥️ Starting Backend service..."
if ! service_exists "aisearch-backend"; then
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name aisearch-backend \
        --task-definition aisearch-backend-free \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
        --region $AWS_REGION
    echo "✅ Backend service created"
else
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service aisearch-backend \
        --desired-count 1 \
        --region $AWS_REGION >/dev/null
    echo "✅ Backend service started (updated to 1 task)"
fi

# Start Frontend service
echo "🌐 Starting Frontend service..."
if ! service_exists "aisearch-frontend"; then
    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name aisearch-frontend \
        --task-definition aisearch-frontend-free \
        --desired-count 1 \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SECURITY_GROUP],assignPublicIp=ENABLED}" \
        --region $AWS_REGION
    echo "✅ Frontend service created"
else
    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service aisearch-frontend \
        --desired-count 1 \
        --region $AWS_REGION >/dev/null
    echo "✅ Frontend service started (updated to 1 task)"
fi

echo ""
echo "🎉 All services are starting up!"
echo "⏳ Please wait 2-3 minutes for all services to be fully operational"
echo ""
echo "📊 Check service status:"
echo "aws ecs describe-services --cluster $CLUSTER_NAME --services aisearch-frontend aisearch-backend aisearch-searxng --region $AWS_REGION"
echo ""
echo "🌐 Once running, get your application URL:"
echo "./get-app-url.sh"
echo ""
echo "💰 Remember: Run ./stop-services.sh when done to avoid unnecessary charges!"