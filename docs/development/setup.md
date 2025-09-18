# Development Setup

## Prerequisites
- Node.js 18+
- pnpm 8+
- Docker & Docker Compose

## Installation

1. Clone the repository:
```bash
git clone https://github.com/mrkeshav-05/AiSearch.git
cd AiSearch
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

4. Configure your API keys in `backend/.env`:
```env
GOOGLE_API_KEY=your_gemini_api_key
SEARXNG_API_URL=http://localhost:8080
```

## Development

### Start all services with Docker:
```bash
docker-compose up --build
```

### Or start individually:

#### Backend:
```bash
pnpm run dev:backend
```

#### Frontend:
```bash
pnpm run dev:frontend
```

#### SearxNG (Search Engine):
```bash
docker run -p 8080:8080 searxng/searxng
```

## Architecture

The project follows a monorepo structure with:

- `backend/`: Node.js/Express API server
- `frontend/`: Next.js React application
- `shared/`: Common types and utilities
- `docs/`: Documentation
- `infrastructure/`: Docker and deployment configs

## Testing

```bash
# Run all tests
pnpm test

# Backend tests
pnpm run test:backend

# Frontend tests
pnpm run test:frontend
```