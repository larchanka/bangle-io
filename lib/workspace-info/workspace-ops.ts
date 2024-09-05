import type { WorkspaceInfo, WsName } from '@bangle.io/shared-types';
import { BaseError } from '@bangle.io/utils';
import { validWsName } from '@bangle.io/ws-path';

import { WorkspaceInfoError } from './error';
import { getStorageProviderObj } from './storage-providers';
import { createWorkspaceInfo, updateWorkspaceInfo } from './workspace-info';

export async function deleteWorkspace(wsName: WsName): Promise<void> {
  const result = await updateWorkspaceInfo(wsName, (existing) => ({
    ...existing,
    deleted: true,
  }));

  if (!result) {
    throw new BaseError({
      code: WorkspaceInfoError.WorkspaceDeleteNotAllowed,
      message: `Не могу удалить пространство "${wsName}". Оно или уже удалено, или у вас нет прав.`,
    });
  }
}

export async function createWorkspace(
  wsName: WsName,
  wsType: string,
  createOpts: Record<string, any>,
): Promise<void> {
  validWsName(wsName);

  const { provider } = getStorageProviderObj(wsType);

  const wsMetadata =
    (await provider.newWorkspaceMetadata(wsName, createOpts)) || {};

  const workspaceInfo: WorkspaceInfo = {
    deleted: false,
    lastModified: Date.now(),
    name: wsName,
    type: wsType,
    metadata: wsMetadata,
  };

  const result = await createWorkspaceInfo(wsName, workspaceInfo);

  if (!result) {
    throw new BaseError({
      code: WorkspaceInfoError.WorkspaceCreateNotAllowed,
      message: `Не могу создать пространство "${wsName}", так как оно уже существует или у вас нет прав.`,
    });
  }

  return;
}
