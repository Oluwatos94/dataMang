# Private Data Manager (PDM) Documentation

## Overview
Private Data Manager is a Chrome extension that provides users with control over their private data. Built for the Nillion hackathon, it demonstrates user-owned data storage with granular permission management.

## Features
- 🔐 Encrypted credential storage
- 📦 User-owned data collections
- 🔑 Grant/revoke app permissions
- 💾 Demo mode with localStorage fallback
- ⏱️ 15-minute inactivity auto-lock

## Quick Start

### Prerequisites
- Bun runtime installed
- Chrome browser

### Installation
```bash
# Install dependencies
bun install

# Build the extension
bun build src/background/background.ts --outfile dist/background.js --target browser --format esm
bun build src/content/content.ts --outfile dist/content.js --target browser --format esm
bun build src/popup/popup.tsx --outfile dist/popup.js --target browser --format esm
bun build src/options/options.ts --outfile dist/options.js --target browser --format esm

# Copy static files
cp manifest.json options.html popup.html dist/
cp -r assets dist/
```

### Load in Chrome
1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `dist/` folder

### Setup Credentials
1. Right-click extension icon → "Extension options"
2. Enter your Nillion API Key and Password
3. Click "Save Credentials"
4. Unlock the extension with your password

## Architecture

```
src/
├── background/       # Service worker, session management
├── content/          # Content script for web page injection
├── popup/           # React UI for extension popup
│   ├── components/  # React components
│   └── hooks/       # Custom React hooks
├── options/         # Options page for credential setup
├── utils/           # Core utilities
│   ├── identity.ts  # User identity & encryption
│   ├── nillion.ts   # Nillion integration with localStorage fallback
│   ├── data.ts      # Document management
│   └── permissions.ts # Permission management
└── offscreen/       # Offscreen document for CSP bypass
```

## Demo Mode
When Nillion network is unavailable, the extension automatically falls back to localStorage-based demo mode. All CRUD operations work seamlessly in demo mode.

## Session Management
- Sessions persist across extension reloads
- Auto-lock after 15 minutes of inactivity
- Secure session storage in `chrome.storage.session`

## Sample App
See `sample-app/health-tracker.html` for a demo web application that integrates with PDM.

## Server
The `server/` directory contains a Bun-based proxy server for Nillion network requests:
```bash
cd server && bun run dev
```

## Documentation
- [API_INTERFACES.md](./API_INTERFACES.md) - Detailed API reference

## Built With
- TypeScript
- React
- Bun
- Chrome Extension Manifest V3
- Nillion SecretVaults SDK