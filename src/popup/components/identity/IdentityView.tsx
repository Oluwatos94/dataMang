import React from 'react';
import type { UserIdentity } from '../../types';

interface IdentityViewProps {
  identity: UserIdentity | null;
}

export function IdentityView({ identity }: IdentityViewProps): React.JSX.Element {
  if (!identity) return <div>Loading...</div>;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="identity-view">
      <h2>Your Identity</h2>
      <div className="identity-card">
        <div className="identity-field">
          <label>Decentralized ID (DID)</label>
          <div className="identity-value did-value">{identity.did}</div>
        </div>
        <div className="identity-field">
          <label>Created At</label>
          <div className="identity-value">{formatDate(identity.createdAt)}</div>
        </div>
        <div className="identity-field">
          <label>Last Accessed</label>
          <div className="identity-value">{formatDate(identity.lastAccessed)}</div>
        </div>
      </div>
      <div className="identity-actions">
        <button className="btn-secondary">Export Identity</button>
        <button className="btn-secondary">Backup Keys</button>
      </div>
    </div>
  );
}
