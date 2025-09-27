# Private Data Manager (PDM) - Technical Specification

## 🎯 Project Overview

The Private Data Manager (PDM) is a browser extension that gives users full control over their private data using Nillion's SecretVaults technology. Users can store encrypted data across multiple nilDB nodes, manage granular permissions for web applications, and maintain complete sovereignty over their sensitive information.

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser Extension                       │
├─────────────────────────────────────────────────────────────┤
│  Popup Interface (React)     │    Background Service Worker │
│  ├── Document Manager        │    ├── Identity Manager      │
│  ├── Permission Manager      │    ├── Nillion Client        │
│  └── Settings UI             │    └── Storage Manager       │
├─────────────────────────────────────────────────────────────┤
│             Content Script (PostMessage API)               │
├─────────────────────────────────────────────────────────────┤
│                    Web Applications                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Nillion Infrastructure                    │
├─────────────────────────────────────────────────────────────┤
│  nilDB Node 1     │   nilDB Node 2    │   nilDB Node 3     │
│  (Primary)        │   (Backup)        │   (Redundancy)     │
├─────────────────────────────────────────────────────────────┤
│              Secretvaults SDK Multi-Node Manager           │
├─────────────────────────────────────────────────────────────┤
│                    nilChain (Payments)                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Security Architecture

### **Identity Management**
- **DID Generation**: Create unique decentralized identifiers for users
- **Keypair Management**: Secure generation and storage of cryptographic keys
- **Browser Storage**: Encrypted storage using chrome.storage.local with AES-256
- **Nillion Wallet Integration**: Connect with user's Nillion wallet for authentication

### **Data Encryption Flow**
```
User Data → AES-256 Encryption → Data Splitting → Multi-Node Distribution
                    ↓
            Encrypted Chunks Stored Across:
            ├── nilDB Node 1 (Primary)
            ├── nilDB Node 2 (Backup)
            └── nilDB Node 3 (Redundancy)
```

### **Permission Model**
- **Granular Access Control**: Read-only vs. full access permissions
- **App-Specific Permissions**: Per-origin permission management
- **Revocable Access**: Users can revoke permissions at any time
- **Activity Logging**: Audit trail of all permission changes

## 🌐 Nillion Integration

### **Key Endpoints & Configuration**

#### **Testnet nilDB Nodes**
```typescript
const NILLION_CONFIG = {
  nodes: [
    "https://testnet-node1.nillion.com",
    "https://testnet-node2.nillion.com",
    "https://testnet-node3.nillion.com"
  ],
  networkId: "testnet",
  chainId: "nillion-testnet-1"
};
```

#### **Essential Services**
- **NIL Faucet**: `https://faucet.testnet.nillion.com/`
- **nilPay Subscription**: `https://nilpay.vercel.app/`
- **Collection Explorer**: `https://collection-explorer.nillion.com`
- **Network Config**: `https://docs.nillion.com/build/network-config`

### **Multi-Node Strategy**

#### **Node Selection Algorithm**
```typescript
interface NodeStrategy {
  primary: string;    // Main node for writes
  replicas: string[]; // Backup nodes for reads
  fallback: string;   // Emergency fallback
  healthCheck: () => Promise<boolean>;
}
```

#### **Failover Handling**
1. **Health Monitoring**: Continuous ping to all nodes
2. **Automatic Failover**: Switch to backup nodes on failure
3. **Data Consistency**: Verify data across all nodes
4. **Recovery Protocol**: Resync data when nodes come back online

### **Collection Schema Design**

#### **Document Collection Schema**
```typescript
interface DocumentSchema {
  id: string;           // Unique document identifier
  name: string;         // User-friendly name
  content: encrypted;   // Encrypted document content
  metadata: {
    createdAt: timestamp;
    updatedAt: timestamp;
    size: number;
    contentType: string;
  };
  permissions: {
    owner: string;      // User's DID
    apps: AppPermission[];
  };
}
```

#### **Permission Collection Schema**
```typescript
interface PermissionSchema {
  id: string;
  documentId: string;
  appOrigin: string;
  accessLevel: 'read' | 'full';
  grantedAt: timestamp;
  expiresAt?: timestamp;
  isActive: boolean;
}
```

## 🔧 Component Specifications

