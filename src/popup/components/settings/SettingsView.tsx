import React from 'react';

export function SettingsView(): React.JSX.Element {
  return (
    <div className="settings-view">
      <h2>Settings</h2>
      <div className="settings-group">
        <h3>Security</h3>
        <label className="setting-item">
          <input type="checkbox" />
          <span>Auto-approve known apps</span>
        </label>
        <label className="setting-item">
          <input type="checkbox" defaultChecked />
          <span>Require confirmation for sensitive actions</span>
        </label>
      </div>
      <div className="settings-group">
        <h3>Data</h3>
        <button className="btn-secondary">Clear Cache</button>
        <button className="btn-danger">Reset Extension</button>
      </div>
    </div>
  );
}
