# Contributing to AiSearch

First off, thank you for considering contributing to AiSearch! It's people like you that make AiSearch such a great tool. 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)

## Code of Conduct

By participating in this project, you are expected to:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (v8 or higher)
- Docker and Docker Compose (optional, for containerized development)
- Git

### Development Environment Setup

1. **Fork and Clone the Repository**
```bash
git clone https://github.com/YOUR_USERNAME/AiSearch.git
cd AiSearch
```

2. **Install Dependencies**
```bash
pnpm install
```

3. **Set Up Environment Variables**
```bash
# Backend environment
cp backend/.env.example backend/.env
# Edit backend/.env and add your API keys

# Frontend environment
cp frontend/.env.example frontend/.env.local
# Edit frontend/.env.local as needed
```

4. **Build Shared Package**
```bash
pnpm run build:shared
```

5. **Start Development Servers**
```bash
# Start all services
pnpm run dev

# Or start individually
pnpm run dev:backend  # Backend on port 8000
pnpm run dev:frontend # Frontend on port 3000
```

## Development Workflow

1. **Create a Feature Branch**
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

2. **Make Your Changes**
   - Write clean, maintainable code
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
```bash
# Run all tests
pnpm test

# Run specific tests
pnpm run test:backend
pnpm run test:frontend

# Run with coverage
pnpm run test:coverage
```

4. **Commit Your Changes**
```bash
git add .
git commit -m "feat: add amazing feature"
```

5. **Push to Your Fork**
```bash
git push origin feature/your-feature-name
```

6. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Enable strict mode in `tsconfig.json`
- Define proper types and interfaces
- Avoid using `any` type unless absolutely necessary
- Use proper type imports

### Code Style
- Follow the ESLint and Prettier configurations
- Use meaningful variable and function names
- Keep functions small and focused
- Add JSDoc comments for complex functions
- Use async/await over promises when possible

### File Organization
- Place files in appropriate directories
- Keep components small and reusable
- Use barrel exports (index.ts) for cleaner imports
- Follow the existing project structure

### Backend Specific
- Follow layered architecture: API → Services → External
- Keep routes thin, business logic in services
- Use proper error handling with try-catch
- Validate input data with proper schemas
- Use dependency injection where applicable

### Frontend Specific
- Use functional components with hooks
- Keep components focused and single-purpose
- Use custom hooks for reusable logic
- Implement proper error boundaries
- Optimize performance with React.memo when needed

## Testing Guidelines

### Unit Tests
- Write tests for all new functions and components
- Aim for at least 80% code coverage
- Test edge cases and error scenarios
- Use descriptive test names

### Test Structure
```typescript
describe('ComponentName or FunctionName', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm run test:watch

# Run with coverage
pnpm run test:coverage
```

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples
```bash
feat(search): add image search functionality
fix(chat): resolve WebSocket connection timeout
docs(readme): update installation instructions
refactor(backend): simplify error handling logic
test(utils): add tests for math utilities
```

## Pull Request Process

1. **Before Submitting**
   - Ensure all tests pass
   - Update documentation if needed
   - Add/update tests for your changes
   - Run linting and fix any issues
   - Rebase on latest main branch

2. **PR Description**
   - Clearly describe what changes you made
   - Explain why the changes are necessary
   - Reference any related issues
   - Include screenshots for UI changes

3. **Review Process**
   - Wait for maintainer review
   - Address review comments promptly
   - Keep discussions respectful and constructive
   - Make requested changes in new commits

4. **After Approval**
   - Maintainers will merge your PR
   - Your contribution will be in the next release
   - You'll be added to the contributors list

## Project Structure

```
AiSearch/
├── backend/           # Backend Node.js application
│   ├── src/
│   │   ├── api/v1/   # API routes and middleware
│   │   ├── services/ # Business logic
│   │   ├── config/   # Configuration
│   │   └── utils/    # Utility functions
│   └── tests/        # Backend tests
├── frontend/         # Frontend Next.js application
│   ├── src/
│   │   ├── app/      # Next.js app directory
│   │   ├── components/ # React components
│   │   ├── hooks/    # Custom hooks
│   │   └── lib/      # Utilities
│   └── tests/        # Frontend tests
├── shared/           # Shared code between frontend and backend
│   └── src/
│       ├── types/    # Shared TypeScript types
│       └── constants/ # Shared constants
├── scripts/          # Build and deployment scripts
├── docs/            # Documentation
└── infrastructure/   # Docker and deployment configs
```

## Questions?

- 💬 Open an issue for bug reports or feature requests
- 📧 Contact the maintainers for security issues
- 📖 Check the [documentation](docs/) for guides and references

## Recognition

Contributors will be recognized in:
- The project README
- Release notes
- Our contributors page

Thank you for contributing to AiSearch! 🚀