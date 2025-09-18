# API Reference

Comprehensive API documentation for the AiSearch backend services.

## Base Configuration

### Base URLs
- **Development**: `http://localhost:8000`
- **Production**: `https://api.aisearch.com`
- **API Version**: `v1`
- **API Prefix**: `/api/v1`

### Authentication
Currently, the API operates without authentication. Future versions will implement:
- API Key authentication
- Rate limiting per user
- Request quotas

## WebSocket API

### Connection Establishment

#### Endpoint
```
ws://localhost:8000/ws
```

#### Connection Example
```javascript
// Frontend WebSocket connection
const ws = new WebSocket('ws://localhost:8000');

ws.onopen = (event) => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleMessage(data);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};
```

### Message Protocol

#### Client → Server Messages

**Search Query Message**
```json
{
  "type": "message",
  "message": "What is artificial intelligence?",
  "focusMode": "webSearch",
  "history": [
    ["human", "Previous user message"],
    ["assistant", "Previous AI response"]
  ]
}
```

**Connection Heartbeat**
```json
{
  "type": "ping",
  "timestamp": 1695859200000
}
```

#### Server → Client Messages

**Search Sources**
```json
{
  "type": "sources",
  "data": [
    {
      "title": "Introduction to AI",
      "link": "https://example.com/ai-intro",
      "snippet": "Artificial intelligence is...",
      "favicon": "https://example.com/favicon.ico"
    }
  ]
}
```

**Streaming Response**
```json
{
  "type": "message",
  "data": "Artificial intelligence (AI) refers to..."
}
```

**Message End Signal**
```json
{
  "type": "messageEnd"
}
```

**Error Response**
```json
{
  "type": "error",
  "data": "An error occurred while processing your request."
}
```

**Connection Status**
```json
{
  "type": "pong",
  "timestamp": 1695859200000
}
```

### Focus Modes

The system supports specialized search modes:

| Focus Mode | Description | Use Case |
|------------|-------------|----------|
| `webSearch` | General web search | Default search across multiple sources |
| `academicSearch` | Academic papers and research | Scientific papers, research articles |
| `youtubeSearch` | YouTube video content | Video tutorials, educational content |
| `redditSearch` | Reddit discussions | Community discussions, opinions |
| `videoSearch` | General video search | Mixed video content from various platforms |
| `imageSearch` | Image and visual content | Visual search, image discovery |
| `pinterestSearch` | Pinterest visual content | Creative inspiration, DIY projects |
| `writingAssistant` | AI writing assistance | Content generation, editing help |

### WebSocket Events

#### Connection Lifecycle
1. **connect**: Client establishes WebSocket connection
2. **message**: Client sends search query
3. **sources**: Server sends search results
4. **message** (streaming): Server streams AI response
5. **messageEnd**: Server signals response completion
6. **disconnect**: Connection terminates

#### Error Handling
```javascript
ws.onerror = (error) => {
  console.error('WebSocket error:', error);
  // Implement reconnection logic
  setTimeout(reconnect, 5000);
};

ws.onclose = (event) => {
  if (event.code !== 1000) {
    // Unexpected closure, attempt reconnection
    setTimeout(reconnect, 3000);
  }
};
```

## REST API Endpoints

### Health & Status

#### Health Check
```http
GET /api/v1/health
```

