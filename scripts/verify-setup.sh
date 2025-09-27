#!/bin/bash

# PDM Extension Setup Verification Script

set -e

echo "🔍 Verifying PDM Extension setup..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in PDM extension directory"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Check if Bun is installed
echo "📋 Checking Bun installation..."
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed"
    echo "Install with: curl -fsSL https://bun.sh/install | bash"
    exit 1
else
    echo "✅ Bun $(bun --version) found"
fi

# Check if dependencies are installed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "❌ Dependencies not installed"
    echo "Run: bun install"
    exit 1
else
    echo "✅ Dependencies installed"
fi

# Check if .env file exists
echo "🔧 Checking environment configuration..."
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found"
    echo "Copy from .env.example and configure with your Nillion credentials"
    echo "Run: cp .env.example .env"
else
    echo "✅ .env file found"

    # Check for required environment variables
    if grep -q "NILLION_API_KEY=your_api_key_here" .env; then
        echo "⚠️  Please update NILLION_API_KEY in .env"
    else
        echo "✅ NILLION_API_KEY configured"
    fi
fi

# Test TypeScript compilation
echo "🔍 Testing TypeScript compilation..."
if bun run type-check > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    echo "Run: bun run type-check"
    exit 1
fi

# Test build process
echo "🔨 Testing build process..."
if bun run build:dev > /dev/null 2>&1; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    echo "Run: bun run build:dev"
    exit 1
fi

# Check build output
echo "📁 Checking build output..."
REQUIRED_FILES=("dist/manifest.json" "dist/background.js" "dist/content.js" "dist/popup.js" "dist/popup.html")

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done
echo "✅ All required files present"

# Test test suite
echo "🧪 Testing test suite..."
if bun test > /dev/null 2>&1; then
    echo "✅ Tests passing"
else
    echo "❌ Tests failing"
    echo "Run: bun test"
    exit 1
fi

# Check for required Nillion setup
echo "🌐 Checking Nillion integration readiness..."
echo "Manual steps required:"
echo "1. ✅ Create Nillion wallet: https://docs.nillion.com/community/guides/nillion-wallet"
echo "2. ✅ Get testnet NIL tokens: https://faucet.testnet.nillion.com/"
echo "3. ✅ Subscribe to nilDB: https://nilpay.vercel.app/"
echo "4. ✅ Update .env with your API key"

# Final verification
echo ""
echo "🎉 Setup verification complete!"
echo ""
echo "✅ Development environment ready"
echo "✅ Build system working"
echo "✅ Test suite passing"
echo "✅ Extension files generated"
echo ""
echo "Next steps:"
echo "1. Complete Nillion setup (wallet, tokens, API key)"
echo "2. Load extension in browser:"
echo "   - Chrome: chrome://extensions/ → Developer mode → Load unpacked → Select dist/"
echo "   - Firefox: about:debugging → Load Temporary Add-on → Select dist/manifest.json"
echo "3. Start development: bun run dev"
echo ""
echo "Happy hacking! 🚀"