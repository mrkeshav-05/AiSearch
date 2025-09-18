#!/bin/bash

echo "🛑 Stopping AiSearch application..."

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to stop processes on specific ports
stop_port() {
    local port=$1
    local service_name=$2
    
    if port_in_use $port; then
        echo "   Stopping $service_name (port $port)..."
        lsof -ti :$port | xargs kill -9 2>/dev/null || true
        sleep 1
        
        if port_in_use $port; then
            echo "   ⚠️  Some processes on port $port may still be running"
        else
            echo "   ✅ $service_name stopped successfully"
        fi
    else
        echo "   ℹ️  No $service_name process found on port $port"
    fi
}

# Stop development servers
stop_port 3000 "Frontend"
stop_port 8000 "Backend" 
stop_port 4000 "SearXNG"

# Stop Docker containers if running
echo "🐳 Stopping Docker containers..."
docker compose down 2>/dev/null || echo "   No Docker Compose services running"
docker compose -f docker-compose.prod.yml down 2>/dev/null || echo "   No production Docker services running"

# Stop any standalone SearXNG container
if docker ps | grep -q searxng; then
    echo "   Stopping standalone SearXNG container..."
    docker stop searxng 2>/dev/null || true
    docker rm searxng 2>/dev/null || true
fi

# Kill any remaining pnpm processes
echo "🧹 Cleaning up remaining processes..."
pkill -f "pnpm.*dev" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true

echo ""
echo "✅ AiSearch application stopped successfully!"
echo ""
echo "💡 To start again, run: ./scripts/start.sh"