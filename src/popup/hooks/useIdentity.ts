import { useState, useEffect } from 'react';
import type { UserIdentity } from '../types';

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

export function useIdentity() {
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const checkUnlockStatus = async () => {
    try {
      setLoading(true);
      const result = await sendToBackground('is_unlocked');
      setIsUnlocked(result.unlocked);

      if (result.unlocked) {
        // Get identity if unlocked
        const identityResult = await sendToBackground('get_identity');
        setIdentity({
          did: identityResult.did,
          publicKey: '',
          createdAt: Date.now()
        });
      } else {
        setIdentity(null);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check unlock status');
    } finally {
      setLoading(false);
    }
  };

  const unlock = async (password: string): Promise<boolean> => {
    try {
      setLoading(true);
      await sendToBackground('unlock', { password });
      await checkUnlockStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock');
      setLoading(false);
      return false;
    }
  };

  const lock = async (): Promise<void> => {
    try {
      setLoading(true);
      await sendToBackground('lock');
      setIdentity(null);
      setIsUnlocked(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUnlockStatus();
  }, []);

  return {
    identity,
    loading,
    error,
    isUnlocked,
    unlock,
    lock,
    reload: checkUnlockStatus
  };
}
