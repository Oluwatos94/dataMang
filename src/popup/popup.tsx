// Main popup interface for PDM extension
import React from 'react';
import { createRoot } from 'react-dom/client';

interface PopupAppProps {}

function PopupApp(): React.JSX.Element {
  return (
    <div className="pdm-popup">
      <header>
        <h1>Private Data Manager</h1>
      </header>
      <main>
        <p>PDM Extension Loading...</p>
      </main>
    </div>
  );
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<PopupApp />);
  }
});

export default PopupApp;