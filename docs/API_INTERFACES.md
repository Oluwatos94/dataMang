# PDM API Interfaces & Component Contracts

## 🎯 Interface Design Overview

This document defines the complete API contracts for all PDM components, ensuring type safety, clear boundaries, and maintainable code. All interfaces follow TypeScript best practices with comprehensive error handling and validation.

## 📋 Core Type Definitions

### **Base Types & Enums**

```typescript
// Core enums
export enum AccessLevel {
  READ = 'read',
  FULL = 'full',
  ADMIN = 'admin'
}

export enum DocumentType {
  TEXT = 'text',
  JSON = 'json',
  BINARY = 'binary',
  STRUCTURED = 'structured'
}

export enum PermissionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPENDED = 'suspended'
}

export enum SecurityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Common result types
export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// Error types
export class PDMError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PDMError';
  }
}

export class SecurityError extends PDMError {
  constructor(message: string, details?: any) {
    super('SECURITY_ERROR', message, details);
    this.name = 'SecurityError';
  }
}

export class ValidationError extends PDMError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}
```

### **Identity & Authentication Types**

```typescript
export interface UserIdentity {
  did: string;
  publicKey: string;
  privateKey?: string; // Only available during creation, never stored
  createdAt: number;
  lastUsed: number;
}

export interface NillionWalletConnection {
  address: string;
  isConnected: boolean;
  balance?: number;
  networkId: string;
  apiKey?: string;
}

export interface APIKeyConfig {
  key: string;
  subscriptionId: string;
  expiresAt?: number;
  permissions: string[];
  isValid: boolean;
}
```

## 🔑 Identity Manager Interface

```typescript
export interface IIdentityManager {
  // Core identity operations
  generateDID(): Promise<OperationResult<string>>;
  getOrCreateIdentity(): Promise<OperationResult<UserIdentity>>;
  updateIdentity(updates: Partial<UserIdentity>): Promise<OperationResult<UserIdentity>>;
  deleteIdentity(): Promise<OperationResult<void>>;

  // Secure storage operations
  secureStore(key: string, value: any): Promise<OperationResult<void>>;
  secureRetrieve(key: string): Promise<OperationResult<any>>;
  secureDelete(key: string): Promise<OperationResult<void>>;
  listSecureKeys(): Promise<OperationResult<string[]>>;

  // Nillion wallet integration
  connectWallet(): Promise<OperationResult<NillionWalletConnection>>;
  disconnectWallet(): Promise<OperationResult<void>>;
  getWalletStatus(): Promise<OperationResult<NillionWalletConnection>>;

  // API key management
  storeAPIKey(config: APIKeyConfig): Promise<OperationResult<void>>;
  getAPIKey(): Promise<OperationResult<string>>;
  validateAPIKey(): Promise<OperationResult<boolean>>;
  refreshAPIKey(): Promise<OperationResult<string>>;

  // Cryptographic operations
  encryptData(data: string, keyId?: string): Promise<OperationResult<string>>;
  decryptData(encryptedData: string, keyId?: string): Promise<OperationResult<string>>;
  signData(data: string): Promise<OperationResult<string>>;
  verifySignature(data: string, signature: string): Promise<OperationResult<boolean>>;

  // Session management
  createSession(): Promise<OperationResult<string>>;
  validateSession(sessionId: string): Promise<OperationResult<boolean>>;
  endSession(sessionId?: string): Promise<OperationResult<void>>;
  endAllSessions(): Promise<OperationResult<void>>;
}

// Implementation class structure
export class IdentityManager implements IIdentityManager {
  private static instance: IdentityManager;
  private masterKey?: CryptoKey;
  private sessionKeys: Map<string, CryptoKey> = new Map();

  static getInstance(): IdentityManager {
    if (!IdentityManager.instance) {
      IdentityManager.instance = new IdentityManager();
    }
    return IdentityManager.instance;
  }

  // Implementation methods...
}
```

## 🌐 Nillion Manager Interface

