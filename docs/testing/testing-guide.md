# 🧪 Comprehensive Testing Guide for AiSearch

## Table of Contents
1. [What is Testing & Why It Matters](#what-is-testing--why-it-matters)
2. [Types of Testing](#types-of-testing)
3. [Testing Levels](#testing-levels)
4. [Testing in AiSearch](#testing-in-aisearch)
5. [Writing Tests](#writing-tests)
6. [Running Tests](#running-tests)
7. [CI/CD Integration](#cicd-integration)
8. [Production Testing](#production-testing)

## What is Testing & Why It Matters

### Definition
Software testing is the process of evaluating and verifying that a software application or system does what it's supposed to do. It helps identify bugs, errors, and missing requirements.

### Why Testing is Critical

#### 1. **Quality Assurance**
- Ensures the application meets requirements
- Validates functionality works as expected
- Prevents bugs from reaching users

#### 2. **Cost Reduction**
- Finding bugs early is 100x cheaper than fixing them in production
- Reduces maintenance costs
- Prevents customer churn due to poor quality

#### 3. **Confidence in Deployments**
- Safe deployments with automated testing
- Regression testing prevents breaking existing features
- Faster development cycles

#### 4. **Documentation**
- Tests serve as living documentation
- Show how features should work
- Help new developers understand the codebase

#### 5. **Refactoring Safety**
- Safe code changes with test coverage
- Detect breaking changes immediately
- Enable continuous improvement

## Types of Testing

### A. By Testing Approach

#### 1. **Manual Testing**
```
Human testers manually execute test cases
├── Exploratory Testing - Ad-hoc testing to discover issues
├── Usability Testing - User experience validation
├── Accessibility Testing - Ensuring app works for all users
└── User Acceptance Testing - Final validation by end users
```

#### 2. **Automated Testing**
```
Automated scripts execute test cases
├── Unit Tests - Individual component testing
├── Integration Tests - Component interaction testing
├── End-to-End Tests - Full user journey testing
└── Performance Tests - Load and stress testing
```

### B. By Testing Phase

#### 1. **Alpha Testing**
- **Who**: Internal developers and QA team
- **When**: During development phase
- **Purpose**: Find major bugs before external testing
- **Environment**: Development/staging environment

#### 2. **Beta Testing**
- **Who**: Limited external users (beta testers)
- **When**: After alpha testing, before release
- **Purpose**: Real-world testing with actual users
- **Types**:
  - **Closed Beta**: Invited users only
  - **Open Beta**: Anyone can participate

#### 3. **Gamma Testing**
- **Who**: Final testing by development team
- **When**: After beta testing, final validation
- **Purpose**: Final bug fixes and polishing
- **Focus**: Performance, security, compliance

#### 4. **Production Testing**
- **Who**: Monitoring systems and users
- **When**: After release, continuously
- **Purpose**: Monitor real-world performance
- **Types**: A/B testing, canary releases, monitoring

### C. By Testing Scope

#### 1. **Functional Testing**
Tests what the system does:
- **Unit Testing**: Individual functions/components
- **Integration Testing**: Component interactions
- **System Testing**: Complete system functionality
- **Acceptance Testing**: Business requirements validation

#### 2. **Non-Functional Testing**
Tests how the system performs:
- **Performance Testing**: Speed, responsiveness, stability
- **Security Testing**: Vulnerabilities, data protection
- **Usability Testing**: User experience, accessibility
- **Compatibility Testing**: Different browsers, devices, OS

### D. By Testing Strategy

#### 1. **Black Box Testing**
- Test without knowing internal code structure
- Focus on inputs and outputs
- User perspective testing

#### 2. **White Box Testing**
- Test with full knowledge of internal code
- Focus on code coverage
- Developer perspective testing

#### 3. **Gray Box Testing**
- Combination of black box and white box
- Limited knowledge of internal structure
- Best of both approaches

## Testing Levels

### 1. **Unit Testing** (Microscopic Level)
```
Individual components in isolation
├── Functions
├── Classes
├── Modules
└── Components
```

### 2. **Integration Testing** (Component Level)
```
Component interactions
├── API Integration
├── Database Integration
├── Service-to-Service
└── Frontend-Backend
```

### 3. **System Testing** (Application Level)
```
Complete application testing
├── End-to-End workflows
├── Full feature testing
├── Cross-browser testing
└── Performance testing
```

### 4. **Acceptance Testing** (Business Level)
```
Business requirement validation
├── User Acceptance Testing (UAT)
├── Business Acceptance Testing (BAT)
├── Alpha Testing
└── Beta Testing
```

## Testing in AiSearch

### Current Testing Setup

AiSearch uses a comprehensive testing strategy across the monorepo:

```
AiSearch Testing Architecture
├── backend/tests/          # Backend testing suite
│   ├── unit/              # Unit tests for individual functions
│   ├── integration/       # API and service integration tests
│   └── setup.ts          # Test environment setup
├── frontend/tests/        # Frontend testing suite
│   ├── __tests__/        # Component and hook tests
│   ├── e2e/              # End-to-end tests (planned)
│   └── jest.setup.js     # Jest configuration
└── shared/tests/          # Shared package tests
```

### Testing Frameworks Used

#### Backend Testing Stack
```javascript
// backend/jest.config.js
{
  preset: 'ts-jest',                    // TypeScript support
  testEnvironment: 'node',              // Node.js environment
  collectCoverageFrom: ['src/**/*.ts'], // Coverage collection
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts']
}
```

#### Frontend Testing Stack
```javascript
// frontend/jest.config.js
{
  testEnvironment: 'jsdom',             // Browser-like environment
  setupFilesAfterEnv: ['jest.setup.js'], // React Testing Library setup
  moduleNameMapping: {                  // Path mapping support
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}
```

### Testing Strategy by Component

#### 1. **Backend Testing** (`backend/tests/`)

**Unit Tests** (`unit/`)
- Individual function testing
- Service class testing
- Utility function testing
- AI agent testing

**Integration Tests** (`integration/`)
- API endpoint testing
- Database integration
- External service integration (SearxNG)
- WebSocket communication

#### 2. **Frontend Testing** (`frontend/tests/`)

**Component Tests**
- React component rendering
- User interaction testing
- State management testing
- Hook testing

**Integration Tests**
- API integration
- WebSocket integration
- Route navigation
- Form submission

#### 3. **End-to-End Testing**

**User Journey Tests**
- Complete search workflow
- Chat conversation flow
- Multi-focus mode switching
- Error handling scenarios

## Writing Tests

### 1. Backend Unit Tests

#### Example: Testing AI Agent
```typescript
// backend/tests/unit/services/ai/webSearchAgent.test.ts
import { WebSearchAgent } from '@/services/ai/agents/webSearchAgent';
import { SearxngService } from '@/services/external/core/searxng';

// Mock external dependencies
jest.mock('@/services/external/core/searxng');

describe('WebSearchAgent', () => {
  let agent: WebSearchAgent;
  let mockSearxng: jest.Mocked<SearxngService>;

  beforeEach(() => {
    mockSearxng = jest.mocked(new SearxngService());
    agent = new WebSearchAgent(mockSearxng);
  });

  describe('canHandle', () => {
    it('should handle web search focus mode', () => {
      expect(agent.canHandle('test query', 'webSearch')).toBe(true);
    });

    it('should not handle academic search focus mode', () => {
      expect(agent.canHandle('test query', 'academicSearch')).toBe(false);
    });
  });

  describe('execute', () => {
    it('should return search results', async () => {
      // Arrange
      const mockResults = [
        { title: 'Test Result', url: 'https://test.com', snippet: 'Test snippet' }
      ];
      mockSearxng.search.mockResolvedValue(mockResults);

      // Act
      const result = await agent.execute('test query', {});

      // Assert
      expect(result.sources).toEqual(mockResults);
      expect(mockSearxng.search).toHaveBeenCalledWith('test query');
    });

    it('should handle search errors gracefully', async () => {
      // Arrange
      mockSearxng.search.mockRejectedValue(new Error('Search failed'));

      // Act & Assert
      await expect(agent.execute('test query', {}))
        .rejects.toThrow('Search failed');
    });
  });
});
```

#### Example: Testing API Endpoints
```typescript
// backend/tests/integration/api/search.test.ts
import request from 'supertest';
import { app } from '@/app';

describe('Search API', () => {
  describe('POST /api/v1/search', () => {
    it('should return search results', async () => {
      const response = await request(app)
        .post('/api/v1/search')
        .send({
          query: 'test search',
          focusMode: 'webSearch'
        })
        .expect(200);

      expect(response.body).toHaveProperty('results');
      expect(response.body.results).toBeInstanceOf(Array);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/search')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toContain('query is required');
    });

    it('should handle server errors', async () => {
      // Mock service to throw error
      jest.spyOn(require('@/services/ai'), 'searchService')
        .mockRejectedValue(new Error('Service unavailable'));

      await request(app)
        .post('/api/v1/search')
        .send({ query: 'test', focusMode: 'webSearch' })
        .expect(500);
    });
  });
});
```

### 2. Frontend Component Tests

#### Example: Testing Chat Component
```typescript
// frontend/tests/__tests__/components/chat/MessageBox.test.tsx
import { render, screen } from '@testing-library/react';
import { MessageBox } from '@/components/chat/MessageBox';

describe('MessageBox', () => {
  const mockMessage = {
    id: '1',
    type: 'human' as const,
    content: 'Test message',
    timestamp: '2024-01-15T10:00:00Z'
  };

  it('renders human message correctly', () => {
    render(<MessageBox message={mockMessage} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByTestId('human-message')).toBeInTheDocument();
  });

  it('renders AI message with sources', () => {
    const aiMessage = {
      ...mockMessage,
      type: 'assistant' as const,
      sources: [
        { title: 'Source 1', url: 'https://example.com', snippet: 'Test' }
      ]
    };

    render(<MessageBox message={aiMessage} />);
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('Source 1')).toBeInTheDocument();
  });

  it('handles message actions', async () => {
    const { user } = render(<MessageBox message={mockMessage} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    await user.click(copyButton);
    
    // Verify copy functionality
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test message');
  });
});
```

#### Example: Testing Custom Hooks
```typescript
// frontend/tests/__tests__/hooks/use-websocket.test.ts
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/hooks/use-websocket';

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

describe('useWebSocket', () => {
  it('establishes connection on mount', () => {
    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8000' })
    );

    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:8000');
    expect(result.current.isConnected).toBe(false);
  });

  it('sends messages when connected', () => {
    const mockWs = {
      send: jest.fn(),
      readyState: WebSocket.OPEN,
    };
    (WebSocket as jest.Mock).mockReturnValue(mockWs);

    const { result } = renderHook(() => 
      useWebSocket({ url: 'ws://localhost:8000' })
    );

    act(() => {
      result.current.sendMessage({ type: 'test', data: 'hello' });
    });

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'test', data: 'hello' })
    );
  });
});
```

### 3. End-to-End Tests

#### Example: User Journey Test
```typescript
// tests/e2e/search-workflow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Search Workflow', () => {
  test('user can perform a complete search', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');

    // Wait for page to load
    await expect(page.locator('input[placeholder*="search"]')).toBeVisible();

    // Enter search query
    await page.fill('input[placeholder*="search"]', 'artificial intelligence');

    // Select focus mode
    await page.selectOption('[data-testid="focus-mode"]', 'webSearch');

    // Submit search
    await page.click('button[type="submit"]');

    // Wait for results
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // Verify AI response appears
    await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();

    // Verify sources are displayed
    await expect(page.locator('[data-testid="sources"]')).toBeVisible();

    // Check that sources have links
    const sourceLinks = page.locator('[data-testid="source-link"]');
    await expect(sourceLinks.first()).toHaveAttribute('href');
  });

  test('user can switch focus modes', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Test different focus modes
    const focusModes = ['webSearch', 'academicSearch', 'videoSearch'];

    for (const mode of focusModes) {
      await page.selectOption('[data-testid="focus-mode"]', mode);
      await page.fill('input[placeholder*="search"]', `test ${mode}`);
      await page.click('button[type="submit"]');

      await expect(page.locator('[data-testid="ai-response"]')).toBeVisible();
      
      // Clear for next iteration
      await page.reload();
    }
  });
});
```

## Running Tests

### 1. Local Testing Commands

#### Backend Tests
```bash
# Run all backend tests
pnpm run test:backend

# Run with coverage
pnpm run test:backend:coverage

# Run specific test file
pnpm run test:backend -- webSearchAgent.test.ts

# Run tests in watch mode
pnpm run test:backend:watch

# Run integration tests only
pnpm run test:backend -- --testPathPattern=integration
```

#### Frontend Tests
```bash
# Run all frontend tests
pnpm run test:frontend

# Run with coverage
pnpm run test:frontend:coverage

# Run specific component tests
pnpm run test:frontend -- MessageBox.test.tsx

# Run tests in watch mode
pnpm run test:frontend:watch

# Update snapshots
pnpm run test:frontend -- --updateSnapshot
```

#### All Tests
```bash
# Run entire test suite
pnpm test

# Run with coverage report
pnpm run test:coverage

# Run tests and generate reports
pnpm run test:ci
```

### 2. Test Automation Scripts

Let me create test automation scripts for you:

#### Test Script (`scripts/test.sh`)
```bash
#!/bin/bash

echo "🧪 Running AiSearch Test Suite..."

# Function to run tests with proper error handling
run_tests() {
    local package=$1
    local test_type=$2
    
    echo "📦 Testing $package ($test_type)..."
    
    if cd $package && pnpm test 2>&1; then
        echo "✅ $package tests passed"
        cd ..
        return 0
    else
        echo "❌ $package tests failed"
        cd ..
        return 1
    fi
}

# Initialize test results
FAILED_TESTS=()

# Run shared package tests
if [ -d "shared" ]; then
    if ! run_tests "shared" "unit"; then
        FAILED_TESTS+=("shared")
    fi
fi

# Run backend tests
if [ -d "backend" ]; then
    if ! run_tests "backend" "unit & integration"; then
        FAILED_TESTS+=("backend")
    fi
fi

# Run frontend tests
if [ -d "frontend" ]; then
    if ! run_tests "frontend" "component & unit"; then
        FAILED_TESTS+=("frontend")
    fi
fi

# Summary
echo ""
echo "📊 TEST SUMMARY"
echo "=================="

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo "✅ All tests passed!"
    echo "🎉 Ready for deployment!"
    exit 0
else
    echo "❌ Failed packages: ${FAILED_TESTS[*]}"
    echo "🚨 Fix failing tests before deployment"
    exit 1
fi
```

### 3. Coverage Reports

#### Generating Coverage
```bash
# Generate coverage for all packages
pnpm run test:coverage

# View coverage report
open backend/coverage/lcov-report/index.html
open frontend/coverage/lcov-report/index.html
```

#### Coverage Thresholds
```javascript
// backend/jest.config.js
module.exports = {
  // ... other config
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## CI/CD Integration

### 1. GitHub Actions Workflow

#### Test Workflow (`.github/workflows/test.yml`)
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    services:
      # SearxNG service for integration tests
      searxng:
        image: searxng/searxng:latest
        ports:
          - 8080:8080
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'pnpm'
    
    - name: Install pnpm
      run: npm install -g pnpm
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Build shared package
      run: pnpm run build:shared
    
    - name: Run linting
      run: pnpm run lint
    
    - name: Run type checking
      run: pnpm run type-check
    
    - name: Run tests
      run: pnpm run test:ci
      env:
        SEARXNG_API_URL: http://localhost:8080
        GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
    
    - name: Upload coverage reports
      uses: codecov/codecov-action@v3
      with:
        directory: ./coverage
        flags: unittests
        name: codecov-umbrella
    
    - name: Build application
      run: pnpm run build
    
    - name: Run E2E tests
      run: pnpm run test:e2e
      env:
        PLAYWRIGHT_BROWSERS_PATH: 0
```

### 2. Pre-commit Hooks

#### Husky Configuration (`.husky/pre-commit`)
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Run tests on staged files
pnpm run test:staged

# Run linting
pnpm run lint:staged

# Run type checking
pnpm run type-check

echo "✅ Pre-commit checks passed!"
```

### 3. Quality Gates

#### Pull Request Requirements
```yaml
# .github/workflows/pr-checks.yml
name: PR Quality Checks

on:
  pull_request:
    branches: [ main ]

jobs:
  quality-checks:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Check test coverage
      run: |
        pnpm run test:coverage
        # Fail if coverage below threshold
        pnpm run coverage:check
    
    - name: Security audit
      run: pnpm audit --audit-level moderate
    
    - name: Bundle size check
      run: |
        pnpm run build
        pnpm run bundlesize
    
    - name: Performance budget
      run: pnpm run lighthouse:ci
```

## Production Testing

### 1. Tests in Production Environment

#### Purpose of Production Tests
- **Smoke Tests**: Verify critical functionality works
- **Health Checks**: Monitor system health
- **Performance Monitoring**: Track response times
- **Error Tracking**: Catch and report issues

#### Production Test Strategy
```typescript
// Production smoke tests
describe('Production Smoke Tests', () => {
  const PRODUCTION_URL = process.env.PRODUCTION_URL;
  
  test('API health check', async () => {
    const response = await fetch(`${PRODUCTION_URL}/api/v1/health`);
    expect(response.status).toBe(200);
    
    const health = await response.json();
    expect(health.status).toBe('healthy');
  });
  
  test('Search functionality works', async () => {
    const response = await fetch(`${PRODUCTION_URL}/api/v1/search`, {
      method: 'POST',
      body: JSON.stringify({ query: 'test', focusMode: 'webSearch' })
    });
    
    expect(response.status).toBe(200);
  });
});
```

### 2. Monitoring and Observability

#### Health Check Endpoints
```typescript
// backend/src/api/v1/routes/health.routes.ts
export const healthRoutes = (app: Express) => {
  app.get('/api/v1/health', async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
      services: {
        searxng: await checkSearxngHealth(),
        ai_model: await checkAIModelHealth(),
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };
    
    res.json(health);
  });
};
```

### 3. Deployment Testing Strategy

#### Blue-Green Deployment Testing
```bash
# Deploy to staging (green)
./scripts/deploy.sh staging

# Run production tests against staging
pnpm run test:production --env=staging

# If tests pass, promote to production (blue)
if [ $? -eq 0 ]; then
    ./scripts/promote.sh staging production
else
    echo "Production tests failed, rollback"
    ./scripts/rollback.sh
fi
```

#### Canary Testing
```yaml
# Canary deployment with gradual traffic increase
stages:
  - name: deploy-canary
    traffic: 5%
    tests:
      - smoke-tests
      - performance-tests
  
  - name: increase-traffic
    traffic: 25%
    tests:
      - full-test-suite
  
  - name: full-deployment
    traffic: 100%
    tests:
      - comprehensive-tests
```

### 4. A/B Testing Framework

#### Feature Flag Testing
```typescript
// A/B testing implementation
class FeatureToggle {
  static isEnabled(feature: string, userId: string): boolean {
    const hash = createHash('md5').update(userId + feature).digest('hex');
    const percentage = parseInt(hash.substring(0, 2), 16) / 255;
    
    return percentage < this.getFeaturePercentage(feature);
  }
  
  static getFeaturePercentage(feature: string): number {
    return process.env[`FEATURE_${feature.toUpperCase()}_PERCENTAGE`] || 0;
  }
}

// Usage in components
export function SearchInterface() {
  const showNewUI = FeatureToggle.isEnabled('NEW_SEARCH_UI', userId);
  
  return showNewUI ? <NewSearchUI /> : <OldSearchUI />;
}
```

## Best Practices & Tips

### 1. Test Pyramid Strategy
```
        🔺 E2E Tests (Few)
       🔸🔸🔸 Integration Tests (Some)  
    🔹🔹🔹🔹🔹🔹 Unit Tests (Many)
```

### 2. Writing Good Tests
- **AAA Pattern**: Arrange, Act, Assert
- **Single Responsibility**: One test, one thing
- **Descriptive Names**: Tests should read like documentation
- **Independent Tests**: No test dependencies
- **Fast Execution**: Keep tests quick

### 3. Common Testing Pitfalls
- **Testing Implementation Details**: Test behavior, not internals
- **Brittle Tests**: Avoid tests that break with minor changes
- **Slow Tests**: Keep test suite execution under 10 minutes
- **Flaky Tests**: Fix intermittent test failures immediately

### 4. Testing Automation Goals
- **Fast Feedback**: Know about issues in < 10 minutes
- **High Confidence**: 90%+ test coverage on critical paths
- **Easy Maintenance**: Tests should be easy to update
- **Clear Reporting**: Understand failures quickly

This comprehensive testing guide covers everything from theory to implementation, helping you build a robust, well-tested AiSearch application! 🧪✅