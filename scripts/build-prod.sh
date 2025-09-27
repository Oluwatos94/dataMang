#!/bin/bash

# PDM Extension Production Build Script

set -e  # Exit on any error

echo "🏗️  Building PDM Extension for production..."

# Clean any previous builds
echo "🧹 Cleaning previous builds..."
bun run clean

# Run full validation
echo "✅ Running validation checks..."
bun run validate

# Build for production
echo "🔨 Building production version..."
bun run build:prod

# Verify build output
echo "🔍 Verifying build output..."

REQUIRED_FILES=(
    "dist/manifest.json"
    "dist/background.js"
    "dist/content.js"
    "dist/popup.js"
    "dist/popup.html"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

# Check file sizes
echo "📊 Build size analysis:"
du -h dist/*.js | sort -h

# Validate manifest
echo "📋 Validating manifest..."
if command -v jq &> /dev/null; then
    if jq empty dist/manifest.json; then
        echo "✅ Manifest JSON is valid"
    else
        echo "❌ Manifest JSON is invalid"
        exit 1
    fi
else
    echo "⚠️  jq not found, skipping manifest validation"
fi

# Create production package
echo "📦 Creating production package..."
cd dist
zip -r ../pdm-extension-v$(jq -r '.version' manifest.json).zip .
cd ..

echo ""
echo "🎉 Production build complete!"
echo "📦 Package: pdm-extension-v$(jq -r '.version' dist/manifest.json).zip"
echo ""
echo "Build contents:"
ls -la dist/
echo ""
echo "Ready for:"
echo "- Chrome Web Store submission"
echo "- Firefox Add-ons submission"
echo "- Manual installation testing"
echo ""