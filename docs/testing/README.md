# 🧪 Testing AiSearch - Complete Guide

## Quick Start Testing

### Run All Tests
```bash
# Using our automation script (recommended)
./scripts/test.sh

# Or manually
pnpm test

# With coverage reports
pnpm run test:coverage
```

### Run Specific Tests
```bash
# Backend tests only
pnpm run test:backend

# Frontend tests only  
pnpm run test:frontend

# Watch mode for development
pnpm run test:backend:watch
```

## What is Testing and Why Do We Need It?

### Definition
Testing is the process of evaluating software to ensure it works correctly, meets requirements, and provides a good user experience.

### Critical Benefits

#### 1. **Bug Prevention** 🐛
- Catch issues before users do
- Prevent regression bugs
- Reduce production incidents by 80%

#### 2. **Cost Savings** 💰
- Fix bugs early (100x cheaper than production fixes)
- Reduce customer support burden
- Prevent revenue loss from broken features

#### 3. **Confidence in Changes** 🚀
- Safe refactoring and feature additions
- Faster development cycles
- Automated quality assurance

#### 4. **Documentation** 📚
- Tests serve as executable documentation
- Show how features should work
- Help new developers understand the codebase

## Types of Testing Explained

### By Testing Phase

#### 1. **Alpha Testing** (Internal Testing)
```
Who: Development team, QA engineers
When: During development
Where: Development environment
Goal: Find major bugs and usability issues
```

**Example in AiSearch:**
```bash
# Alpha testing our search feature
pnpm run test:backend -- searchAgent.test.ts
pnpm run test:frontend -- SearchComponent.test.tsx
```

#### 2. **Beta Testing** (External Testing)
```
Who: Selected external users
When: Feature-complete but not released
Where: Staging/pre-production environment
Goal: Real-world validation with actual users
```

**Example Beta Testing Plan:**
```yaml
Beta Test Phases:
  Closed Beta (Week 1-2):
    - 50 invited users
    - Core search functionality
    - Feedback collection via surveys
  
  Open Beta (Week 3-4):
    - Public beta signup
    - All features enabled
    - Bug reporting system
```

#### 3. **Gamma Testing** (Final Validation)
```
Who: Development team (final check)
When: After beta, before production release
Where: Production-like environment
Goal: Final performance, security, compliance checks
```

**Gamma Testing Checklist:**
- [ ] Performance benchmarks met
- [ ] Security vulnerabilities scanned
- [ ] Browser compatibility verified
- [ ] Mobile responsiveness confirmed
- [ ] Accessibility standards met

#### 4. **Production Testing** (Live Monitoring)
```
Who: Monitoring systems + real users
When: After release, continuously
Where: Production environment
Goal: Monitor real-world performance and issues
```

### By Testing Approach

#### 1. **Manual Testing** 👨‍💻
Human testers execute test cases manually.

**When to Use:**
- Usability testing
- Exploratory testing
- Visual design validation
- Complex user workflows

**Example Manual Test Case:**
```
Test: Search Functionality
Steps:
1. Open AiSearch application
2. Enter "machine learning" in search box
3. Select "Academic Search" focus mode
4. Click search button
5. Verify results appear within 5 seconds
6. Verify sources are displayed with links
7. Verify AI response is relevant to query

Expected: Search returns academic papers about ML
Actual: [Tester fills in results]
```

#### 2. **Automated Testing** 🤖
Software executes test cases automatically.

**When to Use:**
- Regression testing
- Unit testing
- API testing
- Performance testing

**Example Automated Test:**
```typescript
// Automated test for search API
describe('Search API', () => {
  it('should return results for valid query', async () => {
    const response = await request(app)
      .post('/api/v1/search')
      .send({ query: 'machine learning', focusMode: 'academicSearch' })
      .expect(200);

    expect(response.body.results).toHaveLength.greaterThan(0);
    expect(response.body.processingTime).toBeLessThan(5000);
  });
});
```

### By Testing Scope

#### 1. **Unit Testing** (Component Level) 🔬
Test individual functions/components in isolation.

**Characteristics:**
- Fast execution (< 1 second per test)
- No external dependencies
- Single responsibility testing
- High code coverage

