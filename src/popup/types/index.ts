export type ViewType = 'documents' | 'permissions' | 'identity' | 'settings';

export interface UserIdentity {
  did: string;
  createdAt: number;
  lastAccessed: number;
}