```typescript
export interface NillionNodeConfig {
  url: string;
  nodeId: string;
  status: 'online' | 'offline' | 'degraded';
  lastChecked: number;
  responseTime: number;
  priority: number; // 1 = primary, 2 = backup, etc.
}

export interface CollectionConfig {
  id: string;
  name: string;
  schema: any;
  encryptionEnabled: boolean;
  replicationFactor: number;
  nodes: string[];
  createdAt: number;
}

export interface StoreOperation {
  collectionId: string;
  recordId: string;
  data: any;
  metadata?: any;
  encryptionKey?: string;
}

export interface RetrieveOperation {
  collectionId: string;
  recordId?: string;
  query?: any;
  limit?: number;
  offset?: number;
}

export interface INillionManager {
  // Node management
  addNode(config: NillionNodeConfig): Promise<OperationResult<void>>;
  removeNode(nodeId: string): Promise<OperationResult<void>>;
  getNodeStatus(nodeId?: string): Promise<OperationResult<NillionNodeConfig[]>>;
  checkNodeHealth(): Promise<OperationResult<Map<string, boolean>>>;
  selectOptimalNode(): Promise<OperationResult<NillionNodeConfig>>;

  // Client initialization
  initialize(apiKey: string): Promise<OperationResult<void>>;
  shutdown(): Promise<OperationResult<void>>;
  isInitialized(): boolean;
  getConnectionStatus(): Promise<OperationResult<'connected' | 'disconnected' | 'error'>>;

  // Collection management
  createCollection(config: Omit<CollectionConfig, 'id' | 'createdAt'>): Promise<OperationResult<string>>;
  getCollection(collectionId: string): Promise<OperationResult<CollectionConfig>>;
  updateCollection(collectionId: string, updates: Partial<CollectionConfig>): Promise<OperationResult<CollectionConfig>>;
  deleteCollection(collectionId: string): Promise<OperationResult<void>>;
  listCollections(): Promise<OperationResult<CollectionConfig[]>>;

  // Data operations
  storeData(operation: StoreOperation): Promise<OperationResult<string>>;
  retrieveData(operation: RetrieveOperation): Promise<OperationResult<any>>;
  updateData(collectionId: string, recordId: string, data: any): Promise<OperationResult<void>>;
  deleteData(collectionId: string, recordId: string): Promise<OperationResult<void>>;

  // Multi-node operations
  replicateData(data: any, nodes: string[]): Promise<OperationResult<Map<string, boolean>>>;
  syncNodes(): Promise<OperationResult<void>>;
  handleNodeFailover(failedNodeId: string): Promise<OperationResult<string>>;
  verifyDataConsistency(collectionId: string, recordId: string): Promise<OperationResult<boolean>>;

  // Query operations
  queryData(collectionId: string, query: any): Promise<OperationResult<any[]>>;
  searchData(collectionId: string, searchTerm: string): Promise<OperationResult<any[]>>;
  aggregateData(collectionId: string, aggregation: any): Promise<OperationResult<any>>;

  // Monitoring & diagnostics
  getMetrics(): Promise<OperationResult<any>>;
  getErrorLogs(): Promise<OperationResult<any[]>>;
  testConnection(nodeId?: string): Promise<OperationResult<boolean>>;
}

export class NillionManager implements INillionManager {
  private nodes: Map<string, NillionNodeConfig> = new Map();
  private client: any; // Secretvaults client
  private isConnected: boolean = false;

  // Implementation methods...
}
```

## 📄 Data Manager Interface