### **1. Identity Manager**
```typescript
class IdentityManager {
  // Core Methods
  async generateDID(): Promise<string>;
  async getOrCreateIdentity(): Promise<UserIdentity>;
  async secureStore(key: string, value: any): Promise<void>;
  async retrieveSecure(key: string): Promise<any>;

  // Nillion Integration
  async connectWallet(): Promise<WalletConnection>;
  async getAPIKey(): Promise<string>;
  async validateAPIKey(): Promise<boolean>;
}
```

### **2. Nillion Manager**
```typescript
class NillionManager {
  // Multi-Node Configuration
  private nodes: NillionNode[];
  private activeNode: NillionNode;

  // Core Methods
  async initialize(apiKey: string): Promise<void>;
  async createCollection(schema: CollectionSchema): Promise<string>;
  async storeData(collectionId: string, data: any): Promise<string>;
  async retrieveData(collectionId: string, recordId: string): Promise<any>;

  // Multi-Node Operations
  async selectOptimalNode(): Promise<NillionNode>;
  async replicateData(nodes: NillionNode[], data: any): Promise<void>;
  async handleNodeFailover(): Promise<void>;
}
```

### **3. Data Manager**
```typescript
class DataManager {
  // CRUD Operations
  async createDocument(name: string, content: any): Promise<Document>;
  async getDocument(id: string): Promise<Document>;
  async updateDocument(id: string, content: any): Promise<Document>;
  async deleteDocument(id: string): Promise<void>;
  async listDocuments(): Promise<Document[]>;

  // Advanced Operations
  async searchDocuments(query: SearchQuery): Promise<Document[]>;
  async exportDocuments(format: 'json' | 'csv'): Promise<string>;
  async importDocuments(data: string): Promise<void>;
}
```

### **4. Permission Manager**
```typescript
class PermissionManager {
  // Permission Operations
  async grantAccess(appOrigin: string, documentId: string, level: AccessLevel): Promise<void>;
  async revokeAccess(appOrigin: string, documentId: string): Promise<void>;
  async checkPermission(appOrigin: string, documentId: string): Promise<Permission | null>;
  async listPermissions(): Promise<Permission[]>;

  // Advanced Features
  async bulkGrantAccess(permissions: PermissionRequest[]): Promise<void>;
  async setPermissionExpiry(permissionId: string, expiresAt: Date): Promise<void>;
  async getAuditLog(): Promise<AuditEntry[]>;
}
```

## 📡 Communication Architecture

### **PostMessage API**
```typescript
// Injected into web pages
window.PDM = {
  // Core API
  requestAccess: (documentId: string, accessLevel: AccessLevel) => Promise<AccessResponse>;
  getData: (documentId: string) => Promise<any>;

  // Advanced API
  createDocument: (name: string, content: any) => Promise<string>;
  updateDocument: (documentId: string, content: any) => Promise<void>;

  // Permission Management
  checkPermission: (documentId: string) => Promise<Permission>;
  requestBulkAccess: (requests: AccessRequest[]) => Promise<AccessResponse[]>;
};
```

### **Message Flow**
```
Web App → Content Script → Background Script → Nillion Nodes
   ↑                                              ↓
   ←─── Response ←─── Permission Check ←─── Data Retrieval
```

## 🎨 User Interface Specifications

### **Popup Interface Components**
1. **Header**: Logo, user identity, connection status
2. **Navigation**: Documents, Permissions, Settings tabs
3. **Document List**: Searchable, sortable list with actions
4. **Permission Manager**: App-specific permission controls
5. **Settings**: API key management, node configuration

### **Permission Prompt UI**
- **App Information**: Origin, requested access level
- **Document Details**: Name, content preview, sensitivity level
- **Action Buttons**: Grant, Deny, Grant Temporarily
- **Advanced Options**: Set expiry, limit access scope

## 🧪 Testing Strategy

### **Unit Testing**
- **Identity Manager**: Key generation, encryption/decryption
- **Data Manager**: CRUD operations, data validation
- **Permission Manager**: Access control logic
- **Nillion Manager**: Multi-node operations, failover

