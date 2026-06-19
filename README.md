# 🧠 AiSearch

**AI-Powered Search Engine with Real-Time Conversations**

AiSearch is a modern, intelligent search platform that combines the power of traditional search engines with advanced AI capabilities. Get instant, contextual answers with real-time streaming responses and comprehensive source citations.

![AiSearch Architecture](https://img.shields.io/badge/Architecture-Monorepo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-MIT-green)


## Images & Sceenshots

### Search With Ai Features
<img width="1440" height="900" alt="Screenshot 2026-06-20 at 2 44 21 AM" src="https://github.com/user-attachments/assets/0abc0cbe-1715-4cfd-9c9d-36ad1a57132d" />
<img width="1440" height="900" alt="Screenshot 2026-06-20 at 2 44 42 AM" src="https://github.com/user-attachments/assets/b71a7211-da3f-4a40-906b-1f116ba1b8c1" />
<img width="1440" height="900" alt="Screenshot 2026-06-20 at 2 45 01 AM" src="https://github.com/user-attachments/assets/6835b5d9-c973-46ef-8b83-dbb38978ff69" />

### Search With Searxng
<img width="1440" height="900" alt="Screenshot 2026-06-20 at 2 46 06 AM" src="https://github.com/user-attachments/assets/e792a38b-88a0-4770-89df-37825618603a" />
<img width="1440" height="900" alt="Screenshot 2026-06-20 at 2 46 06 AM" src="https://github.com/user-attachments/assets/54b84852-d8a0-437d-8ea8-d87d3eb2eb56" />
<img width="1440" height="900" alt="Screenshot 2026-06-20 at 2 46 27 AM" src="https://github.com/user-attachments/assets/bd185542-fa64-4321-a1a2-df6f9d89983a" />

### Chat With PDF
<img width="1440" height="900" alt="Screenshot 2026-06-20 at 2 48 15 AM" src="https://github.com/user-attachments/assets/dc60bcae-ff7a-45df-883f-b74344b312f8" />
<img width="1440" height="900" alt="Screenshot 2026-06-20 at 2 48 40 AM" src="https://github.com/user-attachments/assets/015fba33-7a70-4993-b43d-ecad0b611942" />

## ✨ Features

- 🔍 **Intelligent Search**: AI-powered search with contextual understanding
- 💬 **Real-Time Chat**: WebSocket-based streaming responses
- 📚 **Source Citations**: Comprehensive source tracking and display
- 🎯 **Focus Modes**: Specialized search for web, academic, images, videos, and more
- 🌐 **Privacy-First**: Built on SearXNG for anonymous search
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile
- 🐳 **Production Ready**: Full Docker containerization and deployment

## 🚀 Quick Start

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/mrkeshav-05/AiSearch.git
cd AiSearch

# Start in development mode
./scripts/start.sh

# Or start in production mode
./scripts/start.sh --prod

# Or start with Docker
./scripts/start.sh --docker
```

### Manual Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Build shared package
pnpm run build:shared

# Start development servers
pnpm run dev
```

## 🏗️ Architecture

AiSearch follows a **monorepo architecture** with clear separation of concerns:

```
├── backend/           # Node.js/Express API server
│   ├── src/
│   │   ├── api/v1/    # RESTful API endpoints
│   │   ├── services/  # Business logic layer
│   │   │   ├── ai/    # AI agents and models
│   │   │   └── external/ # External service integrations
│   │   ├── config/    # Configuration management
│   │   └── types/     # Backend-specific types
│   └── tests/         # Backend tests
├── frontend/          # Next.js React application
│   ├── src/
│   │   ├── app/       # Next.js 13+ app directory
│   │   ├── components/ # React components
│   │   ├── hooks/     # Custom React hooks
│   │   └── types/     # Frontend-specific types
│   └── tests/         # Frontend tests
├── shared/            # Common types and utilities
│   └── src/
│       ├── types/     # Shared TypeScript types
│       └── constants/ # Application constants
├── scripts/           # Automation scripts
│   ├── build.sh      # Build automation
│   ├── start.sh      # Start automation (multi-mode)
│   └── stop.sh       # Clean shutdown
├── infrastructure/    # Docker and deployment
└── docs/             # Comprehensive documentation
```

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with layered architecture
- **AI Integration**: Google Gemini AI, OpenAI GPT
- **Search Engine**: SearXNG integration
- **Real-Time**: WebSocket connections
- **Testing**: Jest with comprehensive test coverage

### Frontend
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS with responsive design
- **Components**: Custom UI components with shadcn/ui
- **State Management**: React hooks and context
- **Build Tool**: Turbopack for fast development

### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose
- **Package Management**: pnpm workspaces
- **Development**: Hot reload and instant feedback

## 📊 System Components

### AI Agents
- **Web Search Agent**: General web search with AI summaries
- **Academic Search Agent**: Scholarly article search and analysis
- **Image Search Agent**: Visual content discovery
- **Video Search Agent**: Multimedia content search
- **Writing Assistant**: Content generation and editing

### External Services
- **SearXNG**: Privacy-focused meta-search engine
- **Google Gemini**: Advanced AI language model
- **OpenAI GPT**: Alternative AI model support

## 🔧 Configuration

### Environment Variables

**Backend Configuration** (`backend/.env`):
```env
# AI API Keys
GOOGLE_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# External Services
SEARXNG_API_URL=http://localhost:4000

# Server Configuration
PORT=8000
NODE_ENV=development

# CORS and Security
CORS_ORIGIN=http://localhost:3000
```

**Frontend Configuration** (`frontend/.env.local`):
```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Build Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🚀 Deployment

### Docker Deployment (Recommended)

```bash
# Production deployment
./scripts/start.sh --docker

# Or manually with Docker Compose
docker compose -f docker-compose.prod.yml up --build
```

### Manual Production Deployment

```bash
# Build for production
./scripts/build.sh

# Start production servers
./scripts/start.sh --prod
```

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Backend tests only
pnpm run test:backend

# Frontend tests only
pnpm run test:frontend

# Test coverage
pnpm run test:coverage
```


## 📖 Documentation

- [**Development Setup**](docs/development/setup.md) - Detailed setup instructions
- [**Architecture Guide**](docs/development/architecture.md) - System architecture deep dive
- [**API Documentation**](docs/api/endpoints.md) - RESTful API reference
- [**Docker Guide**](docs/deployment/docker.md) - Container deployment

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📋 Available Scripts

### Automation Scripts
- `./scripts/start.sh` - Start application (development mode)
- `./scripts/start.sh --prod` - Start in production mode
- `./scripts/start.sh --docker` - Start with Docker containers
- `./scripts/stop.sh` - Clean shutdown of all services
- `./scripts/build.sh` - Build entire application

### Package Scripts
- `pnpm dev` - Start development servers
- `pnpm build` - Build for production
- `pnpm test` - Run test suites
- `pnpm lint` - Lint all packages
- `pnpm clean` - Clean build artifacts

## 🌐 URLs

When running locally:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **SearXNG**: http://localhost:4000
- **Health Check**: http://localhost:8000/api/v1/health

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [SearXNG](https://github.com/searxng/searxng) for privacy-focused search
- [Google Gemini](https://ai.google.dev/) for AI capabilities
- [Next.js](https://nextjs.org/) for the amazing React framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling

---

**Built with ❤️ for the future of search**
