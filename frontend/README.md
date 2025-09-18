# AiSearch Frontend

Modern, responsive React application built with Next.js 14+ for the AiSearch AI-powered search platform.

## 🚀 Quick Start

### From Project Root (Recommended)
```bash
# Start entire application including frontend
./scripts/start.sh

# Or start just frontend (requires backend running)
pnpm run dev:frontend
```

### Standalone Development
```bash
# Install dependencies (if not done from root)
pnpm install

# Start development server
pnpm dev

# Open http://localhost:3000
```

## 🏗️ Architecture

### Technology Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Custom components with shadcn/ui base
- **State Management**: React hooks and context
- **WebSocket**: Custom hook for real-time communication
- **Build Tool**: Turbopack for fast development builds

### Project Structure
```
frontend/src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout component
│   ├── page.tsx           # Home page
│   ├── globals.css        # Global styles
│   └── favicon.ico        # App icon
├── components/            # React Components
│   ├── chat/             # Chat Interface
│   │   ├── Chat.tsx      # Main chat container
│   │   ├── ChatWindow.tsx # Chat display area
│   │   ├── EmptyChat.tsx  # Empty state
│   │   ├── MessageBox.tsx # Message rendering
│   │   ├── MessageInput.tsx # User input
│   │   └── MessageSources.tsx # Source citations
│   ├── search/           # Search Components
│   │   ├── SearchImages.tsx # Image results
│   │   └── SearchVideos.tsx # Video results
│   ├── layout/           # Layout Components
│   │   ├── Layout.tsx    # Main layout wrapper
│   │   ├── Navbar.tsx    # Navigation bar
│   │   └── Sidebar.tsx   # Side navigation
│   ├── MessageActions/   # Message Actions
│   │   ├── Copy.tsx      # Copy message
│   │   └── Rewrite.tsx   # Rewrite content
│   ├── common/           # Common Components
│   └── ui/               # UI Primitives
│       ├── dialog.tsx    # Modal dialogs
│       └── switch.tsx    # Toggle switches
├── hooks/                # Custom Hooks
│   └── use-websocket.ts  # WebSocket management
├── lib/                  # Utilities
│   ├── actions.ts        # Server actions
│   └── utils.ts          # Utility functions
└── types/                # TypeScript Types
    └── chat.types.ts     # Chat-related types
```

## ⚙️ Configuration

### Environment Variables
Create `.env.local` in the frontend directory:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=AiSearch

# Feature Flags (optional)
NEXT_PUBLIC_ENABLE_DEBUG=false
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

### Build Configuration (`next.config.ts`)
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable experimental features
  experimental: {
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Path mappings
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
      },
    ];
  },
  
  // Image optimization
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};

export default nextConfig;
```

### TypeScript Configuration (`tsconfig.json`)
```json
{
  "extends": "../shared/tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/types/*": ["./src/types/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts"
  ],
  "exclude": ["node_modules"]
}
```

## 🎨 Styling System

### Tailwind CSS Configuration
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          500: '#64748b',
          900: '#0f172a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};
```

### Design System
- **Colors**: Primary blue palette with semantic variants
- **Typography**: Inter for UI, JetBrains Mono for code
- **Spacing**: 8px base unit with Tailwind scale
- **Breakpoints**: Mobile-first responsive design
- **Components**: Consistent component library

## 🔧 Key Features

### Real-Time Chat Interface
- WebSocket-based communication
- Streaming AI responses
- Message history management
- Source citation display
- Focus mode selection

### Search Components
- Image search with lazy loading
- Video search with thumbnails
- Source attribution
- Result filtering and sorting

### Responsive Design
- Mobile-first approach
- Touch-friendly interactions
- Adaptive layouts
- Dark/light mode support (planned)

### Performance Optimizations
- Code splitting by route
- Image optimization
- Bundle size optimization
- Caching strategies

## 🔌 API Integration

