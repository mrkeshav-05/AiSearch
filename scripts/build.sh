#!/bin/bash

echo "🏗️  Building AiSearch application..."

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Build shared package first
echo "🔧 Building shared package..."
cd shared
pnpm run build
cd ..

# Build backend
echo "🚀 Building backend..."
cd backend
pnpm run build
cd ..

# Build frontend
echo "🎨 Building frontend..."
cd frontend
pnpm run build
cd ..

echo "✅ Build completed successfully!"