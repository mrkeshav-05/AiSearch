#!/bin/bash

# AiSearch - Get Application URL Script
# Gets the public IP addresses of your running services

set -e

# Configuration
AWS_REGION="ap-south-1"
CLUSTER_NAME="aisearch-free-cluster"

echo "🔍 Getting AiSearch application URLs..."

# Function to get public IP of a service
get_service_ip() {
    local service_name=$1
    local port=$2
    
    # Get the task ARN
    task_arn=$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name "$service_name" --region $AWS_REGION --query 'taskArns[0]' --output text)
    
    if [ "$task_arn" != "None" ] && [ "$task_arn" != "" ]; then
        # Get the ENI ID from the task
        eni_id=$(aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks "$task_arn" --region $AWS_REGION --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' --output text)
        
        if [ "$eni_id" != "" ]; then
            # Get the public IP from the ENI
            public_ip=$(aws ec2 describe-network-interfaces --network-interface-ids "$eni_id" --region $AWS_REGION --query 'NetworkInterfaces[0].Association.PublicIp' --output text)
            
            if [ "$public_ip" != "None" ] && [ "$public_ip" != "" ]; then
                echo "http://$public_ip:$port"
            else
                echo "No public IP found for $service_name"
            fi
        else
            echo "No network interface found for $service_name"
        fi
    else
        echo "$service_name is not running"
    fi
}

echo ""
echo "📡 Service URLs:"
echo "----------------------------------------"

frontend_url=$(get_service_ip "aisearch-frontend" "3000")
backend_url=$(get_service_ip "aisearch-backend" "8000")
searxng_url=$(get_service_ip "aisearch-searxng" "8080")

echo "🌐 Frontend:  $frontend_url"
echo "🖥️  Backend:   $backend_url"
echo "🔍 SearXNG:   $searxng_url"

echo ""
echo "🎯 Main Application URL: $frontend_url"
echo ""

# Check if services are healthy
echo "🏥 Health Check:"
echo "----------------------------------------"

# Function to check service health
check_health() {
    local service_name=$1
    local url=$2
    
    running_tasks=$(aws ecs describe-services --cluster $CLUSTER_NAME --services "$service_name" --region $AWS_REGION --query 'services[0].runningCount' --output text 2>/dev/null || echo "0")
    desired_tasks=$(aws ecs describe-services --cluster $CLUSTER_NAME --services "$service_name" --region $AWS_REGION --query 'services[0].desiredCount' --output text 2>/dev/null || echo "0")
    
    if [ "$running_tasks" = "$desired_tasks" ] && [ "$running_tasks" != "0" ]; then
        echo "✅ $service_name: Healthy ($running_tasks/$desired_tasks tasks)"
    elif [ "$desired_tasks" = "0" ]; then
        echo "🛑 $service_name: Stopped (0 tasks desired)"
    else
        echo "⚠️  $service_name: Starting... ($running_tasks/$desired_tasks tasks)"
    fi
}

check_health "aisearch-frontend" "$frontend_url"
check_health "aisearch-backend" "$backend_url"
check_health "aisearch-searxng" "$searxng_url"

echo ""
echo "💡 Tips:"
echo "- If services show 'Starting...', wait 1-2 minutes and run this script again"
echo "- If URLs don't work, check security groups allow inbound traffic on the ports"
echo "- Use ./stop-services.sh to stop services when done to save costs"