import type { StoredData, DocumentMetadata } from './index';
import { NillionManager } from './nillion';
import { IdentityManager } from './identity';

export interface Document {
  id: string;
  title: string;
  content: any;
  type: 'text' | 'json' | 'binary' | 'image' | 'file';
  metadata: DocumentMetadata;
  tags: string[];
  encrypted: boolean;
  version: number;
  size: number;
  checksum: string;
}

export interface SearchQuery {
  title?: string;
  tags?: string[];
  type?: string;
  dateRange?: {
    from: number;
    to: number;
  };
  metadata?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface DocumentVersion {
  version: number;
  content: any;
  metadata: DocumentMetadata;
  timestamp: number;
  checksum: string;
}

export class DataManager {
  private static instance: DataManager;
  private nillionManager: NillionManager;
  private identityManager: IdentityManager;
  private documentCache: Map<string, Document> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  private constructor() {
    this.nillionManager = NillionManager.getInstance();
    this.identityManager = IdentityManager.getInstance();
  }

  private async calculateChecksum(content: any): Promise<string> {
    const serialized = typeof content === 'string' ? content : JSON.stringify(content);
    const encoder = new TextEncoder();
    const data = encoder.encode(serialized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private calculateSize(content: any): number {
    const serialized = typeof content === 'string' ? content : JSON.stringify(content);
    return new Blob([serialized]).size;
  }

  private manageCacheSize(): void {
    if (this.documentCache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.documentCache.entries());
      const sortedEntries = entries.sort((a, b) =>
        (a[1].metadata.lastAccessed || 0) - (b[1].metadata.lastAccessed || 0)
      );

      const toRemove = sortedEntries.slice(0, this.documentCache.size - this.MAX_CACHE_SIZE);
      toRemove.forEach(([id]) => this.documentCache.delete(id));
    }
  }

  async createDocument(
    title: string,
    content: any,
    type: Document['type'] = 'text',
    tags: string[] = [],
    metadata: Partial<DocumentMetadata> = {}
  ): Promise<string> {
    const did = await this.identityManager.getDID();
    if (!did) {
      throw new Error('No active session');
    }

    const now = Date.now();
    const checksum = await this.calculateChecksum(content);
    const size = this.calculateSize(content);

    const document: Document = {
      id: '', // Will be set by Nillion
      title,
      content,
      type,
      tags,
      encrypted: false,
      version: 1,
      size,
      checksum,
      metadata: {
        owner: did,
        createdAt: now,
        updatedAt: now,
        lastAccessed: now,
        contentType: type,
        ...metadata
      }
    };

    try {
      // App must provide collectionId via metadata
      const collectionId = (metadata as any).collectionId || (metadata as any).collection;
      if (!collectionId) {
        throw new Error('collectionId must be provided in metadata by the app');
      }

      const documentId = await this.nillionManager.storeData(document, {
        collectionId, // Pass app-provided collection
        title,
        type,
        tags: tags.join(','),
        size,
        checksum,
        version: 1
      });

      document.id = documentId;
      this.documentCache.set(documentId, document);
      this.manageCacheSize();

      return documentId;
    } catch (error) {
      throw new Error(`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocument(documentId: string): Promise<Document | null> {
    // Check cache first
    const cached = this.documentCache.get(documentId);
    if (cached && cached.metadata.lastAccessed &&
        (Date.now() - cached.metadata.lastAccessed) < this.CACHE_TTL) {
      cached.metadata.lastAccessed = Date.now();
      return cached;
    }

    try {
      const storedData = await this.nillionManager.retrieveData(documentId);
      if (!storedData) {
        return null;
      }

      const document: Document = {
        id: documentId,
        title: storedData.data.title,
        content: storedData.data.content,
        type: storedData.data.type,
        tags: storedData.data.tags || [],
        encrypted: storedData.data.encrypted || false,
        version: storedData.data.version || 1,
        size: storedData.data.size || 0,
        checksum: storedData.data.checksum || '',
        metadata: {
          ...storedData.data.metadata,
          lastAccessed: Date.now()
        }
      };

      this.documentCache.set(documentId, document);
      this.manageCacheSize();

      return document;
    } catch (error) {
      throw new Error(`Failed to retrieve document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // async updateDocument(
  //   documentId: string,
  //   updates: Partial<Pick<Document, 'title' | 'content' | 'tags'>>
  // ): Promise<void> {
  //   const document = await this.getDocument(documentId);
  //   if (!document) {
  //     throw new Error('Document not found');
  //   }

  //   const did = await this.identityManager.getDID();
  //   if (!did || document.metadata.owner !== did) {
  //     throw new Error('Unauthorized: You can only update your own documents');
  //   }

  //   const now = Date.now();
  //   const updatedDocument: Document = {
  //     ...document,
  //     ...updates,
  //     version: document.version + 1,
  //     metadata: {
  //       ...document.metadata,
  //       updatedAt: now,
  //       lastAccessed: now
  //     }
  //   };

  //   if (updates.content) {
  //     updatedDocument.checksum = await this.calculateChecksum(updates.content);
  //     updatedDocument.size = this.calculateSize(updates.content);
  //   }

  //   try {
  //     await this.nillionManager.updateData(documentId, updatedDocument, {
  //       title: updatedDocument.title,
  //       type: updatedDocument.type,
  //       tags: updatedDocument.tags.join(','),
  //       size: updatedDocument.size,
  //       checksum: updatedDocument.checksum,
  //       version: updatedDocument.version
  //     });

  //     this.documentCache.set(documentId, updatedDocument);
  //   } catch (error) {
  //     throw new Error(`Failed to update document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //   }
  // }

  async deleteDocument(documentId: string): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const did = await this.identityManager.getDID();
    if (!did || document.metadata.owner !== did) {
      throw new Error('Unauthorized: You can only delete your own documents');
    }

    try {
      await this.nillionManager.deleteData(documentId);
      this.documentCache.delete(documentId);
    } catch (error) {
      throw new Error(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchDocuments(query: SearchQuery): Promise<Document[]> {
    try {
      // Check if Nillion is initialized
      if (!this.nillionManager.isInitialized()) {
        console.warn('DataManager: Nillion not initialized, returning empty results');
        return [];
      }

      const allData = await this.nillionManager.listUserData();
      let results = allData.map(data => ({
        id: data.id,
        title: data.data.title,
        content: data.data.content,
        type: data.data.type,
        tags: data.data.tags || [],
        encrypted: data.data.encrypted || false,
        version: data.data.version || 1,
        size: data.data.size || 0,
        checksum: data.data.checksum || '',
        metadata: data.data.metadata
      })) as Document[];

      // Apply filters
      if (query.title) {
        results = results.filter(doc =>
          doc.title.toLowerCase().includes(query.title!.toLowerCase())
        );
      }

      if (query.type) {
        results = results.filter(doc => doc.type === query.type);
      }

      if (query.tags && query.tags.length > 0) {
        results = results.filter(doc =>
          query.tags!.some(tag => doc.tags.includes(tag))
        );
      }

      if (query.dateRange) {
        results = results.filter(doc =>
          doc.metadata.createdAt >= query.dateRange!.from &&
          doc.metadata.createdAt <= query.dateRange!.to
        );
      }

      if (query.metadata) {
        results = results.filter(doc => {
          return Object.entries(query.metadata!).every(([key, value]) =>
            doc.metadata[key] === value
          );
        });
      }

      // Sort by last updated, most recent first
      results.sort((a, b) => (b.metadata.updatedAt || 0) - (a.metadata.updatedAt || 0));

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || results.length;

      return results.slice(offset, offset + limit);
    } catch (error) {
      throw new Error(`Failed to search documents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async shareDocument(documentId: string, targetDid: string, permissions: string[]): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const did = await this.identityManager.getDID();
    if (!did || document.metadata.owner !== did) {
      throw new Error('Unauthorized: You can only share your own documents');
    }

    try {
      await this.nillionManager.grantPermission(documentId, targetDid, permissions);
    } catch (error) {
      throw new Error(`Failed to share document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async unshareDocument(documentId: string, targetDid: string): Promise<void> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const did = await this.identityManager.getDID();
    if (!did || document.metadata.owner !== did) {
      throw new Error('Unauthorized: You can only unshare your own documents');
    }

    try {
      await this.nillionManager.revokePermission(documentId, targetDid);
    } catch (error) {
      throw new Error(`Failed to unshare document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getDocumentPermissions(documentId: string): Promise<any> {
    try {
      return await this.nillionManager.getPermissions(documentId);
    } catch (error) {
      throw new Error(`Failed to get document permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async duplicateDocument(documentId: string, newTitle?: string): Promise<string> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    return await this.createDocument(
      newTitle || `Copy of ${document.title}`,
      document.content,
      document.type,
      document.tags,
      {
        originalDocumentId: documentId,
        duplicatedAt: Date.now()
      }
    );
  }

  async getDocumentsByTag(tag: string): Promise<Document[]> {
    return await this.searchDocuments({ tags: [tag] });
  }

  async getDocumentsByType(type: string): Promise<Document[]> {
    return await this.searchDocuments({ type });
  }

  async getRecentDocuments(limit: number = 10): Promise<Document[]> {
    return await this.searchDocuments({ limit });
  }

  async validateDocument(documentId: string): Promise<boolean> {
    const document = await this.getDocument(documentId);
    if (!document) {
      return false;
    }

    const currentChecksum = await this.calculateChecksum(document.content);
    return currentChecksum === document.checksum;
  }

  getDocumentStats(): { totalCached: number; cacheHitRate: number } {
    return {
      totalCached: this.documentCache.size,
      cacheHitRate: 0 // Would need to track cache hits/misses
    };
  }

  clearCache(): void {
    this.documentCache.clear();
  }

  async exportDocument(documentId: string): Promise<string> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found');
    }

    const exportData = {
      document,
      exportedAt: Date.now(),
      exportedBy: await this.identityManager.getDID()
    };

    return btoa(JSON.stringify(exportData));
  }

  async importDocument(exportedData: string): Promise<string> {
    const data = JSON.parse(atob(exportedData));
    const document = data.document;

    return await this.createDocument(
      `Imported: ${document.title}`,
      document.content,
      document.type,
      document.tags,
      {
        ...document.metadata,
        importedAt: Date.now(),
        originalId: document.id
      }
    );
  }
}