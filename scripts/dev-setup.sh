#!/bin/bash

# PDM Extension Development Setup Script

set -e  # Exit on any error

echo "🚀 Setting up PDM Extension development environment..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Check if Node.js is installed (for some tools)
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js not found. Some tools may not work properly."
fi

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your actual configuration values"
fi

# Create assets directory
echo "📁 Creating assets directory..."
mkdir -p assets
mkdir -p assets/icons

# Download placeholder icons if they don't exist
if [ ! -f assets/icons/icon-16.png ]; then
    echo "🎨 Creating placeholder icons..."
    # Create simple colored squares as placeholder icons
    echo "Creating placeholder icons (you should replace these with actual icons)"

    # These would normally be actual icon files
    # For now, just create placeholder files
    touch assets/icons/icon-16.png
    touch assets/icons/icon-32.png
    touch assets/icons/icon-48.png
    touch assets/icons/icon-128.png
fi

# Test TypeScript compilation
echo "🔍 Testing TypeScript compilation..."
bun run type-check

# Build the extension
echo "🔨 Building extension..."
bun run build:dev

# Check if Chrome is available for testing
if command -v google-chrome &> /dev/null || command -v chromium &> /dev/null; then
    echo "✅ Chrome/Chromium detected - you can use 'bun run start:chrome'"
fi

# Check if Firefox is available for testing
if command -v firefox &> /dev/null; then
    echo "✅ Firefox detected - you can use 'bun run start:firefox'"
fi

echo ""
echo "🎉 Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  bun run dev          - Start development with watch mode"
echo "  bun run build        - Build for production"
echo "  bun run test         - Run tests"
echo "  bun run lint         - Lint code"
echo "  bun run format       - Format code"
echo "  bun run start:chrome - Test in Chrome"
echo "  bun run start:firefox- Test in Firefox"
echo ""
echo "Next steps:"
echo "1. Update .env with your Nillion API credentials"
echo "2. Replace placeholder icons in assets/icons/"
echo "3. Run 'bun run dev' to start development"
echo ""