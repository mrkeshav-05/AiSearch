# Architecture Overview

## System Architecture

AiSearch is built as a modern, scalable web application with the following architecture:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │   SearxNG   │
│  (Next.js)  │◄──►│ (Node.js)   │◄──►│ (Search)    │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │  AI Models  │
                   │ (Gemini AI) │
                   └─────────────┘
```

## Component Architecture

### Backend Services
- **API Layer**: RESTful endpoints and WebSocket connections
- **AI Agents**: Specialized search and response generation
- **External Services**: SearxNG integration for search
- **WebSocket Handler**: Real-time communication

### Frontend Components
- **Chat Interface**: Real-time messaging
- **Search Results**: Source display and formatting
- **Focus Modes**: Different search type selection
- **Responsive UI**: Mobile-first design

## Data Flow

1. User sends query through frontend
2. WebSocket connection to backend
3. Backend routes to appropriate AI agent
4. Agent queries SearxNG for search results
5. AI model processes results and generates response
6. Response streamed back to frontend in real-time

## Key Design Patterns

- **Event-Driven Architecture**: WebSocket-based real-time updates
- **Agent Pattern**: Specialized AI agents for different search types
- **Streaming Responses**: Real-time AI response generation
- **Layered Architecture**: Clear separation of concerns
- **Dependency Injection**: Configurable AI models and services