import { useState, useEffect } from 'react';
import type { PermissionRequest, AccessRule } from '../../utils/permissions';

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

export function usePermissions() {
  const [permissions, setPermissions] = useState<AccessRule[]>([]);
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const result = await sendToBackground('list_permissions');
      setPermissions(result.permissions || []);
      setRequests([]); // No pending requests in demo mode
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const approveRequest = async (requestId: string) => {
    try {
      // Not implemented in demo mode
      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request');
    }
  };

  const denyRequest = async (requestId: string) => {
    try {
      // Not implemented in demo mode
      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny request');
    }
  };

  const revokePermission = async (permissionId: string) => {
    try {
      // permissionId is the id from the permission object
      const perm = permissions.find(p => p.id === permissionId);
      if (!perm) {
        throw new Error('Permission not found');
      }

      await sendToBackground('revoke_permission', {
        dataId: (perm as any).dataId,
        collectionId: (perm as any).collectionId,
        appDid: (perm as any).appDid || perm.subjectDid,
        permissionId: permissionId  // Pass the specific permission ID
      });

      await loadPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke permission');
    }
  };

  return {
    permissions,
    requests,
    loading,
    error,
    reload: loadPermissions,
    approveRequest,
    denyRequest,
    revokePermission,
  };
}
