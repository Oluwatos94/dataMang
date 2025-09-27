// Test setup and utilities for PDM Extension

// Mock function type for Bun testing
type MockFunction = {
  (): any;
  mockResolvedValue: (value: any) => MockFunction;
  mockReturnValue: (value: any) => MockFunction;
  mockImplementation: (fn: Function) => MockFunction;
};

// Create mock function
function createMockFunction(): MockFunction {
  const fn = (() => {}) as MockFunction;
  fn.mockResolvedValue = (value: any) => {
    Object.assign(fn, () => Promise.resolve(value));
    return fn;
  };
  fn.mockReturnValue = (value: any) => {
    Object.assign(fn, () => value);
    return fn;
  };
  fn.mockImplementation = (implementation: Function) => {
    Object.assign(fn, implementation);
    return fn;
  };
  return fn;
}

// Test environment setup
export function setupTestEnvironment() {
  // Mock Chrome APIs
  (global as any).chrome = {
    storage: {
      local: {
        get: createMockFunction(),
        set: createMockFunction(),
        remove: createMockFunction(),
        clear: createMockFunction(),
      },
    },
    runtime: {
      sendMessage: createMockFunction(),
      onMessage: {
        addListener: createMockFunction(),
        removeListener: createMockFunction(),
      },
      getURL: createMockFunction(),
      id: 'test-extension-id',
    },
    tabs: {
      query: createMockFunction(),
      sendMessage: createMockFunction(),
    },
  };

  // Mock crypto APIs
  if (!global.crypto) {
    (global as any).crypto = {
      getRandomValues: (array: any) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      },
      subtle: {
        encrypt: createMockFunction(),
        decrypt: createMockFunction(),
        generateKey: createMockFunction(),
        importKey: createMockFunction(),
        exportKey: createMockFunction(),
        deriveKey: createMockFunction(),
        deriveBits: createMockFunction(),
        sign: createMockFunction(),
        verify: createMockFunction(),
      },
    };
  }

  // Mock DOM APIs
  (global as any).document = {
    createElement: createMockFunction(),
    getElementById: createMockFunction(),
    addEventListener: createMockFunction(),
    removeEventListener: createMockFunction(),
  };

  (global as any).window = {
    addEventListener: createMockFunction(),
    removeEventListener: createMockFunction(),
    postMessage: createMockFunction(),
    location: { origin: 'https://test.example.com' },
  };
}

export function cleanupTestEnvironment() {
  // Cleanup global mocks - no action needed for simple mocks
}

export function resetTestState() {
  // Reset any global state - no action needed for simple mocks
}

export function cleanupTestState() {
  // Cleanup after individual tests - no action needed for simple mocks
}

// Test utilities
export const TestUtils = {
  // Create mock user identity
  createMockIdentity: () => ({
    did: 'did:test:123456789',
    publicKey: 'mock-public-key',
    createdAt: Date.now(),
    lastUsed: Date.now(),
  }),

  // Create mock document
  createMockDocument: () => ({
    metadata: {
      id: 'doc-' + Math.random().toString(36).substr(2, 9),
      name: 'Test Document',
      type: 'text',
      size: 1024,
      checksum: 'mock-checksum',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 0,
      tags: ['test'],
      securityLevel: 'medium',
      encryptionStatus: 'encrypted',
    },
    content: 'Test document content',
    permissions: [],
    auditLog: [],
  }),

  // Create mock permission
  createMockPermission: () => ({
    id: 'perm-' + Math.random().toString(36).substr(2, 9),
    userId: 'did:test:123456789',
    appOrigin: 'https://test.example.com',
    resourceId: 'doc-123',
    resourceType: 'document',
    accessLevel: 'read',
    grantedAt: Date.now(),
    grantedBy: 'user',
    lastUsed: Date.now(),
    usageCount: 0,
    status: 'active',
  }),

  // Create mock operation result
  createMockResult: <T>(data: T, success = true) => ({
    success,
    data: success ? data : undefined,
    error: success ? undefined : { code: 'TEST_ERROR', message: 'Test error' },
    timestamp: Date.now(),
  }),

  // Wait for async operations
  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random string
  randomString: (length = 10) => Math.random().toString(36).substr(2, length),
};

// Mock implementations
export const MockImplementations = {
  // Mock IdentityManager
  createMockIdentityManager: () => ({
    generateDID: createMockFunction().mockResolvedValue(TestUtils.createMockResult('did:test:123')),
    getOrCreateIdentity: createMockFunction().mockResolvedValue(
      TestUtils.createMockResult(TestUtils.createMockIdentity())
    ),
    secureStore: createMockFunction().mockResolvedValue(TestUtils.createMockResult(undefined)),
    secureRetrieve: createMockFunction().mockResolvedValue(TestUtils.createMockResult('mock-data')),
  }),

  // Mock DataManager
  createMockDataManager: () => ({
    createDocument: createMockFunction().mockResolvedValue(
      TestUtils.createMockResult(TestUtils.createMockDocument())
    ),
    getDocument: createMockFunction().mockResolvedValue(
      TestUtils.createMockResult(TestUtils.createMockDocument())
    ),
    listDocuments: createMockFunction().mockResolvedValue(
      TestUtils.createMockResult([TestUtils.createMockDocument()])
    ),
    deleteDocument: createMockFunction().mockResolvedValue(TestUtils.createMockResult(undefined)),
  }),

  // Mock PermissionManager
  createMockPermissionManager: () => ({
    grantPermission: createMockFunction().mockResolvedValue(
      TestUtils.createMockResult(TestUtils.createMockPermission())
    ),
    revokePermission: createMockFunction().mockResolvedValue(TestUtils.createMockResult(undefined)),
    checkAccess: createMockFunction().mockResolvedValue(
      TestUtils.createMockResult({ granted: true, accessLevel: 'read' })
    ),
    listAllPermissions: createMockFunction().mockResolvedValue(
      TestUtils.createMockResult([TestUtils.createMockPermission()])
    ),
  }),

  // Mock NillionManager
  createMockNillionManager: () => ({
    initialize: createMockFunction().mockResolvedValue(TestUtils.createMockResult(undefined)),
    createCollection: createMockFunction().mockResolvedValue(TestUtils.createMockResult('collection-123')),
    storeData: createMockFunction().mockResolvedValue(TestUtils.createMockResult('record-123')),
    retrieveData: createMockFunction().mockResolvedValue(TestUtils.createMockResult({ data: 'test' })),
    getNodeStatus: createMockFunction().mockResolvedValue(TestUtils.createMockResult([])),
  }),
};

export default TestUtils;