**Response**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0",
  "services": {
    "searxng": "connected",
    "ai_model": "operational"
  }
}
```

#### System Status
```http
GET /api/v1/status
```

**Response**
```json
{
  "server": "running",
  "database": "connected",
  "external_services": {
    "searxng": {
      "status": "healthy",
      "response_time": "120ms"
    },
    "gemini_ai": {
      "status": "operational",
      "rate_limit": "available"
    }
  }
}
```

### Search Endpoints

#### Web Search
```http
POST /api/v1/search
Content-Type: application/json
```

**Request Body**
```json
{
  "query": "machine learning algorithms",
  "focusMode": "webSearch",
  "limit": 10
}
```

**Response**
```json
{
  "query": "machine learning algorithms",
  "results": [
    {
      "title": "Machine Learning Algorithms Explained",
      "url": "https://example.com/ml-algorithms",
      "snippet": "A comprehensive guide to machine learning...",
      "favicon": "https://example.com/favicon.ico",
      "score": 0.95
    }
  ],
  "total": 156,
  "processing_time": "0.8s"
}
```

#### Image Search
```http
POST /api/v1/images
Content-Type: application/json
```

**Request Body**
```json
{
  "query": "sunset mountains",
  "safe_search": true,
  "limit": 20
}
```

**Response**
```json
{
  "query": "sunset mountains",
  "images": [
    {
      "title": "Beautiful Mountain Sunset",
      "url": "https://example.com/image.jpg",
      "thumbnail": "https://example.com/thumb.jpg",
      "source": "example.com",
      "width": 1920,
      "height": 1080
    }
  ],
  "total": 45
}
```

#### Video Search
```http
POST /api/v1/videos
Content-Type: application/json
```

**Request Body**
```json
{
  "query": "javascript tutorial",
  "duration": "medium",
  "quality": "hd"
}
```

**Response**
```json
{
  "query": "javascript tutorial",
  "videos": [
    {
      "title": "Complete JavaScript Tutorial",
      "url": "https://youtube.com/watch?v=abc123",
      "thumbnail": "https://img.youtube.com/vi/abc123/maxresdefault.jpg",
      "duration": "3600",
      "views": "1M",
      "channel": "TechChannel"
    }
  ]
}
```

### AI Assistant Endpoints

#### Generate Suggestions
```http
POST /api/v1/suggestions
Content-Type: application/json
```

**Request Body**
```json
{
  "chat_history": [
    ["human", "What is machine learning?"],
    ["assistant", "Machine learning is a subset of AI..."]
  ],
  "query": "Tell me more about neural networks"
}
```

**Response**
```json
{
  "suggestions": [
    "What are the types of neural networks?",
    "How do neural networks learn?",
    "What are the applications of neural networks?",
    "Compare neural networks with traditional algorithms"
  ]
}
```

#### Rewrite Content
```http
POST /api/v1/rewrite
Content-Type: application/json
```

**Request Body**
```json
{
  "content": "This is some text that needs improvement.",
  "style": "professional",
  "tone": "formal"
}
```

**Response**
```json
{
  "original": "This is some text that needs improvement.",
  "rewritten": "The following content requires enhancement to meet professional standards.",
  "changes": [
    {
      "type": "tone",
      "description": "Improved formal tone"
    },
    {
      "type": "vocabulary",  
      "description": "Enhanced professional vocabulary"
    }
  ]
}
```

## Data Models

### Search Result Model
```typescript
interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  favicon?: string;
  score: number;
  metadata?: {
    publishedDate?: string;
    author?: string;
    category?: string;
  };
}
```

### Chat Message Model
```typescript
interface ChatMessage {
  id: string;
  type: 'human' | 'assistant';
  content: string;
  timestamp: string;
  sources?: SearchResult[];
  metadata?: {
    focusMode: string;
    processingTime?: number;
  };
}
```

### WebSocket Message Model
```typescript
interface WebSocketMessage {
  type: 'message' | 'sources' | 'messageEnd' | 'error' | 'ping' | 'pong';
  data?: string | SearchResult[] | any;
  timestamp?: number;
}
```

## Error Handling

### HTTP Status Codes
- `200 OK`: Request successful
- `400 Bad Request`: Invalid request format
- `404 Not Found`: Endpoint not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: External service unavailable

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_QUERY",
    "message": "The search query cannot be empty",
    "details": {
      "field": "query",
      "received": "",
      "expected": "non-empty string"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### WebSocket Errors
```json
{
  "type": "error",
  "data": {
    "code": "SEARCH_FAILED",
    "message": "Unable to process search request",
    "retry": true
  }
}
```

## Rate Limiting

### Current Limits
- WebSocket connections: 100 per minute per IP
- REST API requests: 1000 per hour per IP
- Search queries: 50 per minute per connection

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## API Versioning

### Version Strategy
- Current version: `v1`
- Backwards compatibility maintained
- Deprecation notices provided 6 months in advance
- New features added to latest version

### Version Header
```http
API-Version: v1
```

## Development Examples

### Node.js Client Example
```javascript
const WebSocket = require('ws');

class AiSearchClient {
  constructor(url = 'ws://localhost:8000') {
    this.ws = new WebSocket(url);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.ws.on('open', () => {
      console.log('Connected to AiSearch');
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      this.handleMessage(message);
    });
  }

  search(query, focusMode = 'webSearch', history = []) {
    const message = {
      type: 'message',
      message: query,
      focusMode,
      history
    };
    
    this.ws.send(JSON.stringify(message));
  }

  handleMessage(message) {
    switch (message.type) {
      case 'sources':
        console.log('Search sources:', message.data);
        break;
      case 'message':
        process.stdout.write(message.data);
        break;
      case 'messageEnd':
        console.log('\n--- Response Complete ---');
        break;
      case 'error':
        console.error('Error:', message.data);
        break;
    }
  }
}

// Usage
const client = new AiSearchClient();
client.search('What is quantum computing?', 'academicSearch');
```

### Python Client Example
```python
import asyncio
import websockets
import json

class AiSearchClient:
    def __init__(self, url="ws://localhost:8000"):
        self.url = url
        
    async def connect(self):
        self.websocket = await websockets.connect(self.url)
        
    async def search(self, query, focus_mode="webSearch", history=None):
        if history is None:
            history = []
            
        message = {
            "type": "message",
            "message": query,
            "focusMode": focus_mode,
            "history": history
        }
        
        await self.websocket.send(json.dumps(message))
        
        async for message in self.websocket:
            data = json.loads(message)
            await self.handle_message(data)
            
            if data.get("type") == "messageEnd":
                break
                
    async def handle_message(self, message):
        msg_type = message.get("type")
        
        if msg_type == "sources":
            print(f"Sources: {message['data']}")
        elif msg_type == "message":
            print(message["data"], end="", flush=True)
        elif msg_type == "error":
            print(f"Error: {message['data']}")

# Usage
async def main():
    client = AiSearchClient()
    await client.connect()
    await client.search("Explain machine learning", "academicSearch")

asyncio.run(main())
```

This comprehensive API documentation provides developers with everything needed to integrate with the AiSearch backend services.