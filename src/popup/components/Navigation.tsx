import React from 'react';
import type { ViewType } from '../types';

interface NavigationProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

export function Navigation({ currentView, onViewChange }: NavigationProps): React.JSX.Element {
  const navItems: { view: ViewType; label: string; icon: string }[] = [
    { view: 'documents', label: 'Documents', icon: '📄' },
    { view: 'permissions', label: 'Permissions', icon: '🔑' },
    { view: 'identity', label: 'Identity', icon: '👤' },
    { view: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <nav className="navigation">
      {navItems.map(({ view, label, icon }) => (
        <button
          key={view}
          className={`nav-item ${currentView === view ? 'active' : ''}`}
          onClick={() => onViewChange(view)}
        >
          <span className="nav-icon">{icon}</span>
          <span className="nav-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
