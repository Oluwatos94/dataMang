# 🔐 Private Data Manager (PDM) - Nillion Hackathon Submission

> A Chrome extension that empowers non-developers to fully control their Nillion User Owned Collections through an intuitive interface.

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=google-chrome)](https://github.com)
[![Nillion](https://img.shields.io/badge/Nillion-SecretVaults-purple)](https://nillion.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-React-blue?logo=typescript)](https://www.typescriptlang.org/)

---

---

## 🎯 Challenge Solution

### The Problem
Nillion's `SecretVaultUserClient` requires developer skills and backend flows that force users to trust apps with their keys. Non-developers have no way to interact with their private storage.

### Solution
**Private Data Manager (PDM)** is a browser extension that makes Nillion's privacy-preserving storage accessible to everyday people through:

- 🔑 **Secure DID & Keypair Management** - Browser-based wallet with encrypted storage
- 📊 **Intuitive Dashboard** - Create, view, and delete private data without code
- ✅ **User Consent System** - Grant and revoke app permissions through a simple UI
- 🔄 **Demo Mode Fallback** - Works even when Nillion network is unavailable.

---

## ✨ Key Features

### 1. Identity Wallet
- **Automatic DID generation** using secure cryptographic functions
- **Encrypted keypair storage** with password protection (AES-256-GCM)
- **Session management** with 15-minute inactivity auto-lock
- **No external dependencies** - everything runs in the browser

### 2. Private Data Dashboard
- **Create documents** with title, content, and metadata
- **View all your data** organized by collections
- **Delete documents** with confirmation
- **Real-time sync** with Nillion network
- **localStorage fallback** for demo purposes

### 3. App Permission Manager
- **Grant permissions** (read, write, execute) to apps via collection ID
- **Revoke access** for specific apps or permissions
- **View all permissions** with app identifiers and timestamps
- **User consent required** for all access requests

### 4. Health Tracker Demo App
- Sample web application that integrates with PDM
- Demonstrates real-world permission flow
- Stores health data securely in Nillion collections
- User controls all access through the extension

---

## 🚀 Quick Start for Judges

### Prerequisites
- **Chrome Browser** (version 88+)
- **Bun Runtime** ([install here](https://bun.sh))
- **5 minutes of your time**

### Step 1: Install Dependencies
```bash
cd dataMang
bun install
```

### Step 2: Build the Extension
```bash
# Build all components
bun build src/background/background.ts --outfile dist/background.js --target browser --format esm
bun build src/content/content.ts --outfile dist/content.js --target browser --format esm
bun build src/popup/popup.tsx --outfile dist/popup.js --target browser --format esm
bun build src/options/options.ts --outfile dist/options.js --target browser --format esm
bun build src/offscreen/offscreen.ts --outfile dist/offscreen.js --target browser --format esm

# Copy static files
cp manifest.json options.html popup.html dist/
cp -r assets dist/
cp security_rules.json dist/
cp src/content/injected-script.js dist/
cp src/offscreen/offscreen.html dist/
```

### Step 3: Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `dist/` folder
5. ✅ PDM extension should now appear in your extensions

### Step 4: Configure Credentials
1. **Right-click the PDM extension icon** → Select **"Extension options"**
2. Enter the following test credentials:
   - **API Key:** (your Nillion API key)
   - **Private Key:** (optional)
   - **Password:** `demo123` (or your chosen password)
3. Click **"Save Credentials"**
4. You should see ✅ "Credentials saved successfully!"

### Step 5: Unlock the Extension
1. **Click the PDM extension icon** in Chrome toolbar
2. If locked, you'll see an unlock screen
3. Enter your password: `demo123`
4. ✅ Extension unlocks and shows the Documents tab

---

## 🧪 Testing the Extension

### Test 1: Create a Document
1. In the PDM popup, click **"+ New Document"**
2. Fill in:
   - **Title:** "My First Secret"
   - **Content:** "This is encrypted data!"
   - **Type:** Select "note"
   - **Collection ID:** `pdm_demo_collection`
3. Click **"Create Document"**
4. ✅ Document appears in the list

### Test 2: Grant Permission to an App
1. Find your created document in the list
2. Click the **🔑 Grant Permission** button
3. Enter test App DID: `did:nil:health_tracker_app_2024_demo_abc123def456`
4. Select permissions: **Read**, **Write**
5. Click **"Grant Permission"**
6. Go to **Permissions tab** → ✅ Permission should be listed

### Test 3: Revoke Permission
1. In the **Permissions tab**, find the permission you just created
2. Click **"Revoke"** button
3. ✅ Permission is removed from the list

### Test 4: Delete a Document
1. Go back to **Documents tab**
2. Click the **🗑️ Delete** button on any document
3. Confirm deletion
4. ✅ Document is removed from the list

### Test 5: Demo App Integration
1. **Start the Nillion proxy server:**
   ```bash
   cd server
   bun run dev
   ```
   Server runs at `http://localhost:3000`

2. **Start the Health Tracker demo app:**
   ```bash
   cd sample-app
   bunx serve -l 3001
   ```
   App runs at `http://localhost:3001/health-tracker.html`

3. **Open the Health Tracker in Chrome:**
   - Visit `http://localhost:3001/health-tracker.html`
   - Click **"Check PDM"** → ✅ Extension detected
   - Click **"Connect to PDM"** → ✅ Connected
   - Click **"Unlock PDM"** → Enter password `demo123`
   - Fill in health data and click **"Store Data"**
   - ✅ Data stored successfully!

4. **Verify in Extension:**
   - Click PDM extension icon
   - Go to **Documents tab**
   - ✅ Health data should appear with collection ID `health_data_2024`

---

##  Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Chrome Browser                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐      ┌──────────────┐     ┌─────────────┐ │
│  │   Popup UI  │◄────►│  Background  │◄───►│  Content    │ │
│  │   (React)   │      │   Service    │     │   Script    │ │
│  │             │      │   Worker     │     │             │ │
│  └─────────────┘      └──────────────┘     └─────────────┘ │
│         │                     │                     │        │
│         ▼                     ▼                     ▼        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            chrome.storage (encrypted)               │    │
│  │   - DID/Keypair    - Documents    - Permissions    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────┬───────────────────────────────┘
                            │
                            │ postMessage API
                            │
┌───────────────────────────▼───────────────────────────────┐
│                    Web Applications                         │
│                (e.g., Health Tracker)                       │
│   - Request access via window.PDM API                      │
│   - User approves through extension UI                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            │
┌───────────────────────────▼───────────────────────────────┐
│              Nillion Network (SecretVaults)                 │
│   - User Owned Collections                                  │
│   - Encrypted data storage                                  │
│   - Permission management via AccessRules                   │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. **Background Service Worker** (`src/background/background.ts`)
- Manages session state and credentials
- Handles messages from popup and content scripts
- Integrates with Nillion SecretVaults SDK
- Implements 15-minute inactivity timeout
- Provides localStorage fallback for demo mode

#### 2. **Content Script** (`src/content/content.ts`)
- Injects `window.PDM` API into web pages
- Relays messages between page and extension
- Implements security checks and rate limiting
- No direct DOM access (CSP compliant)

#### 3. **Popup Interface** (`src/popup/`)
- React-based UI with 4 tabs:
  - **Documents:** CRUD operations
  - **Permissions:** Grant/revoke management
  - **Identity:** DID display
  - **Settings:** Extension configuration
- Real-time data synchronization
- Responsive design

#### 4. **Identity Manager** (`src/utils/identity.ts`)
- Generates DIDs using SHA-256
- Encrypts keypairs with AES-256-GCM and PBKDF2 (100k iterations)
- Manages secure sessions
- No external identity providers needed

#### 5. **Nillion Manager** (`src/utils/nillion.ts`)
- Wraps SecretVaultUserClient
- Implements all CRUD operations
- Handles permission granting/revoking
- Falls back to localStorage when network unavailable
- Persists demo mode flag for seamless operation

---

## 🔒 Security Features

### Encryption
- **AES-256-GCM** for all stored credentials
- **PBKDF2** key derivation with 100,000 iterations
- **Random salts and IVs** for each encryption operation
- **Session-only password storage** - never persisted to disk

### Session Management
- **15-minute inactivity timeout** - auto-locks after no user interaction
- **chrome.storage.session** - cleared when browser closes
- **Activity tracking** - every action resets the timeout
- **Secure password handling** - encrypted before storage

### Communication Security
- **Origin validation** - only whitelisted domains can communicate
- **Rate limiting** - 50 requests per minute per origin
- **Message signing** - prevents tampering
- **CSP compliance** - no inline scripts, uses offscreen document

### Permission Model
- **User consent required** for all app access
- **Granular permissions** - read, write, execute separately
- **Revocable access** - users can revoke anytime
- **Collection-based** - apps provide collection ID, user owns data

---

##  Technical Implementation

### DID Generation and Storage

```typescript
// Generate DID using SHA-256
async generateDID(): Promise<string> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);

  const hashBuffer = await crypto.subtle.digest('SHA-256', randomBytes);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return `did:pdm:${hashHex}`;
}

// Store encrypted with password
await identityManager.storeNillionCredentials(credentials, password);
```

### Data Operations

```typescript
// Create document
const documentId = await nillionManager.storeData(
  { title, content, type },
  { collectionId: 'user_provided_collection' }
);

// List documents
const documents = await nillionManager.listUserData();

// Delete document
await nillionManager.deleteData(documentId, collectionId);
```

### Permission Management

```typescript
// Grant permission
await nillionManager.grantPermission(
  documentId,
  collectionId,
  appDid,
  ['read', 'write']
);

// Revoke permission
await nillionManager.revokePermission(
  documentId,
  collectionId,
  appDid,
  permissionId
);

// List permissions
const permissions = await nillionManager.listPermissions();
```

### Web App Integration

```javascript
// Web app requests access
const response = await window.PDM.connect({
  permissions: ['read', 'write'],
  actions: ['store_data', 'retrieve_data']
});

// Store data (user approves in extension)
const result = await window.PDM.storeData({
  title: "Health Record",
  content: { heartRate: 72, bloodPressure: "120/80" },
  type: "health",
  metadata: {
    collectionId: "health_data_2024",
    app: "HealthTracker"
  }
});
```

--- 

### How It Works:

### Features:
- ✅ Full CRUD operations on documents
- ✅ Permission granting and revoking
- ✅ Consistent DID across sessions
- ✅ Data persistence in browser


---

## 📦 Project Structure

```
dataMang/
├── manifest.json              # Extension manifest (Manifest V3)
├── package.json               # Dependencies and scripts
├── README.md                  # This file
│
├── src/
│   ├── background/
│   │   └── background.ts      # Service worker, session management
│   │
│   ├── content/
│   │   ├── content.ts         # Content script, message relay
│   │   └── injected-script.js # window.PDM API injection
│   │
│   ├── popup/
│   │   ├── popup.tsx          # Main popup entry
│   │   ├── App.tsx            # React app component
│   │   ├── components/        # React UI components
│   │   │   ├── documents/     # Document management UI
│   │   │   ├── permissions/   # Permission management UI
│   │   │   ├── identity/      # Identity display
│   │   │   └── settings/      # Settings page
│   │   └── hooks/             # Custom React hooks
│   │       ├── useDocuments.ts
│   │       ├── usePermissions.ts
│   │       └── useIdentity.ts
│   │
│   ├── options/
│   │   └── options.ts         # Extension options page
│   │
│   ├── offscreen/
│   │   ├── offscreen.html     # Offscreen document for CSP bypass
│   │   └── offscreen.ts       # Network request handler
│   │
│   └── utils/
│       ├── identity.ts        # DID generation, encryption
│       ├── nillion.ts         # Nillion SDK integration
│       ├── data.ts            # Document management
│       ├── permissions.ts     # Permission logic
│       └── messaging.ts       # Message handling
│
├── server/
│   ├── server.ts              # Bun-based proxy for Nillion
│   └── package.json
│
├── sample-app/
│   └── health-tracker.html    # Demo web application
│
├── dist/                      # Built extension (load this in Chrome)
│
└── docs/
    ├── README.md              # Documentation overview
    └── API_INTERFACES.md      # API reference
```

---

## 🚧 Known Limitations & Future Work

### Current Limitations
1. **Chrome only** - Firefox support not implemented yet
2. **English only** - No internationalization
3. **No activity log** - Optional requirement not implemented
4. **Manual collection IDs** - Apps must provide collection IDs

### Future Enhancements
1. **Firefox support** - Port to WebExtensions API
2. **Activity audit trail** - Log all permission changes
3. **QR code sharing** - Share DIDs easily
4. **Multi-device sync** - Sync settings across devices
5. **Biometric unlock** - Face/fingerprint authentication
6. **Smart permission suggestions** - ML-based recommendations

---

## For Judges

### Why This Matters
Before PDM, using Nillion's User Owned Collections required:
- Writing code to manage keypairs
- Understanding SecretVaults SDK
- Building backend flows
- Trusting apps with your keys

**With PDM**, anyone can:
- Use privacy-preserving storage through a familiar browser extension
- Control their data without writing a single line of code
- Grant and revoke app access with a few clicks
- Keep their keys secure in their own browser

### What Makes This Special
1. **Zero Trust Architecture** - Apps never see your keys
2. **User-Centric Design** - Built for non-developers
3. **Production Ready** - Security, error handling, edge cases covered
4. **Demo Mode** - Works even without network (perfect for judging!)
5. **Real Integration** - Actual web app demonstrates the flow

### Test Scenarios
We encourage judges to:
- ✅ Test the full document lifecycle (create → grant → revoke → delete)
- ✅ Try the health tracker integration
- ✅ Test session timeout (wait 15 minutes or close/reopen extension)
- ✅ Verify data persists across extension reloads

---

## 🔧 Troubleshooting

### Extension Won't Load
- Ensure all files are in `dist/` folder
- Check `chrome://extensions` for error messages
- Try reloading the extension

### "Session is locked" Error
- Enter your password in the extension popup
- Default test password: `demo123`
- If you forgot it, clear extension data in Chrome settings

### Health Tracker Can't Connect
- Ensure server is running: `cd server && bun run dev`
- Check that extension is unlocked
- Verify the server is at `http://localhost:3000`
- Check browser console for errors

### No Documents Showing
- Try clicking the refresh button (🔄)
- Check if demo mode is active (browser console)
- Verify you unlocked with the correct password
- Extension data persists in `chrome.storage.local`

### Demo Mode Not Working
- Open browser console on extension popup (F12)
- Look for "[NillionManager]" logs
- Demo mode activates automatically on network failure
- All operations work identically in demo mode

---

## 🎬 Video Walkthrough

 5-minute demo video showing:
1. Extension installation and setup
2. Creating and managing documents
3. Granting permissions to the health tracker
4. Revoking access
5. Complete end-to-end flow

---

## 📄 License

MIT License - Built for Nillion Hackathon 2025

---

**Thank you for judging our submission! We believe Private Data Manager takes a big step toward making privacy-preserving storage accessible to everyone.** 🚀

For questions or issues during judging, please refer to the troubleshooting section above or check the inline code comments.

---

**Made with ❤️ for the Nillion Hackathon**
