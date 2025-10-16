import React from 'react';
import type { UserIdentity } from '../types';

interface HeaderProps {
  identity: UserIdentity | null;
  onLock?: () => void;
}

export function Header({ identity, onLock }: HeaderProps): React.JSX.Element {
  const shortDid = identity?.did ? `${identity.did.slice(0, 15)}...` : 'Loading...';

  return (
    <header className="header">
      <div className="header-content">
        <h1>🔒 Private Data Manager</h1>
        <div className="user-info">
          <span className="did-badge" title={identity?.did}>
            {shortDid}
          </span>
          {onLock && (
            <button
              onClick={onLock}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                marginLeft: '8px'
              }}
              title="Lock vault"
            >
              🔒 Lock
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
