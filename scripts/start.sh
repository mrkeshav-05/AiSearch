#!/bin/bash

echo "🚀 Starting AiSearch application..."

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill processes on specific ports
cleanup_ports() {
    echo "🧹 Cleaning up any existing processes..."
    
    # Kill processes on common ports
    if port_in_use 3000; then
        echo "   Stopping process on port 3000 (frontend)..."
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
    fi
    
    if port_in_use 8000; then
        echo "   Stopping process on port 8000 (backend)..."
        lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    fi
    
    if port_in_use 4000; then
        echo "   Stopping process on port 4000 (searxng)..."
        lsof -ti :4000 | xargs kill -9 2>/dev/null || true
    fi
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists pnpm; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

if ! command_exists docker; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Parse command line arguments
MODE="development"
BUILD_FIRST=false
USE_DOCKER=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --prod|--production)
            MODE="production"
            shift
            ;;
        --build)
            BUILD_FIRST=true
            shift
            ;;
        --docker)
            USE_DOCKER=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --prod, --production    Run in production mode"
            echo "  --build                 Build before starting"
            echo "  --docker                Use Docker containers"
            echo "  --help, -h              Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                      Start in development mode"
            echo "  $0 --build              Build and start in development mode"
            echo "  $0 --prod               Start in production mode"
            echo "  $0 --docker             Start using Docker containers"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "📋 Starting AiSearch in $MODE mode..."

# Clean up existing processes
cleanup_ports

# Build if requested
if [ "$BUILD_FIRST" = true ]; then
    echo "🏗️  Building application first..."
    bash scripts/build.sh
    if [ $? -ne 0 ]; then
        echo "❌ Build failed. Aborting startup."
        exit 1
    fi
fi

# Start based on mode
if [ "$USE_DOCKER" = true ]; then
    echo "🐳 Starting with Docker containers..."
    
    # Start with Docker Compose
    if [ "$MODE" = "production" ]; then
        docker compose -f docker-compose.prod.yml up --build
    else
        docker compose up --build
    fi
    
elif [ "$MODE" = "production" ]; then
    echo "🏭 Starting in production mode..."
    
    # Make sure everything is built
    if [ ! -d "backend/dist" ] || [ ! -d "frontend/.next" ]; then
        echo "📦 Production assets not found. Building first..."
        bash scripts/build.sh
    fi
    
    # Set production environment
    export NODE_ENV=production
    
    # Start SearXNG in background (if not using Docker)
    if ! port_in_use 4000; then
        echo "🔍 Starting SearXNG..."
        docker run -d --name searxng -p 4000:8080 \
            -v "$(pwd)/settings.yml:/etc/searxng/settings.yml" \
            -v "$(pwd)/limiter.toml:/etc/searxng/limiter.toml" \
            searxng/searxng >/dev/null 2>&1 || echo "   SearXNG already running or failed to start"
    fi
    
    # Start backend in background
    echo "🚀 Starting backend..."
    cd backend && pnpm start &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend
    echo "🎨 Starting frontend..."
    cd frontend && pnpm start &
    FRONTEND_PID=$!
    cd ..
    
    # Wait for both processes
    wait $BACKEND_PID $FRONTEND_PID
    
else
    echo "💻 Starting in development mode..."
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ] || [ ! -d "backend/node_modules" ] || [ ! -d "frontend/node_modules" ]; then
        echo "📦 Installing dependencies..."
        pnpm install
    fi
    
    # Start development servers
    echo "🔥 Starting development servers..."
    pnpm run dev
fi

echo ""
echo "✅ AiSearch is running!"
echo ""
echo "🌐 Access URLs:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:8000"
echo "   Health:    http://localhost:8000/health"
if [ "$USE_DOCKER" = true ] || [ "$MODE" = "production" ]; then
echo "   SearXNG:   http://localhost:4000"
fi
echo ""
echo "🛑 To stop the application, press Ctrl+C"