**AiSearch Unit Test Examples:**
```typescript
// Backend: Test utility function
describe('computeSimilarity', () => {
  it('should return 1 for identical strings', () => {
    expect(computeSimilarity('hello', 'hello')).toBe(1);
  });
  
  it('should return 0 for completely different strings', () => {
    expect(computeSimilarity('hello', 'xyz')).toBe(0);
  });
});

// Frontend: Test React component
describe('MessageBox', () => {
  it('renders human message correctly', () => {
    render(<MessageBox message={{ type: 'human', content: 'Hello' }} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

#### 2. **Integration Testing** (System Level) 🔗
Test how components work together.

**Types:**
- API integration testing
- Database integration testing
- Service-to-service testing
- Frontend-backend integration

**AiSearch Integration Test Examples:**
```typescript
// Test WebSocket communication
describe('WebSocket Integration', () => {
  it('should handle search query end-to-end', async () => {
    const client = new WebSocketClient('ws://localhost:8000');
    await client.connect();
    
    client.send({ type: 'message', message: 'test query' });
    
    const response = await client.waitForMessage('sources');
    expect(response.data).toHaveLength.greaterThan(0);
  });
});

// Test external service integration
describe('SearxNG Integration', () => {
  it('should fetch real search results', async () => {
    const searxng = new SearxngService('http://localhost:4000');
    const results = await searxng.search('javascript');
    
    expect(results).toHaveLength.greaterThan(0);
    expect(results[0]).toHaveProperty('title');
    expect(results[0]).toHaveProperty('url');
  });
});
```

#### 3. **End-to-End Testing** (User Journey) 🎭
Test complete user workflows from start to finish.

**Tools:** Playwright, Cypress, Selenium
**Focus:** Real user scenarios

**AiSearch E2E Test Example:**
```typescript
// Complete search workflow test
test('user can perform complete search journey', async ({ page }) => {
  // Step 1: Navigate to app
  await page.goto('http://localhost:3000');
  
  // Step 2: Enter search query
  await page.fill('[data-testid="search-input"]', 'artificial intelligence');
  
  // Step 3: Select focus mode
  await page.selectOption('[data-testid="focus-mode"]', 'webSearch');
  
  // Step 4: Submit search
  await page.click('[data-testid="search-button"]');
  
  // Step 5: Verify results
  await expect(page.locator('[data-testid="search-results"]')).toBeVisible();
  await expect(page.locator('[data-testid="ai-response"]')).toContainText('artificial intelligence');
  await expect(page.locator('[data-testid="sources"]')).toBeVisible();
  
  // Step 6: Test follow-up query
  await page.fill('[data-testid="message-input"]', 'Tell me more about neural networks');
  await page.click('[data-testid="send-button"]');
  
  await expect(page.locator('[data-testid="ai-response"]').last()).toContainText('neural networks');
});
```

### By Testing Knowledge

#### 1. **Black Box Testing** 📦
Test without knowing internal code structure.

**Focus:** Inputs and outputs
**Perspective:** User/customer view
**Good for:** Acceptance testing, usability testing

```typescript
// Black box test - only care about input/output
describe('Search API (Black Box)', () => {
  it('should return results for query', async () => {
    // Input: search request
    const input = { query: 'javascript', focusMode: 'webSearch' };
    
    // Output: search results (don't care about internal logic)
    const output = await searchAPI(input);
    
    expect(output.results).toBeDefined();
    expect(output.results.length).toBeGreaterThan(0);
  });
});
```

#### 2. **White Box Testing** 🔍
Test with full knowledge of internal code structure.

**Focus:** Code coverage, internal logic
**Perspective:** Developer view
**Good for:** Unit testing, security testing

```typescript
// White box test - test internal logic paths
describe('WebSearchAgent (White Box)', () => {
  it('should follow correct execution path for valid query', () => {
    const agent = new WebSearchAgent();
    const spy = jest.spyOn(agent, 'validateQuery');
    
    agent.execute('valid query', 'webSearch');
    
    // Test internal method was called
    expect(spy).toHaveBeenCalledWith('valid query');
    expect(spy).toHaveReturnedWith(true);
  });
  
  it('should handle error path for invalid query', () => {
    const agent = new WebSearchAgent();
    const spy = jest.spyOn(agent, 'handleError');
    
    agent.execute('', 'webSearch'); // Empty query
    
    expect(spy).toHaveBeenCalledWith(expect.any(Error));
  });
});
```

#### 3. **Gray Box Testing** 🌫️
Combination of black box and white box testing.

**Focus:** Limited internal knowledge
**Perspective:** Best of both approaches
**Good for:** Integration testing, penetration testing

## Testing Pyramid Strategy

```
    🔺 E2E Tests (Few, Slow, Expensive)
   🔸🔸🔸 Integration Tests (Some, Medium)
