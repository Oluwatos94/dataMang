import React from 'react';
import { test, expect, describe, spyOn, beforeAll, afterAll } from 'bun:test';
import { setupTestEnvironment, MockImplementations } from './setup';
import { PermissionManager } from '../utils/permissions';
import { usePermissions } from '../popup/hooks/usePermissions';

// Setup test environment
setupTestEnvironment();

describe('usePermissions Hook', () => {
  const mockPermissionManager = MockImplementations.createMockPermissionManager();

  beforeAll(() => {
    spyOn(PermissionManager, 'getInstance').mockReturnValue(mockPermissionManager as any);
  });

  afterAll(() => {
    spyOn(PermissionManager, 'getInstance').mockRestore();
  });

  test('should call permissionManager methods', async () => {
    const setState = spyOn(React, 'useState');
    const useEffect = spyOn(React, 'useEffect');

    // Call the hook to get the functions
    const { approveRequest, denyRequest, revokePermission } = usePermissions();

    // Test approveRequest
    await approveRequest('req-123');
    expect(mockPermissionManager.respondToPermissionRequest).toHaveBeenCalledWith('req-123', true);

    // Test denyRequest
    await denyRequest('req-456');
    expect(mockPermissionManager.respondToPermissionRequest).toHaveBeenCalledWith('req-456', false);

    // Test revokePermission
    await revokePermission('doc-789:did:test:abc');
    expect(mockPermissionManager.revokePermission).toHaveBeenCalledWith('doc-789', 'did:test:abc');

    setState.mockRestore();
    useEffect.mockRestore();
  });
});