```typescript
export interface DocumentMetadata {
  id: string;
  name: string;
  description?: string;
  type: DocumentType;
  size: number;
  checksum: string;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tags: string[];
  securityLevel: SecurityLevel;
  encryptionStatus: 'encrypted' | 'plaintext';
}

export interface Document {
  metadata: DocumentMetadata;
  content: any;
  permissions: DocumentPermission[];
  auditLog: AuditEntry[];
}

export interface DocumentPermission {
  id: string;
  documentId: string;
  appOrigin: string;
  accessLevel: AccessLevel;
  grantedAt: number;
  expiresAt?: number;
  isActive: boolean;
  usageCount: number;
  maxUsage?: number;
}

export interface CreateDocumentRequest {
  name: string;
  content: any;
  type: DocumentType;
  description?: string;
  tags?: string[];
  securityLevel?: SecurityLevel;
  encryptionEnabled?: boolean;
}

export interface UpdateDocumentRequest {
  content?: any;
  metadata?: Partial<DocumentMetadata>;
}

export interface SearchQuery {
  term?: string;
  type?: DocumentType;
  tags?: string[];
  securityLevel?: SecurityLevel;
  dateRange?: {
    start: number;
    end: number;
  };
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'lastAccessedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface IDataManager {
  // Document CRUD operations
  createDocument(request: CreateDocumentRequest): Promise<OperationResult<Document>>;
  getDocument(id: string): Promise<OperationResult<Document>>;
  updateDocument(id: string, request: UpdateDocumentRequest): Promise<OperationResult<Document>>;
  deleteDocument(id: string): Promise<OperationResult<void>>;

  // Document listing and search
  listDocuments(pagination?: { page: number; pageSize: number }): Promise<OperationResult<PaginatedResult<DocumentMetadata>>>;
  searchDocuments(query: SearchQuery): Promise<OperationResult<DocumentMetadata[]>>;
  getDocumentsByTag(tag: string): Promise<OperationResult<DocumentMetadata[]>>;
  getDocumentsByType(type: DocumentType): Promise<OperationResult<DocumentMetadata[]>>;

  // Bulk operations
  createMultipleDocuments(requests: CreateDocumentRequest[]): Promise<OperationResult<Document[]>>;
  deleteMultipleDocuments(ids: string[]): Promise<OperationResult<void>>;
  exportDocuments(ids: string[], format: 'json' | 'csv' | 'xml'): Promise<OperationResult<string>>;
  importDocuments(data: string, format: 'json' | 'csv' | 'xml'): Promise<OperationResult<Document[]>>;

  // Document sharing and permissions
  shareDocument(documentId: string, permission: Omit<DocumentPermission, 'id' | 'documentId' | 'grantedAt'>): Promise<OperationResult<DocumentPermission>>;
  revokeDocumentAccess(documentId: string, appOrigin: string): Promise<OperationResult<void>>;
  getDocumentPermissions(documentId: string): Promise<OperationResult<DocumentPermission[]>>;

  // Document versioning
  createDocumentVersion(documentId: string, content: any): Promise<OperationResult<string>>;
  getDocumentVersions(documentId: string): Promise<OperationResult<any[]>>;
  restoreDocumentVersion(documentId: string, versionId: string): Promise<OperationResult<Document>>;

  // Document analytics
  getDocumentStats(): Promise<OperationResult<any>>;
  getAccessLogs(documentId?: string): Promise<OperationResult<AuditEntry[]>>;
  getUsageMetrics(): Promise<OperationResult<any>>;

  // Data validation and integrity
  validateDocument(document: Document): Promise<OperationResult<boolean>>;
  verifyDocumentIntegrity(documentId: string): Promise<OperationResult<boolean>>;
  repairCorruptedDocument(documentId: string): Promise<OperationResult<Document>>;
}

export class DataManager implements IDataManager {
  private documents: Map<string, Document> = new Map();
  private nillionManager: INillionManager;

  constructor(nillionManager: INillionManager) {
    this.nillionManager = nillionManager;
  }

  // Implementation methods...
}
```

## 🔐 Permission Manager Interface

```typescript
export interface Permission {
  id: string;
  userId: string;
  appOrigin: string;
  resourceId: string;
  resourceType: 'document' | 'collection' | 'system';
  accessLevel: AccessLevel;
  grantedAt: number;
  grantedBy: string;
  expiresAt?: number;
  lastUsed?: number;
  usageCount: number;
  maxUsage?: number;
  status: PermissionStatus;
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'time_range' | 'ip_whitelist' | 'user_agent' | 'custom';
  value: any;
  isActive: boolean;
}

export interface PermissionRequest {
  appOrigin: string;
  resourceId: string;
  resourceType: 'document' | 'collection' | 'system';
  accessLevel: AccessLevel;
  reason?: string;
  requestedDuration?: number;
  conditions?: PermissionCondition[];
}

export interface PermissionGrant {
  permissionId: string;
  grantedAt: number;
  expiresAt?: number;
  conditions?: PermissionCondition[];
}

export interface AccessRequest {
  appOrigin: string;
  resourceId: string;
  requestedOperation: 'read' | 'write' | 'delete' | 'share';
  context?: any;
}

export interface AccessResponse {
  granted: boolean;
  accessLevel?: AccessLevel;
  restrictions?: any;
  expiresAt?: number;
  reason?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: number;
  userId: string;
  appOrigin: string;
  action: string;
  resourceId: string;
  resourceType: string;
  result: 'success' | 'failure' | 'denied';
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface IPermissionManager {
  // Permission granting and revocation
  grantPermission(request: PermissionRequest): Promise<OperationResult<Permission>>;
  revokePermission(permissionId: string): Promise<OperationResult<void>>;
  revokeAllPermissions(appOrigin: string): Promise<OperationResult<void>>;
  updatePermission(permissionId: string, updates: Partial<Permission>): Promise<OperationResult<Permission>>;

  // Permission queries
  getPermission(permissionId: string): Promise<OperationResult<Permission>>;
  getPermissionsByApp(appOrigin: string): Promise<OperationResult<Permission[]>>;
  getPermissionsByResource(resourceId: string): Promise<OperationResult<Permission[]>>;
  listAllPermissions(): Promise<OperationResult<Permission[]>>;

  // Access control
  checkAccess(request: AccessRequest): Promise<OperationResult<AccessResponse>>;
  validatePermission(permissionId: string, context?: any): Promise<OperationResult<boolean>>;
  refreshPermission(permissionId: string): Promise<OperationResult<Permission>>;

  // Bulk operations
  grantMultiplePermissions(requests: PermissionRequest[]): Promise<OperationResult<Permission[]>>;
  revokeMultiplePermissions(permissionIds: string[]): Promise<OperationResult<void>>;
  bulkUpdatePermissions(updates: Array<{ id: string; updates: Partial<Permission> }>): Promise<OperationResult<Permission[]>>;

  // Permission templates and policies
  createPermissionTemplate(template: any): Promise<OperationResult<string>>;
  applyPermissionTemplate(templateId: string, context: any): Promise<OperationResult<Permission>>;
  setPermissionPolicy(policy: any): Promise<OperationResult<void>>;
  evaluatePermissionPolicy(request: PermissionRequest): Promise<OperationResult<boolean>>;

  // Audit and monitoring
  logAccess(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<OperationResult<void>>;
  getAuditLog(filters?: any): Promise<OperationResult<AuditEntry[]>>;
  getPermissionStats(): Promise<OperationResult<any>>;
  detectAnomalousAccess(): Promise<OperationResult<AuditEntry[]>>;

  // Permission lifecycle
  cleanupExpiredPermissions(): Promise<OperationResult<number>>;
  renewPermission(permissionId: string, duration: number): Promise<OperationResult<Permission>>;
  transferPermission(permissionId: string, newAppOrigin: string): Promise<OperationResult<Permission>>;

  // User consent management
  requestUserConsent(request: PermissionRequest): Promise<OperationResult<boolean>>;
  getUserConsent(appOrigin: string): Promise<OperationResult<any>>;
  revokeUserConsent(appOrigin: string): Promise<OperationResult<void>>;
}

export class PermissionManager implements IPermissionManager {
  private permissions: Map<string, Permission> = new Map();
  private auditLog: AuditEntry[] = [];
  private policies: any[] = [];

  // Implementation methods...
}
```

