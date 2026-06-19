#!/bin/bash

# AiSearch - Start Services Script
# Optimized for cost-effectiveness and auto-resolving Fargate dynamic public IPs.

set -e

# Configuration
AWS_REGION=${AWS_REGION:-"ap-south-1"}
CLUSTER_NAME=${CLUSTER_NAME:-"aisearch-cluster"}
YOUR_ACCOUNT_ID=${YOUR_ACCOUNT_ID:-"058264529499"}

echo "🚀 Starting AiSearch application services..."
echo "📍 AWS Region: $AWS_REGION"
echo "🏗️  Cluster: $CLUSTER_NAME"
echo "👤 Account ID: $YOUR_ACCOUNT_ID"

# Step 1: Discover default VPC and Subnets
echo "🔍 Querying AWS networking resources..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --region $AWS_REGION --query "Vpcs[0].VpcId" --output text)
if [ "$VPC_ID" = "None" ] || [ -z "$VPC_ID" ]; then
    echo "❌ Error: Default VPC not found. Please ensure you have a default VPC in $AWS_REGION."
    exit 1
fi
echo "ℹ️  Found default VPC: $VPC_ID"

SUBNET_LIST=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --region $AWS_REGION --query "Subnets[*].SubnetId" --output text)
SUBNETS=$(echo $SUBNET_LIST | tr ' ' ',')
if [ -z "$SUBNETS" ]; then
    echo "❌ Error: No subnets found in default VPC."
    exit 1
fi
echo "ℹ️  Using default subnets: $SUBNETS"

SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" "Name=group-name,Values=default" --region $AWS_REGION --query "SecurityGroups[0].GroupId" --output text)
if [ "$SG_ID" = "None" ] || [ -z "$SG_ID" ]; then
    # Fallback to create a group or find any active security group
    SG_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=$VPC_ID" --region $AWS_REGION --query "SecurityGroups[0].GroupId" --output text)
fi
echo "ℹ️  Using security group: $SG_ID"

# Helper function to check if ECS service exists
service_exists() {
    aws ecs describe-services --cluster $CLUSTER_NAME --services "$1" --region $AWS_REGION --query 'services[?status==`ACTIVE`]' --output text | grep -q "$1" 2>/dev/null
}

# Helper function to register task definition with variable replacements
register_task_def() {
    local family=$1
    local file=$2
    
    echo "📋 Registering task definition for $family..."
    sed -e "s/<YOUR_ACCOUNT_ID>/$YOUR_ACCOUNT_ID/g" \
        -e "s/<AWS_REGION>/$AWS_REGION/g" \
        "$file" > "${file}.tmp"
        
    aws ecs register-task-definition --cli-input-json "file://${file}.tmp" --region $AWS_REGION >/dev/null
    rm -f "${file}.tmp"
    echo "✅ Registered task definition: $family"
}

# Helper function to start/create service
start_service() {
    local service_name=$1
    local task_def=$2
    
    if service_exists "$service_name"; then
        echo "🔄 Updating existing service $service_name..."
        aws ecs update-service \
            --cluster $CLUSTER_NAME \
            --service "$service_name" \
            --task-definition "$task_def" \
            --desired-count 1 \
            --region $AWS_REGION >/dev/null
        echo "✅ Service $service_name updated & scaled to 1 task"
    else
        echo "🏗️ Creating service $service_name..."
        aws ecs create-service \
            --cluster $CLUSTER_NAME \
            --service-name "$service_name" \
            --task-definition "$task_def" \
            --desired-count 1 \
            --launch-type FARGATE \
            --network-configuration "awsvpcConfiguration={subnets=[$SUBNETS],securityGroups=[$SG_ID],assignPublicIp=ENABLED}" \
            --region $AWS_REGION >/dev/null
        echo "✅ Service $service_name created successfully"
    fi
}

# Step 2: Register task definitions for SearXNG and Backend
register_task_def "aisearch-searxng-free" "ecs-searxng-free-task-definition.json"
register_task_def "aisearch-backend-free" "ecs-backend-free-task-definition.json"

# Step 3: Start SearXNG and Backend
start_service "aisearch-searxng" "aisearch-searxng-free"
start_service "aisearch-backend" "aisearch-backend-free"

# Step 4: Resolve Backend Public IP to inject into Frontend task definition
echo "⏳ Waiting for backend task to initialize and obtain a public IP..."
BACKEND_IP=""
for i in {1..30}; do
    task_arn=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name "aisearch-backend" --region $AWS_REGION --query 'taskArns[0]' --output text 2>/dev/null || echo "")
    if [ "$task_arn" != "None" ] && [ -n "$task_arn" ]; then
        eni_id=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks "$task_arn" --region $AWS_REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text 2>/dev/null || echo "")
        if [ -n "$eni_id" ] && [ "$eni_id" != "None" ]; then
            BACKEND_IP=$(aws ec2 describe-network-interfaces --network-interface-ids "$eni_id" --region $AWS_REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text 2>/dev/null || echo "")
            if [ -n "$BACKEND_IP" ] && [ "$BACKEND_IP" != "None" ]; then
                echo ""
                echo "✅ Backend public IP detected: $BACKEND_IP"
                break
            fi
        fi
    fi
    echo -n "."
    sleep 4
done

if [ -z "$BACKEND_IP" ] || [ "$BACKEND_IP" = "None" ]; then
    echo ""
    echo "⚠️  Warning: Failed to auto-detect Backend public IP. Defaulting to localhost..."
    BACKEND_IP="localhost"
fi

# Step 5: Update & register Frontend task definition with the resolved backend IP
echo "📋 Injecting backend IP into Frontend task definition..."
sed -e "s/<YOUR_ACCOUNT_ID>/$YOUR_ACCOUNT_ID/g" \
    -e "s/<AWS_REGION>/$AWS_REGION/g" \
    -e "s/<BACKEND_PUBLIC_IP>/$BACKEND_IP/g" \
    "ecs-frontend-free-task-definition.json" > "ecs-frontend-free-task-definition.json.tmp"

aws ecs register-task-definition --cli-input-json "file://ecs-frontend-free-task-definition.json.tmp" --region $AWS_REGION >/dev/null
rm -f "ecs-frontend-free-task-definition.json.tmp"
echo "✅ Registered task definition: aisearch-frontend-free"

# Step 6: Start Frontend service
start_service "aisearch-frontend" "aisearch-frontend-free"

echo ""
echo "🎉 Services are starting up successfully!"
echo "💡 Wait a minute and then run: ./get-app-url.sh to check the status and get access URLs."