### **Integration Testing**
- **Real Nillion Integration**: Test with actual testnet nodes
- **End-to-End Flows**: Complete user journeys
- **Cross-Browser Testing**: Chrome, Firefox compatibility
- **Performance Testing**: Large document handling, multi-node latency

### **Security Testing**
- **Penetration Testing**: XSS, CSRF, injection attacks
- **Cryptographic Validation**: Key strength, encryption integrity
- **Storage Security**: Browser storage encryption
- **Communication Security**: PostMessage validation

## 🚀 Performance Requirements

### **Response Times**
- **Document Creation**: < 2 seconds
- **Document Retrieval**: < 1 second
- **Permission Grant**: < 500ms
- **UI Interactions**: < 100ms

### **Reliability**
- **Uptime**: 99.9% availability
- **Data Durability**: 99.999% (5 nines)
- **Failover Time**: < 5 seconds
- **Data Consistency**: Eventually consistent across nodes

## 🔄 Data Flow Diagrams

### **Document Creation Flow**
```
User Input → Validation → Encryption → Multi-Node Storage → UI Update
     ↓              ↓           ↓              ↓            ↓
  Form Data → Schema Check → AES-256 → nilDB Nodes → Success Message
```

### **Permission Grant Flow**
```
App Request → User Prompt → Permission Storage → App Notification
     ↓             ↓              ↓                 ↓
PostMessage → Popup UI → Encrypted Store → Success Response
```

## 📦 Deployment Architecture

### **Extension Package Structure**
```
pdm-extension/
├── manifest.json           # Extension configuration
├── popup.html             # Popup interface
├── dist/                  # Compiled JavaScript
│   ├── background.js      # Service worker
│   ├── content.js         # Content script
│   └── popup.js           # Popup interface
├── assets/                # Icons, images
└── docs/                  # Documentation
```

### **Build Pipeline**
1. **TypeScript Compilation**: Source → JavaScript
2. **React Bundling**: TSX → Optimized JS
3. **Asset Optimization**: Images, CSS minification
4. **Extension Packaging**: ZIP for distribution

## 🔒 Security Considerations

### **Threat Model**
- **Malicious Websites**: XSS attacks, data exfiltration
- **Browser Vulnerabilities**: Extension sandbox escapes
- **Network Attacks**: Man-in-the-middle, node compromise
- **Storage Attacks**: Local storage tampering

### **Mitigation Strategies**
- **Content Security Policy**: Strict CSP headers
- **Origin Validation**: Whitelist trusted domains
- **Encryption at Rest**: All stored data encrypted
- **Regular Security Audits**: Code reviews, penetration testing

## 📈 Scalability Considerations

### **Node Scaling**
- **Horizontal Scaling**: Add more nilDB nodes as needed
- **Load Balancing**: Distribute requests across nodes
- **Geographic Distribution**: Nodes in multiple regions
- **Auto-Scaling**: Dynamic node allocation based on load

### **Data Scaling**
- **Sharding Strategy**: Distribute data across node clusters
- **Caching Layer**: Redis for frequently accessed data
- **Compression**: Reduce storage and bandwidth requirements
- **Archival Strategy**: Move old data to cheaper storage

## 🎯 Success Metrics

### **User Experience**
- **Time to First Document**: < 30 seconds from install
- **Permission Grant Rate**: > 80% grant rate
- **User Retention**: > 70% weekly active users
- **Error Rate**: < 1% transaction failures

### **Technical Performance**
- **Node Uptime**: > 99.9% availability
- **Data Integrity**: 0 data corruption incidents
- **Response Time**: 95th percentile < 2 seconds
- **Concurrent Users**: Support 10,000+ simultaneous users

## 🗺 Implementation Roadmap

### **Phase 1: Foundation** (Days 1-3)
- Basic extension structure
- Identity management
- Nillion wallet integration

### **Phase 2: Core Features** (Days 4-12)
- Document CRUD operations
- Permission management
- Multi-node configuration
- UI implementation

### **Phase 3: Integration** (Days 13-18)
- PostMessage API
- Sample applications
- Security hardening
- Performance optimization

### **Phase 4: Polish** (Days 19-23)
- Documentation
- Video demo
- Testing and bug fixes
- Submission preparation

---

**This technical specification serves as the blueprint for building a production-ready PDM extension that leverages Nillion's infrastructure for real-world private data management.**