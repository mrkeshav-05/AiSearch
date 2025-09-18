# Architecture Overview

AiSearch follows a **modern monorepo architecture** designed for scalability, maintainability, and developer productivity.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AiSearch Monorepo                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Frontend  │    │   Backend   │    │   Shared    │     │
│  │  (Next.js)  │◄──►│ (Node.js)   │◄──►│  (Types)    │     │
│  │             │    │             │    │             │     │
│  │ Port: 3000  │    │ Port: 8000  │    │             │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│         │                    │                              │
│         │                    ▼                              │
│         │            ┌─────────────┐                        │
│         │            │  AI Models  │                        │
│         │            │ (Gemini AI) │                        │
│         │            └─────────────┘                        │
│         │                    │                              │
│         │                    ▼                              │
│         │            ┌─────────────┐                        │
│         └───────────►│   SearxNG   │                        │
│                      │  (Search)   │                        │
│                      │ Port: 4000  │                        │
│                      └─────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

## Monorepo Structure

### Package Organization

```
├── backend/              # API Server Package
│   ├── src/
│   │   ├── api/v1/      # RESTful API Layer
│   │   │   ├── controllers/  # Request handlers
│   │   │   ├── middleware/   # Express middleware
│   │   │   └── routes/       # Route definitions
│   │   ├── services/    # Business Logic Layer
│   │   │   ├── ai/          # AI Integration
│   │   │   │   ├── agents/  # Specialized AI agents
│   │   │   │   └── models/  # AI model abstractions
│   │   │   ├── external/    # External APIs
│   │   │   │   └── core/    # SearxNG integration
│   │   │   └── websocket/   # Real-time communication
│   │   ├── config/      # Configuration Management
│   │   ├── types/       # Backend-specific types
│   │   └── utils/       # Utility functions
│   └── tests/           # Backend test suites
├── frontend/            # Client Application Package
│   ├── src/
│   │   ├── app/         # Next.js App Router
│   │   ├── components/  # React Components
│   │   │   ├── chat/    # Chat interface
│   │   │   ├── search/  # Search components
│   │   │   ├── layout/  # Layout components
│   │   │   └── ui/      # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Frontend utilities
│   │   └── types/       # Frontend-specific types
│   └── tests/           # Frontend test suites
├── shared/              # Shared Code Package
│   └── src/
│       ├── types/       # Common TypeScript interfaces
│       └── constants/   # Application-wide constants
└── scripts/             # Development Automation
    ├── build.sh        # Production build
    ├── start.sh        # Multi-mode startup
    └── stop.sh         # Clean shutdown
```

## Layered Architecture

### Backend Layers

#### 1. API Layer (`api/v1/`)
```typescript
// Route → Controller → Service → External API
routes/search.routes.ts → controllers/ → services/ai/ → external/searxng
```
- **Routes**: Define HTTP endpoints and WebSocket connections
- **Controllers**: Handle requests, validate input, format responses
- **Middleware**: Authentication, error handling, logging

#### 2. Service Layer (`services/`)
```typescript
services/
├── ai/
│   ├── agents/
│   │   ├── webSearchAgent.ts      # General web search
│   │   ├── academicSearchAgent.ts # Academic papers
│   │   ├── imageSearchAgent.ts    # Image search
│   │   └── writingAssistant.ts    # Content generation
│   └── models/
│       ├── gemini.ts              # Google Gemini integration
│       └── openai.ts              # OpenAI GPT integration
├── external/
│   └── core/
│       └── searxng.ts             # Search engine integration
└── websocket/
    ├── connectionManager.ts       # WebSocket connections
    ├── messageHandler.ts          # Message routing
    └── websocketServer.ts         # Server setup
```

#### 3. Configuration Layer (`config/`)
- Environment variables management
- Service configuration
- Database connections (if applicable)

### Frontend Architecture

#### 1. App Router (`app/`)
```typescript
app/
├── layout.tsx          # Root layout
├── page.tsx           # Home page
├── globals.css        # Global styles
└── favicon.ico        # App icon
```

#### 2. Component Architecture (`components/`)
```typescript
components/
├── chat/
│   ├── Chat.tsx              # Main chat container
│   ├── ChatWindow.tsx        # Chat display area
│   ├── MessageBox.tsx        # Individual messages
│   ├── MessageInput.tsx      # User input
│   └── MessageSources.tsx    # Source citations
├── search/
│   ├── SearchImages.tsx      # Image results
│   └── SearchVideos.tsx      # Video results
├── layout/
│   ├── Layout.tsx           # App layout wrapper
│   ├── Navbar.tsx           # Navigation bar
│   └── Sidebar.tsx          # Side navigation
└── ui/
    ├── dialog.tsx           # Modal dialogs
    └── switch.tsx           # Toggle switches
```

#### 3. State Management
- **React Hooks**: Local component state
- **Custom Hooks**: Shared stateful logic (`use-websocket.ts`)
- **Context API**: Global application state

### Shared Package Architecture

```typescript
shared/src/
├── types/
│   └── api.types.ts     # API request/response types
└── constants/
    └── api.constants.ts # API endpoints, WebSocket events
```

