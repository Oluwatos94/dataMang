import React from 'react';
import type { PermissionRequest } from '../../../utils/permissions';

interface PermissionRequestItemProps {
  request: PermissionRequest;
  onApprove: () => Promise<void>;
  onDeny: () => Promise<void>;
}

export function PermissionRequestItem({ request, onApprove, onDeny }: PermissionRequestItemProps): React.JSX.Element {
  return (
    <div className="permission-request">
      <div className="request-info">
        <strong>{request.requesterId.slice(0, 20)}...</strong>
        <p>{request.permissions.join(', ')}</p>
        {request.reason && <p className="text-muted">{request.reason}</p>}
      </div>
      <div className="request-actions">
        <button className="btn-success btn-sm" onClick={onApprove}>Approve</button>
        <button className="btn-danger btn-sm" onClick={onDeny}>Deny</button>
      </div>
    </div>
  );
}
