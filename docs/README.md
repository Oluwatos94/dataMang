# Private Data Manager (PDM) Documentation

## Overview
Private Data Manager is a browser extension that provides users with full control over their private data using Nillion's SecretVaults technology.

## Directory Structure
```
pdm-extension/
├── manifest.json           # Extension manifest
├── popup.html             # Popup interface HTML
├── src/                   # Source code
│   ├── background/        # Background scripts
│   ├── content/          # Content scripts
│   ├── popup/            # Popup interface
│   ├── options/          # Extension options
│   └── utils/            # Utility functions
├── dist/                 # Compiled output
└── docs/                 # Documentation
```

## Getting Started
1. Install dependencies: `bun install`
2. Build extension: `bun run build`
3. Load in Chrome: Developer mode -> Load unpacked -> select dist folder

## Development
See [PDM-Development-Guide.md](../PDM-Development-Guide.md) for detailed development instructions.