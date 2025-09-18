# Development Setup

Complete guide for setting up the AiSearch development environment.

## Prerequisites

### Required Software
- **Node.js** 18+ (LTS recommended)
- **pnpm** 8+ (package manager)
- **Docker** & **Docker Compose** (for containerized development)
- **Git** (version control)

### Verify Prerequisites
```bash
node --version    # Should be 18+
pnpm --version    # Should be 8+
docker --version  # Should be recent version
docker compose version
```

## Quick Start (Recommended)

### 🚀 One-Command Setup

The fastest way to get started:

```bash
# Clone and enter the repository
git clone https://github.com/mrkeshav-05/AiSearch.git
cd AiSearch

# Start development environment (auto-installs dependencies)
./scripts/start.sh
```

This will:
- ✅ Check all prerequisites
- ✅ Install dependencies
- ✅ Set up environment files
- ✅ Start all services (Frontend, Backend, SearXNG)
- ✅ Open development URLs

## Manual Setup

If you prefer manual control:

### 1. Clone Repository
```bash
git clone https://github.com/mrkeshav-05/AiSearch.git
cd AiSearch
```

### 2. Install Dependencies
```bash
# Install all workspace dependencies
pnpm install

# Build shared package (required first)
pnpm run build:shared
```

### 3. Environment Configuration

#### Backend Environment (`backend/.env`)
```bash
cp backend/.env.example backend/.env
```

Configure your API keys:
```env
# AI API Keys (at least one required)
GOOGLE_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# External Services
SEARXNG_API_URL=http://localhost:4000

# Server Configuration
PORT=8000
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

#### Frontend Environment (`frontend/.env.local`)
```bash
cp frontend/.env.example frontend/.env.local
```

Configure frontend settings:
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Development Modes

### 🎯 Automation Scripts

#### Development Mode (Default)
```bash
./scripts/start.sh
```
- Hot reload enabled
- Debug logging
- Development builds
- Port 3000 (Frontend), 8000 (Backend), 4000 (SearXNG)

#### Production Mode
```bash
./scripts/start.sh --prod
```
- Optimized builds
- Production logging
- Performance optimizations

#### Docker Mode
```bash
./scripts/start.sh --docker
```
- Full containerization
- Production-like environment
- Isolated services

#### Stop All Services
```bash
./scripts/stop.sh
```
- Graceful shutdown
- Port cleanup
- Process termination

### 🔧 Manual Development

#### Start All Services
```bash
pnpm run dev
```

#### Start Individual Services

**Backend Only:**
```bash
pnpm run dev:backend
# Available at: http://localhost:8000
```

**Frontend Only:**
```bash
pnpm run dev:frontend
# Available at: http://localhost:3000
```

**SearXNG (Search Engine):**
```bash
docker run -d \
  --name searxng \
  -p 4000:8080 \
  searxng/searxng:latest
# Available at: http://localhost:4000
```

## Monorepo Architecture

```
AiSearch/
├── backend/              # Node.js/Express API Server
│   ├── src/
│   │   ├── api/v1/      # RESTful API endpoints
│   │   ├── services/    # Business logic layer
│   │   │   ├── ai/      # AI agents and models
│   │   │   ├── external/ # External integrations
│   │   │   └── websocket/ # WebSocket handlers
│   │   ├── config/      # Configuration management
│   │   ├── types/       # Backend TypeScript types
│   │   └── utils/       # Utility functions
│   └── tests/           # Backend test suites
├── frontend/            # Next.js React Application
│   ├── src/
│   │   ├── app/         # Next.js 13+ App Router
│   │   ├── components/  # React components
│   │   │   ├── chat/    # Chat interface
│   │   │   ├── search/  # Search components
│   │   │   └── ui/      # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Frontend utilities
│   │   └── types/       # Frontend TypeScript types
│   └── tests/           # Frontend test suites
├── shared/              # Shared Code
│   └── src/
│       ├── types/       # Common TypeScript types
│       └── constants/   # Application constants
├── scripts/             # Automation Scripts
│   ├── build.sh        # Build automation
│   ├── start.sh        # Multi-mode startup
│   └── stop.sh         # Clean shutdown
├── infrastructure/      # Docker & Deployment
│   └── docker/         # Dockerfiles
└── docs/               # Documentation
```

## Development Workflow

### 1. Make Changes
- Edit files in `backend/`, `frontend/`, or `shared/`
- TypeScript compilation happens automatically
- Hot reload updates browser instantly

### 2. Test Changes
```bash
# Run all tests
pnpm test

# Backend tests only
pnpm run test:backend

# Frontend tests only  
pnpm run test:frontend

# Test with coverage
pnpm run test:coverage
```

### 3. Build for Production
```bash
# Build everything
./scripts/build.sh

# Or build individually
pnpm run build:shared   # Must be first
pnpm run build:backend
pnpm run build:frontend
```

## Package Management

### Adding Dependencies

**Workspace Root:**
```bash
pnpm add <package> -w
```

**Specific Package:**
```bash
pnpm add <package> --filter backend
pnpm add <package> --filter frontend
pnpm add <package> --filter shared
```

**Development Dependencies:**
```bash
pnpm add -D <package> --filter <workspace>
```

### Workspace Commands
```bash
# Install all dependencies
pnpm install

# Clean all node_modules
pnpm clean

# Lint all packages
pnpm lint

# Format all code
pnpm format
```

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
./scripts/stop.sh  # Clean shutdown
./scripts/start.sh # Restart
```

**Dependencies Out of Sync:**
```bash
pnpm clean
pnpm install
pnpm run build:shared
```

**Docker Issues:**
```bash
docker system prune -f
./scripts/start.sh --docker
```

**TypeScript Errors:**
```bash
# Rebuild shared package
pnpm run build:shared

# Clear TypeScript cache
rm -rf backend/dist frontend/.next
```

### Development Tips

1. **Always build shared package first** when making changes to shared types
2. **Use the automation scripts** for consistent environment setup
3. **Check logs** in individual terminals for debugging
4. **Use Docker mode** to test production-like behavior
5. **Run tests** before committing changes

## IDE Setup

### VS Code (Recommended)

Install these extensions:
- TypeScript and JavaScript Language Features
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Docker

### Settings
Add to `.vscode/settings.json`:
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "eslint.workingDirectories": ["backend", "frontend"],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

## Next Steps

- [Architecture Guide](architecture.md) - Deep dive into system design
- [API Documentation](../api/endpoints.md) - Backend API reference
- [Docker Guide](../deployment/docker.md) - Container deployment
- [Contributing Guide](../../CONTRIBUTING.md) - How to contribute