## 📡 Message Handler Interface

```typescript
export interface PDMMessage {
  id: string;
  type: 'request' | 'response' | 'notification' | 'error';
  method: string;
  payload: any;
  timestamp: number;
  origin: string;
  correlationId?: string;
  signature?: string;
  nonce?: string;
}

export interface MessageContext {
  sender: chrome.runtime.MessageSender;
  origin: string;
  timestamp: number;
  sessionId?: string;
}

export interface RequestHandler {
  method: string;
  handler: (payload: any, context: MessageContext) => Promise<any>;
  permissions?: AccessLevel[];
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export interface IMessageHandler {
  // Message handling
  handleMessage(message: PDMMessage, context: MessageContext): Promise<OperationResult<any>>;
  sendMessage(target: 'background' | 'content' | 'popup', message: PDMMessage): Promise<OperationResult<any>>;
  broadcastMessage(message: PDMMessage, targets?: string[]): Promise<OperationResult<void>>;

  // Request/response handling
  registerHandler(handler: RequestHandler): void;
  unregisterHandler(method: string): void;
  makeRequest(method: string, payload: any, target?: string): Promise<OperationResult<any>>;

  // User consent management
  requestUserConsent(appOrigin: string, request: PermissionRequest): Promise<OperationResult<boolean>>;
  showPermissionPrompt(request: PermissionRequest): Promise<OperationResult<PermissionGrant | null>>;

  // Security and validation
  validateMessage(message: PDMMessage): boolean;
  signMessage(message: PDMMessage): Promise<string>;
  verifyMessageSignature(message: PDMMessage): Promise<boolean>;
  validateOrigin(origin: string): boolean;

  // Rate limiting and throttling
  checkRateLimit(origin: string, method: string): Promise<boolean>;
  updateRateLimit(origin: string, method: string): Promise<void>;

  // Event handling
  addEventListener(event: string, handler: Function): void;
  removeEventListener(event: string, handler: Function): void;
  emitEvent(event: string, data: any): void;
}

export class MessageHandler implements IMessageHandler {
  private handlers: Map<string, RequestHandler> = new Map();
  private rateLimits: Map<string, any> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  // Implementation methods...
}
```

## 🖥 User Interface Interfaces

