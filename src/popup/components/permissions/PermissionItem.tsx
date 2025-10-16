import React from 'react';
import type { AccessRule } from '../../../utils/permissions';

interface PermissionItemProps {
  permission: AccessRule | any; // Allow any for demo mode permissions
  onRevoke: () => Promise<void>;
}

export function PermissionItem({ permission, onRevoke }: PermissionItemProps): React.JSX.Element {
  // Handle both AccessRule and demo mode permission formats
  const resourceId = permission.resourceId || permission.dataId || 'Unknown';
  const subjectDid = permission.subjectDid || permission.appDid || 'Unknown';
  const collectionId = (permission as any).collectionId;
  const permissions = permission.permissions || [];
  const grantedAt = (permission as any).grantedAt;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="permission-item">
      <div className="permission-info">
        <strong>App: {subjectDid.length > 30 ? subjectDid.slice(0, 30) + '...' : subjectDid}</strong>
        <p>📦 Collection: {collectionId || 'N/A'}</p>
        <p>🔑 Permissions: {permissions.join(', ')}</p>
        {grantedAt && <p style={{ fontSize: '11px', color: '#6b7280' }}>Granted: {formatDate(grantedAt)}</p>}
      </div>
      <button className="btn-danger btn-sm" onClick={onRevoke}>Revoke</button>
    </div>
  );
}