### WebSocket Hook (`use-websocket.ts`)
```typescript
import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  const connect = () => {
    ws.current = new WebSocket(options.url);
    
    ws.current.onopen = () => {
      setIsConnected(true);
    };
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      options.onMessage?.(data);
    };
    
    ws.current.onerror = (error) => {
      options.onError?.(error);
    };
    
    ws.current.onclose = () => {
      setIsConnected(false);
      if (options.reconnect) {
        setTimeout(connect, 3000);
      }
    };
  };

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    connect();
    return () => ws.current?.close();
  }, []);

  return { isConnected, sendMessage };
}
```

### Chat Integration
```typescript
// Chat component example
import { useWebSocket } from '@/hooks/use-websocket';

export function Chat() {
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);

  const { isConnected, sendMessage } = useWebSocket({
    url: process.env.NEXT_PUBLIC_WS_URL!,
    onMessage: (data) => {
      switch (data.type) {
        case 'sources':
          setSources(data.data);
          break;
        case 'message':
          // Handle streaming message
          setMessages(prev => updateLastMessage(prev, data.data));
          break;
        case 'messageEnd':
          // Message complete
          break;
      }
    },
  });

  const handleSearch = (query: string, focusMode: string) => {
    sendMessage({
      type: 'message',
      message: query,
      focusMode,
      history: messages,
    });
  };

  return (
    <div className="chat-container">
      {/* Chat UI implementation */}
    </div>
  );
}
```

## 🧪 Testing

### Test Setup (`jest.config.js`)
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
  ],
};

module.exports = createJestConfig(customJestConfig);
```

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test ChatWindow.test.tsx
```

### Example Test
```typescript
// __tests__/components/Chat.test.tsx
import { render, screen } from '@testing-library/react';
import { Chat } from '@/components/chat/Chat';

describe('Chat Component', () => {
  it('renders chat interface', () => {
    render(<Chat />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('handles message sending', async () => {
    // Test implementation
  });
});
```

## 📦 Build & Deployment

### Development Build
```bash
# Start development server
pnpm dev

# Build for development
pnpm build:dev
```

### Production Build
```bash
# Build for production
pnpm build

# Start production server
pnpm start

# Analyze bundle size
pnpm analyze
```

### Docker Build
```bash
# Build Docker image
docker build -f ../infrastructure/docker/frontend.Dockerfile -t frontend .

# Run container
docker run -p 3000:3000 frontend
```

## 🔍 Debugging

### Development Tools
- React Developer Tools
- Next.js debugger
- WebSocket connection inspector
- Network request monitoring

### Debug Configuration
```json
// .vscode/launch.json
{
  "name": "Next.js: debug client-side",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/.bin/next",
  "args": ["dev"],
  "env": {
    "NODE_OPTIONS": "--inspect"
  },
  "console": "integratedTerminal"
}
```

### Common Issues
1. **WebSocket Connection Failed**: Check backend server status
2. **Build Errors**: Verify TypeScript types and imports
3. **Styling Issues**: Check Tailwind CSS configuration
4. **Performance Issues**: Use React Profiler

## 🚀 Performance

### Optimization Strategies
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: Regular bundle size monitoring
- **Caching**: Aggressive caching for static assets

### Performance Metrics
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

## 🔗 Integration

### Backend Communication
- RESTful API calls for static data
- WebSocket for real-time features
- Error handling and retry logic
- Request/response type safety

### External Services
- Image optimization service
- Analytics integration (planned)
- Error monitoring (planned)

## 📚 Resources

### Next.js Resources
- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Learn](https://nextjs.org/learn)
- [Next.js Examples](https://github.com/vercel/next.js/tree/canary/examples)

### Component Library
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind UI](https://tailwindui.com/)
- [Headless UI](https://headlessui.dev/)

### Development Tools
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Testing Library](https://testing-library.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

For more information about the overall project architecture, see the [main README](../README.md) and [architecture documentation](../docs/development/architecture.md).
