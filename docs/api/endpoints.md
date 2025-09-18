# API Documentation

## Base URL
- Development: `http://localhost:8000`
- Production: `https://api.aisearch.com`

## Authentication
Currently, the API does not require authentication. This will be added in future versions.

## WebSocket API

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8000');
```

### Message Format
```json
{
  "type": "message",
  "message": "search query",
  "focusMode": "webSearch",
  "history": [["human", "previous message"], ["assistant", "ai response"]]
}
```

### Focus Modes
- `webSearch`: General web search
- `youtubeSearch`: YouTube video search
- `redditSearch`: Reddit discussions search
- `academicSearch`: Academic papers search
- `videoSearch`: General video search
- `pinterestSearch`: Pinterest visual content search
- `writingAssistant`: AI writing assistance

### Response Types
- `sources`: Search results and sources
- `message`: AI response chunks (streaming)
- `messageEnd`: End of message signal
- `error`: Error messages

## REST API Endpoints

### Health Check
```
GET /health
```

### Suggestions
```
POST /suggestions
Content-Type: application/json

{
  "chat_history": [...],
  "query": "search query"
}
```