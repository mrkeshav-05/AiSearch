#!/bin/bash

echo "🧪 Running AiSearch Test Suite..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to run tests with proper error handling
run_tests() {
    local package=$1
    local test_type=$2
    
    print_status $BLUE "📦 Testing $package ($test_type)..."
    
    if [ ! -d "$package" ]; then
        print_status $YELLOW "⚠️  $package directory not found, skipping..."
        return 0
    fi
    
    cd $package
    
    # Check if package.json exists and has test script
    if [ ! -f "package.json" ]; then
        print_status $YELLOW "⚠️  No package.json found in $package, skipping..."
        cd ..
        return 0
    fi
    
    # Run tests with timeout
    if timeout 300s pnpm test 2>&1; then
        print_status $GREEN "✅ $package tests passed"
        cd ..
        return 0
    else
        print_status $RED "❌ $package tests failed"
        cd ..
        return 1
    fi
}

# Function to check prerequisites
check_prerequisites() {
    print_status $BLUE "🔍 Checking prerequisites..."
    
    # Check if pnpm is installed
    if ! command -v pnpm &> /dev/null; then
        print_status $RED "❌ pnpm is not installed. Please install pnpm first."
        exit 1
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ] || [ ! -f "pnpm-workspace.yaml" ]; then
        print_status $RED "❌ Not in AiSearch root directory. Please run from project root."
        exit 1
    fi
    
    print_status $GREEN "✅ Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    print_status $BLUE "📦 Installing dependencies..."
    
    if pnpm install --frozen-lockfile; then
        print_status $GREEN "✅ Dependencies installed"
    else
        print_status $RED "❌ Failed to install dependencies"
        exit 1
    fi
}

# Function to build shared package
build_shared() {
    print_status $BLUE "🔨 Building shared package..."
    
    if pnpm run build:shared; then
        print_status $GREEN "✅ Shared package built successfully"
    else
        print_status $RED "❌ Failed to build shared package"
        exit 1
    fi
}

# Function to run linting
run_linting() {
    print_status $BLUE "🔍 Running linting checks..."
    
    if pnpm run lint 2>/dev/null; then
        print_status $GREEN "✅ Linting passed"
        return 0
    else
        print_status $YELLOW "⚠️  Linting issues found (continuing with tests)"
        return 0
    fi
}

# Function to run type checking
run_type_check() {
    print_status $BLUE "🔍 Running TypeScript type checking..."
    
    # Check backend types
    if [ -d "backend" ]; then
        cd backend
        if pnpm run type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
            print_status $GREEN "✅ Backend types are valid"
        else
            print_status $YELLOW "⚠️  Backend type issues found"
        fi
        cd ..
    fi
    
    # Check frontend types
    if [ -d "frontend" ]; then
        cd frontend
        if pnpm run type-check 2>/dev/null || npx tsc --noEmit 2>/dev/null; then
            print_status $GREEN "✅ Frontend types are valid"
        else
            print_status $YELLOW "⚠️  Frontend type issues found"
        fi
        cd ..
    fi
}

# Main test execution
main() {
    local start_time=$(date +%s)
    
    print_status $BLUE "🚀 Starting AiSearch Test Suite"
    echo "========================================"
    
    # Initialize test results
    FAILED_TESTS=()
    PASSED_TESTS=()
    
    # Run prerequisite checks
    check_prerequisites
    
    # Install dependencies if needed
    if [ "$1" = "--install" ] || [ "$1" = "-i" ]; then
        install_dependencies
        build_shared
    fi
    
    # Run linting and type checking
    if [ "$1" != "--skip-checks" ]; then
        run_linting
        run_type_check
    fi
    
    echo ""
    print_status $BLUE "🧪 Running Test Suites"
    echo "========================================"
    
    # Run shared package tests
    if [ -d "shared" ] && [ "$1" != "--skip-shared" ]; then
        if run_tests "shared" "unit"; then
            PASSED_TESTS+=("shared")
        else
            FAILED_TESTS+=("shared")
        fi
    fi
    
    # Run backend tests
    if [ -d "backend" ] && [ "$1" != "--skip-backend" ]; then
        if run_tests "backend" "unit & integration"; then
            PASSED_TESTS+=("backend")
        else
            FAILED_TESTS+=("backend")
        fi
    fi
    
    # Run frontend tests
    if [ -d "frontend" ] && [ "$1" != "--skip-frontend" ]; then
        if run_tests "frontend" "component & unit"; then
            PASSED_TESTS+=("frontend")
        else
            FAILED_TESTS+=("frontend")
        fi
    fi
    
    # Calculate execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Summary
    echo ""
    print_status $BLUE "📊 TEST SUMMARY"
    echo "========================================"
    echo "⏱️  Execution time: ${duration}s"
    echo "✅ Passed: ${#PASSED_TESTS[@]} packages"
    echo "❌ Failed: ${#FAILED_TESTS[@]} packages"
    
    if [ ${#PASSED_TESTS[@]} -gt 0 ]; then
        print_status $GREEN "✅ Passed packages: ${PASSED_TESTS[*]}"
    fi
    
    if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
        echo ""
        print_status $GREEN "🎉 ALL TESTS PASSED!"
        print_status $GREEN "🚀 Ready for deployment!"
        echo ""
        exit 0
    else
        echo ""
        print_status $RED "❌ FAILED PACKAGES: ${FAILED_TESTS[*]}"
        print_status $RED "🚨 Fix failing tests before deployment"
        echo ""
        
        # Provide helpful commands
        print_status $YELLOW "💡 To run individual package tests:"
        for package in "${FAILED_TESTS[@]}"; do
            echo "   pnpm run test:$package"
        done
        echo ""
        
        exit 1
    fi
}

# Show help
show_help() {
    echo "🧪 AiSearch Test Runner"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --install, -i        Install dependencies before testing"
    echo "  --skip-checks        Skip linting and type checking"
    echo "  --skip-shared        Skip shared package tests"
    echo "  --skip-backend       Skip backend tests"
    echo "  --skip-frontend      Skip frontend tests"
    echo "  --help, -h           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                   Run all tests"
    echo "  $0 --install         Install deps and run all tests"
    echo "  $0 --skip-frontend   Run tests except frontend"
    echo ""
}

# Handle command line arguments
case "$1" in
    --help|-h)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac