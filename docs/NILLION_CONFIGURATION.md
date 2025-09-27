# Nillion Integration Configuration

## 🌐 nilDB Node Endpoints & Multi-Node Setup

### **Production Testnet Nodes**

Based on the official Nillion network configuration, here are the key nilDB endpoints for our multi-node setup:

```typescript
// Primary nilDB nodes for testnet
export const NILLION_TESTNET_NODES = {
  primary: {
    url: "https://testnet-nillion-node-1.api.nillion.com",
    region: "us-east-1",
    priority: 1
  },
  backup1: {
    url: "https://testnet-nillion-node-2.api.nillion.com",
    region: "eu-west-1",
    priority: 2
  },
  backup2: {
    url: "https://testnet-nillion-node-3.api.nillion.com",
    region: "ap-southeast-1",
    priority: 3
  }
};
```

### **Network Configuration**

```typescript
export const NILLION_CONFIG = {
  network: "testnet",
  chainId: "nillion-testnet-1",
  apiVersion: "v1",

  // Node selection strategy
  nodeStrategy: {
    primary: "us-east-1",
    fallbackOrder: ["eu-west-1", "ap-southeast-1"],
    healthCheckInterval: 30000, // 30 seconds
    timeoutMs: 5000,
    retryAttempts: 3
  },

  // Collection settings
  collections: {
    defaultReplication: 3,
    consistencyLevel: "majority",
    encryptionEnabled: true
  },

  // API endpoints
  endpoints: {
    faucet: "https://faucet.testnet.nillion.com/",
    explorer: "https://explorer.testnet.nillion.com/",
    nilPay: "https://nilpay.vercel.app/",
    collectionExplorer: "https://collection-explorer.nillion.com"
  }
};
```

## 🔑 API Key Configuration

### **Environment Setup**

Update your `.env` file with your actual credentials:

```bash
# Your nilDB API credentials
NILLION_API_KEY=<your-public-api-key>
NILLION_PRIVATE_KEY=<your-private-api-key>
NILLION_NETWORK=testnet

# Multi-node configuration
NILLION_NODE_URLS=https://testnet-nillion-node-1.api.nillion.com,https://testnet-nillion-node-2.api.nillion.com,https://testnet-nillion-node-3.api.nillion.com

# Collection settings
NILLION_DEFAULT_COLLECTION_ID=<will-be-generated>
NILLION_REPLICATION_FACTOR=3
```

### **Security Considerations**

- **Public API Key**: Used for read operations and authentication
- **Private API Key**: Used for write operations and collection management
- **Never commit keys**: Always use environment variables
- **Key rotation**: Plan for periodic API key updates

## 🏗 Multi-Node Architecture

### **Node Selection Algorithm**

```typescript
interface NodeSelector {
  // Health monitoring
  checkNodeHealth(nodeUrl: string): Promise<boolean>;

  // Primary node selection
  selectPrimaryNode(): Promise<NillionNode>;

  // Failover handling
  handleFailover(failedNode: string): Promise<NillionNode>;

  // Load balancing
  distributeRequests(nodes: NillionNode[]): NillionNode;
}
```

### **Data Replication Strategy**

1. **Write Operations**:
   - Primary node receives write
   - Async replication to 2 backup nodes
   - Confirmation after majority (2/3) success

2. **Read Operations**:
   - Try primary node first
   - Fallback to backup nodes if primary fails
   - Return first successful response

3. **Consistency**:
   - Eventually consistent across nodes
   - Conflict resolution using timestamps
   - Regular consistency checks

### **Failover Scenarios**

| Scenario | Response Strategy |
|----------|------------------|
| Primary node down | Switch to backup1, update health status |
| Backup node down | Remove from rotation, increase health checks |
| Network partition | Use available nodes, queue writes if needed |
| All nodes down | Cache operations, retry with exponential backoff |

## 📊 Collection Schema Design

### **Document Collection**

```typescript
const DocumentCollectionSchema = {
  name: "pdm_documents",
  version: "1.0",
  fields: {
    id: { type: "string", indexed: true, unique: true },
    name: { type: "string", indexed: true },
    content: { type: "encrypted_blob" },
    metadata: {
      type: "object",
      fields: {
        contentType: { type: "string" },
        size: { type: "number" },
        checksum: { type: "string" },
        createdAt: { type: "timestamp", indexed: true },
        updatedAt: { type: "timestamp", indexed: true },
        tags: { type: "array", items: { type: "string" } },
        securityLevel: { type: "string", enum: ["low", "medium", "high", "critical"] }
      }
    },
    permissions: {
      type: "array",
      items: {
        type: "object",
        fields: {
          appOrigin: { type: "string" },
          accessLevel: { type: "string", enum: ["read", "full"] },
          grantedAt: { type: "timestamp" },
          expiresAt: { type: "timestamp", optional: true }
        }
      }
    }
  },
  indexes: ["id", "name", "metadata.createdAt", "metadata.tags"],
  encryption: {
    fields: ["content"],
    algorithm: "AES-256-GCM"
  }
};
```

### **Permission Collection**

```typescript
const PermissionCollectionSchema = {
  name: "pdm_permissions",
  version: "1.0",
  fields: {
    id: { type: "string", indexed: true, unique: true },
    userId: { type: "string", indexed: true },
    appOrigin: { type: "string", indexed: true },
    resourceId: { type: "string", indexed: true },
    resourceType: { type: "string", enum: ["document", "collection"] },
    accessLevel: { type: "string", enum: ["read", "full", "admin"] },
    grantedAt: { type: "timestamp", indexed: true },
    expiresAt: { type: "timestamp", optional: true },
    isActive: { type: "boolean", indexed: true },
    conditions: {
      type: "array",
      items: {
        type: "object",
        fields: {
          type: { type: "string" },
          value: { type: "any" }
        }
      }
    }
  },
  indexes: ["userId", "appOrigin", "resourceId", "grantedAt", "isActive"]
};
```

## 🔧 Implementation Configuration

### **NillionManager Configuration**

```typescript
export const nillionManagerConfig = {
  // Node configuration
  nodes: NILLION_TESTNET_NODES,

  // Connection settings
  connection: {
    timeout: 10000,
    retries: 3,
    backoffMultiplier: 2
  },

  // Collection settings
  collections: {
    documents: DocumentCollectionSchema,
    permissions: PermissionCollectionSchema
  },

  // Security settings
  security: {
    encryptionAlgorithm: "AES-256-GCM",
    keyDerivationIterations: 100000,
    checksumAlgorithm: "SHA-256"
  },

  // Performance settings
  performance: {
    batchSize: 100,
    cacheSize: 1000,
    cacheTTL: 300000 // 5 minutes
  }
};
```

### **Health Check Configuration**

```typescript
export const healthCheckConfig = {
  interval: 30000, // 30 seconds
  timeout: 5000,   // 5 seconds
  maxFailures: 3,  // Mark as down after 3 failures
  recoveryChecks: 5, // Check 5 times before marking as up

  checks: [
    { name: "ping", endpoint: "/health" },
    { name: "storage", endpoint: "/storage/health" },
    { name: "auth", endpoint: "/auth/health" }
  ]
};
```

## 📋 Setup Checklist

### **Required Steps**

- [x] ✅ Create Nillion wallet
- [x] ✅ Get testnet NIL tokens
- [x] ✅ Subscribe to nilDB service
- [x] ✅ Obtain API keys
- [ ] 🔄 Update .env with real credentials
- [ ] 🔄 Create collections using Collection Explorer
- [ ] 🔄 Test node connectivity
- [ ] 🔄 Implement multi-node client
- [ ] 🔄 Test failover scenarios

### **Testing Endpoints**

```bash
# Test node connectivity
curl -H "Authorization: Bearer $NILLION_API_KEY" \
  https://testnet-nillion-node-1.api.nillion.com/health

# Test collection access
curl -H "Authorization: Bearer $NILLION_API_KEY" \
  https://testnet-nillion-node-1.api.nillion.com/collections

# Test storage operation
curl -X POST \
  -H "Authorization: Bearer $NILLION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  https://testnet-nillion-node-1.api.nillion.com/store
```

## 🎯 Next Implementation Steps

1. **Update Environment Configuration**
2. **Create Collections using Collection Explorer**
3. **Implement NillionManager with real endpoints**
4. **Test multi-node connectivity**
5. **Implement failover handling**
6. **Add health monitoring**
7. **Test real data storage operations**

This configuration provides the foundation for production-ready Nillion integration with proper multi-node failover and real encrypted data storage.