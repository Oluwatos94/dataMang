import React from 'react';
import type { AccessRule, PermissionRequest } from '../../../utils/permissions';
import { PermissionItem } from './PermissionItem';
import { PermissionRequestItem } from './PermissionRequestItem';
import { EmptyState } from '../common/EmptyState';

interface PermissionsViewProps {
  permissions: AccessRule[];
  requests: PermissionRequest[];
  onRefresh: () => void;
  onApprove: (requestId: string) => Promise<void>;
  onDeny: (requestId: string) => Promise<void>;
  onRevoke: (permissionId: string) => Promise<void>;
}

export function PermissionsView({
  permissions,
  requests,
  onRefresh,
  onApprove,
  onDeny,
  onRevoke,
}: PermissionsViewProps): React.JSX.Element {
  return (
    <div className="permissions-view">
      <div className="view-header">
        <h2>Permissions & Access</h2>
        <button className="btn-refresh" onClick={onRefresh} title="Refresh">🔄</button>
      </div>

      {requests.length > 0 && (
        <div className="requests-section">
          <h3>Pending Requests ({requests.length})</h3>
          {requests.map((req) => (
            <PermissionRequestItem
              key={req.id}
              request={req}
              onApprove={() => onApprove(req.id)}
              onDeny={() => onDeny(req.id)}
            />
          ))}
        </div>
      )}

      <div className="permissions-section">
        <h3>Active Permissions ({permissions.length})</h3>
        {permissions.length === 0 ? (
          <EmptyState message="No active permissions" />
        ) : (
          permissions.map((perm) => (
            <PermissionItem
              key={perm.id}
              permission={perm}
              onRevoke={() => onRevoke(perm.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
