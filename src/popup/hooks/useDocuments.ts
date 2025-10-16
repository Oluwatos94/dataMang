import { useState, useEffect } from 'react';
import type { Document } from '../../utils/data';

// Helper to send messages to background script
async function sendToBackground(action: string, data: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'PDM_MESSAGE',
        payload: {
          id: `${action}_${Date.now()}`,
          action,
          data,
          origin: 'popup'
        }
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (!response || !response.payload) {
          reject(new Error('Invalid response from background'));
          return;
        }
        if (response.payload.error) {
          reject(new Error(response.payload.error));
          return;
        }
        resolve(response.payload.data);
      }
    );
  });
}

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const result = await sendToBackground('get_user_data', { limit: 50 });
      setDocuments(result.documents || []);
      setError(null);
    } catch (err) {
      console.error('[useDocuments] Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const getDocument = async (documentId: string): Promise<Document | null> => {
    try {
      const result = await sendToBackground('retrieve_data', { documentId });
      return result.document;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load document');
      return null;
    }
  };

  const createDocument = async (
    title: string,
    content: string,
    type: Document['type'],
    collectionId: string = 'pdm_demo_collection'
  ) => {
    try {
      await sendToBackground('store_data', {
        title,
        content,
        type,
        tags: ['popup-created'],
        metadata: {
          collectionId,
          app: 'PDM Extension',
          timestamp: Date.now()
        }
      });
      await loadDocuments();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create document');
      return false;
    }
  };

  const deleteDocument = async (documentId: string, collectionId?: string) => {
    try {
      // Get the document to find its collectionId if not provided
      if (!collectionId) {
        const doc = documents.find(d => d.id === documentId);
        collectionId = (doc as any)?.collectionId || 'pdm_demo_collection';
      }

      await sendToBackground('delete_data', { documentId, collectionId });
      await loadDocuments();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
      return false;
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  return {
    documents,
    loading,
    error,
    getDocument,
    createDocument,
    deleteDocument,
    reload: loadDocuments,
  };
}
