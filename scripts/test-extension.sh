#!/bin/bash

# PDM Extension Testing Script

set -e  # Exit on any error

echo "🧪 Testing PDM Extension..."

# Function to test in Chrome
test_chrome() {
    echo "🌐 Testing in Chrome..."

    if ! command -v google-chrome &> /dev/null && ! command -v chromium &> /dev/null; then
        echo "❌ Chrome/Chromium not found"
        return 1
    fi

    # Build extension
    bun run build:dev

    # Start Chrome with extension
    echo "🚀 Starting Chrome with extension loaded..."
    echo "Extension will be loaded from: $(pwd)/dist"

    if command -v google-chrome &> /dev/null; then
        google-chrome \
            --load-extension="$(pwd)/dist" \
            --disable-extensions-except="$(pwd)/dist" \
            --new-window \
            --user-data-dir="$(pwd)/tmp/chrome-test-profile" \
            "https://example.com" &
    else
        chromium \
            --load-extension="$(pwd)/dist" \
            --disable-extensions-except="$(pwd)/dist" \
            --new-window \
            --user-data-dir="$(pwd)/tmp/chrome-test-profile" \
            "https://example.com" &
    fi

    echo "✅ Chrome started with extension"
    echo "📝 Test the extension and close Chrome when done"
}

# Function to test in Firefox
test_firefox() {
    echo "🦊 Testing in Firefox..."

    if ! command -v web-ext &> /dev/null; then
        echo "❌ web-ext not found. Install with: bun add -g web-ext"
        return 1
    fi

    # Build extension
    bun run build:dev

    # Start Firefox with extension
    echo "🚀 Starting Firefox with extension loaded..."
    bun run start:firefox
}

# Function to run unit tests
run_unit_tests() {
    echo "🔬 Running unit tests..."
    bun run test
}

# Function to run lint checks
run_lint() {
    echo "🔍 Running lint checks..."
    bun run lint
}

# Function to validate manifest
validate_manifest() {
    echo "📋 Validating manifest..."

    if [ ! -f "dist/manifest.json" ]; then
        echo "❌ manifest.json not found in dist/"
        return 1
    fi

    if command -v jq &> /dev/null; then
        if jq empty dist/manifest.json; then
            echo "✅ Manifest JSON is valid"
        else
            echo "❌ Manifest JSON is invalid"
            return 1
        fi
    fi

    # Check required fields
    local required_fields=("name" "version" "manifest_version" "permissions")

    for field in "${required_fields[@]}"; do
        if command -v jq &> /dev/null; then
            if ! jq -e ".$field" dist/manifest.json > /dev/null; then
                echo "❌ Missing required field: $field"
                return 1
            fi
        fi
    done

    echo "✅ Manifest validation passed"
}

# Function to test API integration
test_api_integration() {
    echo "🌐 Testing API integration..."

    # This would run integration tests with real Nillion API
    echo "📝 Manual API testing required:"
    echo "1. Check Nillion wallet connection"
    echo "2. Verify API key functionality"
    echo "3. Test document storage/retrieval"
    echo "4. Validate permission system"
}

# Main menu
show_menu() {
    echo ""
    echo "PDM Extension Testing Menu:"
    echo "1) Run all tests"
    echo "2) Test in Chrome"
    echo "3) Test in Firefox"
    echo "4) Run unit tests only"
    echo "5) Run lint checks"
    echo "6) Validate manifest"
    echo "7) Test API integration"
    echo "8) Exit"
    echo ""
}

# Main execution
case "${1:-menu}" in
    "all")
        run_unit_tests
        run_lint
        validate_manifest
        echo "🎉 All automated tests passed!"
        echo "💡 Run 'bun run test:chrome' or 'bun run test:firefox' for manual testing"
        ;;
    "chrome")
        test_chrome
        ;;
    "firefox")
        test_firefox
        ;;
    "unit")
        run_unit_tests
        ;;
    "lint")
        run_lint
        ;;
    "manifest")
        validate_manifest
        ;;
    "api")
        test_api_integration
        ;;
    "menu"|*)
        while true; do
            show_menu
            read -p "Choose an option (1-8): " choice
            case $choice in
                1)
                    run_unit_tests
                    run_lint
                    validate_manifest
                    echo "🎉 All automated tests passed!"
                    ;;
                2) test_chrome ;;
                3) test_firefox ;;
                4) run_unit_tests ;;
                5) run_lint ;;
                6) validate_manifest ;;
                7) test_api_integration ;;
                8)
                    echo "👋 Goodbye!"
                    exit 0
                    ;;
                *)
                    echo "❌ Invalid option. Please choose 1-8."
                    ;;
            esac
            echo ""
            read -p "Press Enter to continue..."
        done
        ;;
esac