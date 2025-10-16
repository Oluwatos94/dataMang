import React, { useState } from 'react';

interface GrantPermissionDialogProps {
  documentId: string;
  collectionId: string;
  onClose: () => void;
}

export function GrantPermissionDialog({
  documentId,
  collectionId,
  onClose
}: GrantPermissionDialogProps): React.JSX.Element {
  const [appDid, setAppDid] = useState('');
  const [read, setRead] = useState(true);
  const [write, setWrite] = useState(false);
  const [execute, setExecute] = useState(false);
  const [isGranting, setIsGranting] = useState(false);
  const [error, setError] = useState('');

  const handleGrant = async () => {
    if (!appDid.trim()) {
      setError('App DID is required');
      return;
    }

    const permissions: string[] = [];
    if (read) permissions.push('read');
    if (write) permissions.push('write');
    if (execute) permissions.push('execute');

    if (permissions.length === 0) {
      setError('Select at least one permission');
      return;
    }

    setIsGranting(true);
    setError('');

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'PDM_MESSAGE',
        payload: {
          id: `grant_${Date.now()}`,
          action: 'grant_permission',
          data: {
            dataId: documentId,
            collectionId: collectionId,
            appDid: appDid.trim(),
            permissions
          },
          origin: 'popup'
        }
      });

      if (response && response.payload) {
        if (response.payload.error) {
          setError(response.payload.error);
        } else {
          alert(`✅ Permissions granted successfully!\n\nApp: ${appDid}\nPermissions: ${permissions.join(', ')}`);
          onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to grant permission');
    } finally {
      setIsGranting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{ marginBottom: '16px', color: '#1f2937' }}>Grant Permission</h3>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
            Collection ID
          </label>
          <input
            type="text"
            value={collectionId}
            disabled
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              background: '#f3f4f6',
              color: '#6b7280'
            }}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
            App DID *
          </label>
          <input
            type="text"
            value={appDid}
            onChange={(e) => setAppDid(e.target.value)}
            placeholder="health_tracker_app"
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          />
          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
            Enter the app identifier (e.g., "health_tracker_app", "fitness_app")
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
            Permissions
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={read}
                onChange={(e) => setRead(e.target.checked)}
              />
              <span style={{ fontSize: '13px' }}>Read - View this data</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={write}
                onChange={(e) => setWrite(e.target.checked)}
              />
              <span style={{ fontSize: '13px' }}>Write - Modify this data</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={execute}
                onChange={(e) => setExecute(e.target.checked)}
              />
              <span style={{ fontSize: '13px' }}>Execute - Run computations on this data</span>
            </label>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '10px',
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            fontSize: '13px',
            marginBottom: '12px'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isGranting}
            className="btn-secondary"
            style={{ padding: '8px 16px' }}
          >
            Cancel
          </button>
          <button
            onClick={handleGrant}
            disabled={isGranting}
            className="btn-primary"
            style={{ padding: '8px 16px' }}
          >
            {isGranting ? 'Granting...' : 'Grant Access'}
          </button>
        </div>
      </div>
    </div>
  );
}
