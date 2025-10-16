import React from 'react';

interface EmptyStateProps {
  message: string;
  description?: string;
}

export function EmptyState({ message, description }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {description && <p className="text-muted">{description}</p>}
    </div>
  );
}