🔹🔹🔹🔹🔹🔹 Unit Tests (Many, Fast, Cheap)
```

### Recommended Distribution
- **70% Unit Tests**: Fast, reliable, cheap to maintain
- **20% Integration Tests**: Test component interactions
- **10% E2E Tests**: Critical user journeys only

### AiSearch Testing Strategy
```typescript
// Unit Tests (70%) - backend/tests/unit/
describe('Utils', () => {
  describe('computeSimilarity', () => { /* ... */ });
  describe('formatHistory', () => { /* ... */ });
});

describe('AI Agents', () => {
  describe('WebSearchAgent', () => { /* ... */ });
  describe('AcademicSearchAgent', () => { /* ... */ });
});

// Integration Tests (20%) - backend/tests/integration/
describe('API Endpoints', () => {
  describe('POST /api/v1/search', () => { /* ... */ });
  describe('WebSocket /ws', () => { /* ... */ });
});

describe('External Services', () => {
  describe('SearxNG Integration', () => { /* ... */ });
  describe('AI Model Integration', () => { /* ... */ });
});

// E2E Tests (10%) - tests/e2e/
describe('Critical User Journeys', () => {
  test('Complete search workflow', () => { /* ... */ });
  test('Multi-turn conversation', () => { /* ... */ });
});
```

## Writing Effective Tests

### The AAA Pattern
```typescript
describe('Example Test', () => {
  it('should demonstrate AAA pattern', () => {
    // 🔧 ARRANGE: Set up test data and conditions
    const input = 'test query';
    const expectedOutput = { results: [], message: 'No results found' };
    const mockService = jest.fn().mockReturnValue(expectedOutput);
    
    // ⚡ ACT: Execute the code under test
    const result = performSearch(input, mockService);
    
    // ✅ ASSERT: Verify the outcome
    expect(result).toEqual(expectedOutput);
    expect(mockService).toHaveBeenCalledWith(input);
  });
});
```

### Test Naming Convention
```typescript
// Good: Descriptive test names
describe('WebSearchAgent', () => {
  describe('canHandle method', () => {
    it('should return true for webSearch focus mode', () => {});
    it('should return false for academicSearch focus mode', () => {});
    it('should return false for empty focus mode', () => {});
  });
  
  describe('execute method', () => {
    it('should return search results for valid query', () => {});
    it('should throw error for invalid query', () => {});
    it('should handle network timeout gracefully', () => {});
  });
});

// Bad: Vague test names
describe('WebSearchAgent', () => {
  it('test1', () => {});
  it('works', () => {});
  it('handles errors', () => {});
});
```

### Mocking Best Practices
```typescript
// Good: Mock external dependencies
jest.mock('@/services/external/searxng');

describe('WebSearchAgent', () => {
  let mockSearxng: jest.Mocked<SearxngService>;
  
  beforeEach(() => {
    mockSearxng = {
      search: jest.fn(),
      isHealthy: jest.fn()
    } as any;
  });
  
  it('should use mocked service', async () => {
    mockSearxng.search.mockResolvedValue([{ title: 'Test' }]);
    
    const agent = new WebSearchAgent(mockSearxng);
    const result = await agent.execute('test');
    
    expect(mockSearxng.search).toHaveBeenCalledWith('test');
  });
});

// Bad: Testing implementation details
it('should call internal method', () => {
  const agent = new WebSearchAgent();
  const spy = jest.spyOn(agent, 'privateMethod');
  
  agent.execute('test');
  
  // This test is brittle - breaks when refactoring
  expect(spy).toHaveBeenCalled();
});
```

## Running Tests in AiSearch

### Test Scripts Available
```bash
# Backend testing
pnpm run test:backend              # Run all backend tests
pnpm run test:backend:watch        # Watch mode
pnpm run test:backend:coverage     # With coverage
pnpm run test:backend:unit         # Unit tests only
pnpm run test:backend:integration  # Integration tests only

# Frontend testing
pnpm run test:frontend             # Run all frontend tests
pnpm run test:frontend:watch       # Watch mode
pnpm run test:frontend:coverage    # With coverage
pnpm run test:frontend:e2e         # E2E tests only

# All packages
pnpm test                          # Run all tests
pnpm run test:coverage             # All tests with coverage
pnpm run test:ci                   # CI-optimized test run
```

### Using Our Test Automation Script
```bash
# Run complete test suite
./scripts/test.sh

# Install dependencies and run tests
./scripts/test.sh --install

# Skip linting and type checking
./scripts/test.sh --skip-checks

# Run only backend tests
./scripts/test.sh --skip-frontend

# Get help
./scripts/test.sh --help
```

### Test Configuration Files

#### Backend Jest Config
```javascript
// backend/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/*.(test|spec).ts'],
  collectCoverageFrom: ['src/**/*.ts'],
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