## Communication Patterns

### 1. Real-Time Communication (WebSocket)

```typescript
// Frontend → Backend WebSocket Flow
Client connects → WebSocket handshake → Message routing → AI processing → Stream response
```

**Message Types:**
- `search_query`: User search requests
- `search_response`: AI-generated responses (streamed)
- `search_sources`: Source citations
- `connection_status`: Connection health

### 2. RESTful API Communication

```typescript
// HTTP API Endpoints
GET    /api/v1/health          # Health check
POST   /api/v1/search          # Search endpoint
GET    /api/v1/images          # Image search
GET    /api/v1/videos          # Video search
```

### 3. AI Agent Communication

```typescript
// Agent Selection Flow
User Query → Focus Mode Detection → Agent Router → Specific Agent → AI Model → Response
```

**Agent Types:**
- **WebSearchAgent**: General web search with contextual answers
- **AcademicSearchAgent**: Scholarly articles and research papers
- **ImageSearchAgent**: Visual content discovery
- **VideoSearchAgent**: Multimedia content search
- **WritingAssistant**: Content generation and editing

## Data Flow Architecture

### 1. Search Request Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User UI   │───►│  WebSocket  │───►│  AI Agent   │───►│  SearxNG    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       ▲                                       │                   │
       │                                       ▼                   │
       │            ┌─────────────┐    ┌─────────────┐            │
       └────────────│  Response   │◄───│  AI Model   │◄───────────┘
                    │  Stream     │    │  (Gemini)   │
                    └─────────────┘    └─────────────┘
```

### 2. Response Generation Flow

1. **Query Processing**: Parse user input, detect intent
2. **Source Retrieval**: Search SearxNG for relevant content
3. **Context Building**: Compile search results into context
4. **AI Generation**: Generate response using AI model
5. **Stream Response**: Send real-time response chunks
6. **Source Citation**: Provide source links and metadata

## Design Patterns

### 1. Agent Pattern
```typescript
interface SearchAgent {
  canHandle(query: string, focusMode: string): boolean;
  execute(query: string, context: SearchContext): Promise<SearchResponse>;
}

class WebSearchAgent implements SearchAgent {
  async execute(query: string): Promise<SearchResponse> {
    const sources = await this.searxng.search(query);
    const response = await this.ai.generateResponse(query, sources);
    return response;
  }
}
```

### 2. Streaming Pattern
```typescript
// Real-time response streaming
const stream = new ReadableStream({
  start(controller) {
    ai.streamResponse(query, (chunk) => {
      controller.enqueue(chunk);
    });
  }
});
```

### 3. Dependency Injection
```typescript
// Service injection for testability
class SearchController {
  constructor(
    private aiService: AIService,
    private searchService: SearchService
  ) {}
}
```

### 4. Repository Pattern
```typescript
// External service abstraction
interface SearchRepository {
  search(query: string): Promise<SearchResult[]>;
}

class SearxngRepository implements SearchRepository {
  async search(query: string): Promise<SearchResult[]> {
    // SearxNG-specific implementation
  }
}
```

## Scalability Considerations

### 1. Horizontal Scaling
- **Stateless Services**: Backend can be replicated
- **WebSocket Clustering**: Redis-based session management
- **Load Balancing**: Multiple backend instances

### 2. Caching Strategy
- **Response Caching**: Cache AI responses for common queries
- **Source Caching**: Cache search results temporarily
- **Static Assets**: CDN for frontend assets

### 3. Performance Optimization
- **Code Splitting**: Frontend bundle optimization
- **Tree Shaking**: Remove unused code
- **Streaming**: Real-time response delivery
- **Connection Pooling**: Efficient database connections

## Security Architecture

### 1. API Security
- **CORS Configuration**: Restrict origins
- **Rate Limiting**: Prevent abuse
- **Input Validation**: Sanitize all inputs
- **Error Handling**: Secure error responses

### 2. Environment Security
- **Environment Variables**: Secure API key management
- **Container Security**: Minimal Docker images
- **Network Security**: Internal service communication

## Development Workflow

### 1. Local Development
```bash
./scripts/start.sh          # Start all services
./scripts/stop.sh           # Clean shutdown
```

### 2. Production Build
```bash
./scripts/build.sh          # Build all packages
./scripts/start.sh --prod   # Production mode
```

### 3. Container Development
```bash
./scripts/start.sh --docker # Containerized environment
```

## Monitoring and Observability

### 1. Logging Strategy
- **Structured Logging**: JSON format for parsing
- **Log Levels**: Debug, Info, Warn, Error
- **Request Tracing**: Track requests across services

### 2. Health Checks
- **API Health**: `/api/v1/health` endpoint
- **Service Health**: External service monitoring
- **Container Health**: Docker health checks

### 3. Performance Metrics
- **Response Times**: API endpoint performance
- **WebSocket Connections**: Real-time connection health
- **AI Model Latency**: AI response generation time

This architecture provides a solid foundation for building, scaling, and maintaining the AiSearch application while ensuring developer productivity and system reliability.