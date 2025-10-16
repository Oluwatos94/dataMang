import React from 'react';

interface ErrorBannerProps {
  error: string;
  onDismiss: () => void;
}

export function ErrorBanner({ error, onDismiss }: ErrorBannerProps): React.JSX.Element {
  return (
    <div className="error-banner">
      <span>{error}</span>
      <button onClick={onDismiss}>×</button>
    </div>
  );
}
