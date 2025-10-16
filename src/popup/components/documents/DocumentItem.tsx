import React, { useState } from 'react';
import type { Document } from '../../../utils/data';

interface DocumentItemProps {
  document: Document;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  onGrantPermission?: (docId: string, collectionId: string) => void;
}

export function DocumentItem({ document, onDelete, onSelect, onGrantPermission }: DocumentItemProps): React.JSX.Element {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete "${document.title}"?`)) {
      onDelete(document.id);
    }
  };

  const handleGrantPermission = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onGrantPermission) {
      const collectionId = (document as any).collectionId || 'pdm_demo_collection';
      onGrantPermission(document.id, collectionId);
    }
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const collectionId = (document as any).collectionId || 'Unknown';

  return (
    <div className="document-item">
      <div className="document-header" onClick={toggleExpand}>
        <div className="document-info">
          <h4>{document.title}</h4>
          <div className="document-meta">
            <span className="type-badge">{document.type}</span>
            <span>📦 {collectionId}</span>
            <span>{formatDate((document as any).storedAt || document.metadata.createdAt || Date.now())}</span>
          </div>
        </div>
        <div className="document-actions">
          <button className="btn-icon" onClick={handleGrantPermission} title="Grant Permission">🔑</button>
          <button className="btn-icon" onClick={handleDelete} title="Delete">🗑️</button>
        </div>
      </div>
      {isExpanded && (
        <div className="document-content">
          <pre>{typeof document.content === 'string' ? document.content : JSON.stringify(document.content, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
