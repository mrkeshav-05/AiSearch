# Docker Deployment

## Development with Docker Compose

```bash
# Start all services
docker-compose up --build

# Start in background
docker-compose up -d --build

# Stop services
docker-compose down
```

## Production Deployment

### Build Images
```bash
# Backend
docker build -f infrastructure/docker/backend.Dockerfile -t aisearch-backend .

# Frontend  
docker build -f infrastructure/docker/frontend.Dockerfile -t aisearch-frontend .
```

### Run Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### Backend (.env)
```env
NODE_ENV=production
BACKEND_PORT=8000
GOOGLE_API_KEY=your_key
SEARXNG_API_URL=http://searxng:8080
```

### Frontend (.env)
```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Health Checks

All services include health check endpoints:
- Backend: `http://localhost:8000/health`
- Frontend: `http://localhost:3000/api/health`
- SearxNG: `http://localhost:8080/stats`