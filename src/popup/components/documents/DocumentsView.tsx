import React, { useState } from 'react';
import type { Document } from '../../../utils/data';
import { DocumentItem } from './DocumentItem';
import { CreateDocumentForm } from './CreateDocumentForm';
import { EmptyState } from '../common/EmptyState';
import { GrantPermissionDialog } from './GrantPermissionDialog';

interface DocumentsViewProps {
  documents: Document[];
  onCreateDocument: (title: string, content: string, type: Document['type'], collectionId: string) => Promise<boolean>;
  onDeleteDocument: (id: string) => Promise<boolean>;
  onRefresh: () => void;
  getDocument: (id: string) => Promise<Document | null>;
}

export function DocumentsView({
  documents,
  onCreateDocument,
  onDeleteDocument,
  onRefresh,
  getDocument
}: DocumentsViewProps): React.JSX.Element {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [grantPermissionDoc, setGrantPermissionDoc] = useState<{docId: string, collectionId: string} | null>(null);

  const handleCreate = async (title: string, content: string, type: Document['type'], collectionId: string) => {
    const success = await onCreateDocument(title, content, type, collectionId);
    if (success) {
      setShowCreateForm(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await onDeleteDocument(id);
  };

  const handleSelectDocument = async (id: string) => {
    const doc = await getDocument(id);
    setSelectedDocument(doc);
  };

  const handleGrantPermission = (docId: string, collectionId: string) => {
    setGrantPermissionDoc({ docId, collectionId });
  };

  if (selectedDocument) {
    return (
      <div className="document-detail-view">
        <button onClick={() => setSelectedDocument(null)}>&larr; Back to list</button>
        <h2>{selectedDocument.title}</h2>
        <pre>{JSON.stringify(selectedDocument.content, null, 2)}</pre>
        <p>Type: {selectedDocument.type}</p>
        <p>Tags: {selectedDocument.tags.join(', ')}</p>
      </div>
    );
  }

  return (
    <div className="documents-view">
      <div className="view-header">
        <h2>My Documents</h2>
        <div className="actions">
          <button
            className="btn-refresh"
            onClick={() => {
              onRefresh();
            }}
            title="Refresh"
          >
            🔄
          </button>
          <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
            + New Document
          </button>
        </div>
      </div>

      {showCreateForm && (
        <CreateDocumentForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="documents-list">
        {documents.length === 0 ? (
          <EmptyState
            message="No documents yet"
            description="Create your first encrypted document"
          />
        ) : (
          documents
            .filter(doc => doc && doc.id) // Filter out invalid documents
            .map((doc, index) => (
            <DocumentItem
              key={doc.id || `doc-${index}`}
              document={doc}
              onDelete={handleDelete}
              onSelect={handleSelectDocument}
              onGrantPermission={handleGrantPermission}
            />
          ))
        )}
      </div>

      {grantPermissionDoc && (
        <GrantPermissionDialog
          documentId={grantPermissionDoc.docId}
          collectionId={grantPermissionDoc.collectionId}
          onClose={() => setGrantPermissionDoc(null)}
        />
      )}
    </div>
  );
}
