import React, { useState } from 'react';
import type { Document } from '../../../utils/data';

interface CreateDocumentFormProps {
  onSubmit: (title: string, content: string, type: Document['type'], collectionId: string) => void;
  onCancel: () => void;
}

export function CreateDocumentForm({ onSubmit, onCancel }: CreateDocumentFormProps): React.JSX.Element {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<Document['type']>('text');
  const [collectionId, setCollectionId] = useState('health_data_2024');

  const handleSubmit = () => {
    if (title.trim() && content.trim() && collectionId.trim()) {
      onSubmit(title, content, type, collectionId);
      setTitle('');
      setContent('');
    }
  };

  return (
    <div className="create-form">
      <h3>Create New Document</h3>
      <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
        Collection ID (provided by app)
      </label>
      <input
        type="text"
        placeholder="e.g., health_data_2024"
        value={collectionId}
        onChange={(e) => setCollectionId(e.target.value)}
        className="form-input"
      />
      <input
        type="text"
        placeholder="Document title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="form-input"
      />
      <textarea
        placeholder="Document content (can be JSON)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="form-textarea"
        rows={4}
      />
      <select value={type} onChange={(e) => setType(e.target.value as Document['type'])} className="form-select">
        <option value="text">Text</option>
        <option value="json">JSON</option>
        <option value="health">Health Data</option>
        <option value="binary">Binary</option>
        <option value="image">Image</option>
        <option value="file">File</option>
      </select>
      <div className="form-actions">
        <button className="btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn-primary" onClick={handleSubmit}>Create</button>
      </div>
    </div>
  );
}
