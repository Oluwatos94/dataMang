import React from 'react';

export function LoadingSpinner(): React.JSX.Element {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Loading PDM...</p>
    </div>
  );
}
