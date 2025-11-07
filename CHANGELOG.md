# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 🏗️ Robust monorepo architecture with pnpm workspaces
- 🎯 Layered backend architecture (API → Services → External)
- ⚛️ Feature-oriented frontend organization with Next.js 14+ App Router
- 📦 Shared types and utilities package for code reusability
- 🧪 Comprehensive testing framework with Jest
- 📚 Well-structured documentation in `docs/` directory
- 🐳 Docker and Docker Compose support for containerized deployment
- 🔄 WebSocket support for real-time AI streaming responses
- 🤖 Multiple AI agents: Web Search, Academic Search, Image Search, Video Search, Writing Assistant
- 🔍 SearXNG integration for privacy-focused search
- 🎨 Modern UI with Tailwind CSS and shadcn/ui components
- 📱 Responsive design for mobile and desktop devices
- 🛠️ Automation scripts for build, start, stop, and testing
- 🌐 Multi-mode startup script (development, production, Docker)
- 📖 API documentation and architecture guides

### Changed
- 📁 Migrated from single-repo to monorepo structure
- 🔄 Refactored `src/` to `backend/` with proper layering
- 🎨 Moved `interface/` to `frontend/` with feature-based organization
- 🐳 Updated Docker configurations for new project structure
- ⚡ Improved development workflow with hot reload and instant feedback
- 🔧 Enhanced environment configuration management

### Improved
- ✅ Better separation of concerns across layers
- 🔧 Increased code maintainability and readability
- 📈 Enhanced scalability for future features
- 🚀 Optimized development and deployment workflows
- 🎯 Type safety with strict TypeScript configuration
- 🧪 Better test coverage and organization
- 📝 Clearer code documentation and comments

### Fixed
- 🐛 Various bug fixes and performance improvements
- 🔒 Security enhancements in dependencies
- 🎨 UI/UX improvements based on user feedback

## [0.1.0] - Initial Release

### Added
- 🎉 Initial project setup
- 🔍 Basic search functionality
- 🤖 AI integration with Google Gemini
- 💬 Real-time chat interface
- 📚 Source citation system

---

**Legend:**
- 🎉 New feature
- 🐛 Bug fix
- 🔒 Security
- 📝 Documentation
- 🎨 UI/UX
- ⚡ Performance
- 🔧 Configuration
- 🏗️ Architecture