#### Frontend Jest Config
```javascript
// frontend/jest.config.js
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
  ]
};

module.exports = createJestConfig(customJestConfig);
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Run tests
      run: ./scripts/test.sh --skip-checks
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

### Pre-commit Hooks
```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧪 Running pre-commit tests..."

# Run tests for staged files only
pnpm run test:staged

if [ $? -ne 0 ]; then
  echo "❌ Tests failed. Commit blocked."
  exit 1
fi

echo "✅ All tests passed!"
```

### Quality Gates
```yaml
# Branch protection rules in GitHub
required_status_checks:
  strict: true
  contexts:
    - "test / Test Suite"
    - "coverage / Coverage Check"
    - "lint / Lint Check"

required_reviews: 1
dismiss_stale_reviews: true
```

## Production Testing

### Are Tests Part of Production?

**Short Answer:** Tests themselves don't run in production, but testing strategies continue in production.

#### What Happens to Test Files in Production:

**NOT Included in Production:**
- Test files (*.test.ts, *.spec.ts)
- Test dependencies (jest, @testing-library)
- Test configuration files
- Development-only code

**Included in Production:**
- Application code that was tested
- Production monitoring code
- Health check endpoints
- Error tracking

#### Production Testing Strategies:

#### 1. **Health Checks**
```typescript
// Runs in production - monitors system health
app.get('/api/v1/health', async (req, res) => {
  const health = {
    status: 'healthy',
    services: {
      searxng: await checkSearxngHealth(),
      ai_model: await checkAIHealth(),
      database: await checkDatabaseHealth()
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(health);
});
```

#### 2. **Smoke Tests**
```bash
# Automated production smoke tests
curl -f https://api.aisearch.com/api/v1/health || exit 1
curl -f https://aisearch.com || exit 1

# Test critical functionality
curl -X POST https://api.aisearch.com/api/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "focusMode": "webSearch"}' | grep -q "results"
```

#### 3. **Canary Deployments**
```yaml
# Deploy to small percentage of users first
deployment:
  strategy: canary
  stages:
    - name: canary
      traffic: 5%
      duration: 10m
      success_criteria:
        - error_rate < 1%
        - response_time < 2s
    
    - name: full
      traffic: 100%
```

#### 4. **A/B Testing**
```typescript
// Feature flag testing in production
export function SearchInterface({ userId }: Props) {
  const showNewFeature = useFeatureFlag('NEW_SEARCH_UI', userId);
  
  // 50% of users see new UI, 50% see old UI
  return showNewFeature ? <NewSearchUI /> : <OldSearchUI />;
}
```

#### 5. **Real User Monitoring (RUM)**
```typescript
// Track real user interactions
analytics.track('search_performed', {
  query: 'anonymized_query',
  focusMode: 'webSearch',
  responseTime: 1500,
  success: true
});

// Error tracking
try {
  await performSearch(query);
} catch (error) {
  errorTracker.captureException(error, {
    user: userId,
    query: 'redacted',
    context: 'search_execution'
  });
}
```

### Production Testing Benefits:

#### 1. **Real-World Validation**
- Actual user behavior patterns
- Real network conditions
- Production data volumes
- Geographic distribution effects

#### 2. **Continuous Quality Assurance**
- 24/7 monitoring
- Immediate issue detection
- Performance trend analysis
- User experience metrics

#### 3. **Data-Driven Decisions**
- A/B test results
- Feature adoption rates
- Performance benchmarks
- User satisfaction metrics

## Testing Best Practices Summary

### 1. **Test Early and Often**
- Write tests during development
- Run tests on every commit
- Automate test execution

### 2. **Follow the Testing Pyramid**
- Many unit tests (fast, cheap)
- Some integration tests (medium)
- Few E2E tests (slow, expensive)

### 3. **Write Maintainable Tests**
- Clear, descriptive names
- Single responsibility per test
- Independent test cases
- Good documentation

### 4. **Use Appropriate Testing Types**
- Unit tests for business logic
- Integration tests for APIs
- E2E tests for critical user journeys
- Performance tests for scalability

### 5. **Continuous Improvement**
- Monitor test coverage
- Remove flaky tests
- Update tests with code changes
- Learn from production issues

## Conclusion

Testing is not just about finding bugs—it's about:
- **Building confidence** in your code
- **Enabling fast, safe changes**
- **Documenting expected behavior**
- **Ensuring great user experience**

With AiSearch's comprehensive testing strategy, you can develop features faster, deploy with confidence, and maintain high quality standards throughout the application lifecycle.

Remember: **Good tests are an investment that pays dividends every day!** 🧪✅