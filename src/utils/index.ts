// Utility functions and classes for PDM extension

export * from './identity';
export * from './nillion';
export * from './data';
export * from './permissions';
export * from './messaging';

// Core types and interfaces
export interface UserIdentity {
  did: string;
  createdAt: number;
  lastAccessed: number;
  preferences: {
    autoApproveKnownApps: boolean;
    sessionTimeout: number;
    encryptionLevel: 'low' | 'medium' | 'high';
  };
}

export interface NillionCredentials {
  apiKey: string;
  userId?: string;
  appId?: string;
  walletAddress?: string;
  privateKey?: string;
}

export interface StoredData {
  id: string;
  data: any;
  metadata: DocumentMetadata;
  permissions: PermissionConfig;
  createdAt: number;
  updatedAt: number;
}

export interface DocumentMetadata {
  owner: string;
  createdAt: number;
  updatedAt: number;
  lastAccessed?: number;
  contentType: string;
  size?: number;
  checksum?: string;
  [key: string]: any;
}

export interface PermissionConfig {
  read: string[];
  write: string[];
  delete: string[];
  share?: string[];
  admin?: string[];
  [key: string]: string[] | undefined;
}