```typescript
export interface UIComponent {
  render(): void;
  destroy(): void;
  update(data?: any): void;
  addEventListener(event: string, handler: Function): void;
}

export interface PopupState {
  activeTab: 'documents' | 'permissions' | 'settings';
  selectedDocument?: string;
  searchQuery?: string;
  isLoading: boolean;
  error?: string;
}

export interface DocumentListProps {
  documents: DocumentMetadata[];
  onSelect: (documentId: string) => void;
  onDelete: (documentId: string) => void;
  onShare: (documentId: string) => void;
  isLoading?: boolean;
}

export interface PermissionListProps {
  permissions: Permission[];
  onRevoke: (permissionId: string) => void;
  onUpdate: (permissionId: string, updates: Partial<Permission>) => void;
  isLoading?: boolean;
}

export interface CreateDocumentFormData {
  name: string;
  content: string;
  type: DocumentType;
  description?: string;
  tags: string[];
  securityLevel: SecurityLevel;
}

export interface IPopupController {
  // State management
  getState(): PopupState;
  updateState(updates: Partial<PopupState>): void;
  resetState(): void;

  // Document operations
  createDocument(data: CreateDocumentFormData): Promise<OperationResult<Document>>;
  loadDocuments(): Promise<OperationResult<DocumentMetadata[]>>;
  deleteDocument(documentId: string): Promise<OperationResult<void>>;
  shareDocument(documentId: string, appOrigin: string, accessLevel: AccessLevel): Promise<OperationResult<void>>;

  // Permission operations
  loadPermissions(): Promise<OperationResult<Permission[]>>;
  revokePermission(permissionId: string): Promise<OperationResult<void>>;
  updatePermission(permissionId: string, updates: Partial<Permission>): Promise<OperationResult<void>>;

  // Settings operations
  updateSettings(settings: any): Promise<OperationResult<void>>;
  exportData(): Promise<OperationResult<string>>;
  importData(data: string): Promise<OperationResult<void>>;

  // UI helpers
  showNotification(message: string, type: 'success' | 'error' | 'warning'): void;
  showConfirmDialog(message: string): Promise<boolean>;
  showPermissionDialog(request: PermissionRequest): Promise<PermissionGrant | null>;
}
```

## 🌐 Public API for Web Applications

```typescript
// Global API exposed to web applications via content script
export interface PDMPublicAPI {
  // Document operations
  requestAccess(documentId: string, accessLevel: AccessLevel): Promise<AccessResponse>;
  getData(documentId: string): Promise<any>;
  createDocument(name: string, content: any): Promise<string>;
  updateDocument(documentId: string, content: any): Promise<void>;

  // Permission management
  checkPermission(documentId: string): Promise<Permission | null>;
  requestBulkAccess(requests: AccessRequest[]): Promise<AccessResponse[]>;

  // Event handling
  addEventListener(event: 'permissionGranted' | 'permissionRevoked' | 'dataUpdated', handler: Function): void;
  removeEventListener(event: string, handler: Function): void;

  // Utility functions
  isAvailable(): boolean;
  getVersion(): string;
  getCapabilities(): string[];
}

// Content script injection
declare global {
  interface Window {
    PDM: PDMPublicAPI;
  }
}
```

## 🧪 Testing Interfaces

```typescript
export interface TestSuite {
  name: string;
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface TestCase {
  name: string;
  test: () => Promise<void>;
  timeout?: number;
  skip?: boolean;
}

export interface MockConfig {
  component: string;
  methods: Array<{
    method: string;
    returnValue?: any;
    implementation?: Function;
  }>;
}

export interface ITestRunner {
  runSuite(suite: TestSuite): Promise<TestResult>;
  runAllSuites(): Promise<TestResult[]>;
  setupMocks(configs: MockConfig[]): void;
  teardownMocks(): void;
}

export interface TestResult {
  suiteName: string;
  passed: number;
  failed: number;
  errors: Array<{
    testName: string;
    error: Error;
  }>;
  duration: number;
}
```

## 📋 Implementation Guidelines

### **Interface Design Principles:**
1. **Type Safety**: All interfaces use strict TypeScript typing
2. **Error Handling**: Consistent `OperationResult<T>` pattern
3. **Async Operations**: All I/O operations return Promises
4. **Pagination**: Large datasets use `PaginatedResult<T>`
5. **Validation**: Input validation at interface boundaries

### **Security Considerations:**
- All sensitive operations require authentication
- Permission validation on every request
- Rate limiting for public API methods
- Input sanitization and validation
- Secure message passing between components

### **Performance Optimizations:**
- Lazy loading for large datasets
- Caching strategies for frequently accessed data
- Async operations to prevent UI blocking
- Efficient data structures for lookups
- Connection pooling for external services

These API interfaces provide a comprehensive contract system that ensures type safety, clear component boundaries, and maintainable code throughout the PDM extension.