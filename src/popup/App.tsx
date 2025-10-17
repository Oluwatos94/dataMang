import React, { useState } from 'react';
import type { ViewType } from './types';
import { useIdentity } from './hooks/useIdentity';
import { useDocuments } from './hooks/useDocuments';
import { usePermissions } from './hooks/usePermissions';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { ErrorBanner } from './components/common/ErrorBanner';
import { DocumentsView } from './components/documents/DocumentsView';
import { PermissionsView } from './components/permissions/PermissionsView';
import { IdentityView } from './components/identity/IdentityView';
import { SettingsView } from './components/settings/SettingsView';

export default function App(): React.JSX.Element {
  const [currentView, setCurrentView] = useState<ViewType>('documents');
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('password123'); // Default for demo

  const { identity, loading: identityLoading, error: identityError, isUnlocked, unlock, lock } = useIdentity();
  const {
    documents,
    createDocument,
    deleteDocument,
    reload: reloadDocuments,
    error: documentsError,
    getDocument,
  } = useDocuments();
  const {
    permissions,
    requests,
    reload: reloadPermissions,
    error: permissionsError,
    approveRequest,
    denyRequest,
    revokePermission,
  } = usePermissions();

  // Combine all errors
  const currentError = error || identityError || documentsError || permissionsError;

  if (identityLoading) {
    return (
      <div className="pdm-popup">
        <LoadingSpinner />
      </div>
    );
  }

  // Show unlock screen if not unlocked
  if (!isUnlocked) {
    return (
      <div className="pdm-popup">
        <div className="header">
          <div className="header-content">
            <h1>🔐 Private Data Manager</h1>
          </div>
        </div>
        <main className="content">
          <div style={{ maxWidth: '400px', margin: '40px auto', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '20px' }}>Unlock Your Vault</h2>
            <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
              Enter your password to access your private data on Nillion network
            </p>

            {identityError && (
              <ErrorBanner error={identityError} onDismiss={() => setError(null)} />
            )}

            <div style={{ marginBottom: '20px' }}>
              <input
                type="password"
                className="form-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    unlock(password);
                  }
                }}
                style={{ marginBottom: '12px' }}
              />
              <button
                className="btn-primary"
                onClick={() => unlock(password)}
                disabled={!password}
                style={{ width: '100%' }}
              >
                Unlock Vault
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Demo password: password123
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (identityError && !identity) {
    return (
      <div className="pdm-popup">
        <div className="error-container">
          <h3>Error</h3>
          <p>{identityError}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pdm-popup">
      <Header identity={identity} onLock={lock} />
      <Navigation currentView={currentView} onViewChange={setCurrentView} />

      <main className="content">
        {currentError && (
          <ErrorBanner error={currentError} onDismiss={() => setError(null)} />
        )}

        {currentView === 'documents' && (
          <DocumentsView
            documents={documents}
            onCreateDocument={createDocument}
            onDeleteDocument={deleteDocument}
            onRefresh={reloadDocuments}
            getDocument={getDocument}
          />
        )}

        {currentView === 'permissions' && (
          <PermissionsView
            permissions={permissions}
            requests={requests}
            onRefresh={reloadPermissions}
            onApprove={approveRequest}
            onDeny={denyRequest}
            onRevoke={revokePermission}
          />
        )}

        {currentView === 'identity' && (
          <IdentityView identity={identity} />
        )}

        {currentView === 'settings' && (
          <SettingsView />
        )}
      </main>
    </div>
  );
}
