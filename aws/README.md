# AWS Deployment Scripts for AiSearch

This directory contains optimized scripts for deploying AiSearch on AWS with cost optimization and free tier focus.

## 📁 Files Overview

### Deployment Scripts
- **`deploy-free-tier.sh`** - Initial setup and image deployment (run once)
- **`start-services.sh`** - Start all application services  
- **`stop-services.sh`** - Stop all services to save costs
- **`get-app-url.sh`** - Get current application URLs and health status
- **`cleanup-all.sh`** - Complete resource cleanup (removes everything)

### Task Definitions (Free Tier Optimized)
- **`ecs-backend-free-task-definition.json`** - Backend service (256 CPU, 512MB)
- **`ecs-frontend-free-task-definition.json`** - Frontend service (256 CPU, 512MB)
- **`ecs-searxng-free-task-definition.json`** - SearXNG service (256 CPU, 512MB)

### Legacy Files
- **`deploy.sh`** - Original deployment script (higher resource usage)
- **`ecs-*-task-definition.json`** - Original task definitions (not free tier optimized)

## 🚀 Quick Start

1. **One-time setup:**
   ```bash
   ./deploy-free-tier.sh
   ```

2. **Register task definitions:**
   ```bash
   aws ecs register-task-definition --cli-input-json file://ecs-backend-free-task-definition.json --region us-east-1
   aws ecs register-task-definition --cli-input-json file://ecs-frontend-free-task-definition.json --region us-east-1
   aws ecs register-task-definition --cli-input-json file://ecs-searxng-free-task-definition.json --region us-east-1
   ```

3. **Start services:**
   ```bash
   ./start-services.sh
   ```

4. **Get application URL:**
   ```bash
   ./get-app-url.sh
   ```

5. **Stop when done:**
   ```bash
   ./stop-services.sh
   ```

## 💰 Cost Optimization

- **Running**: ~$0/month (within free tier limits)
- **Stopped**: ~$0.50/month (ECR storage only)  
- **Deleted**: $0/month

## 📖 Documentation

See `../AWS_FREE_TIER_GUIDE.md` for complete deployment instructions.