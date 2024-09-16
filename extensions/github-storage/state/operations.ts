import { nsmApi2 } from '@bangle.io/api';
import { SEVERITY } from '@bangle.io/constants';
import { isAbortError } from '@bangle.io/mini-js-utils';
import type { OperationStore } from '@bangle.io/nsm-3';
import { operation, ref } from '@bangle.io/nsm-3';
import { pMap } from '@bangle.io/p-map';
import {
  isEntryDeleted,
  isEntryModified,
  isEntryNew,
} from '@bangle.io/remote-file-sync';
import type { WsName } from '@bangle.io/storage';
import { createWsName, createWsPath } from '@bangle.io/ws-path';

import {
  getGithubSyncLockWrapper,
  notify,
  OPERATION_SHOW_CONFLICT_DIALOG,
} from '../common';
import { getGhToken, updateGhToken } from '../database';
import { fileEntryManager } from '../file-entry-manager';
import type { GithubConfig } from '../github-api-helpers';
import { serialGetRepoTree } from '../github-api-helpers';
import {
  discardLocalEntryChanges,
  duplicateAndResetToRemote,
  getConflicts,
  githubSync,
  optimizeDatabase,
} from '../github-sync';
import { readGhWorkspaceMetadata } from '../helpers';
import { nsmGhSlice, updateGithubDetails } from './github-storage-slice';

const getGhConfig = async (
  wsName: string,
): Promise<GithubConfig | undefined> => {
  const ghMetadata = await readGhWorkspaceMetadata(createWsName(wsName));
  const githubToken = await getGhToken();

  if (!ghMetadata || !githubToken) {
    return undefined;
  }

  const ghConfig = { ...ghMetadata, repoName: wsName, githubToken };

  return ghConfig;
};

export const getIsSyncingRef = ref(() => false);

export const syncRunner = operation({
  deferred: false,
})((abort: AbortSignal, notifyVerbose = false) => {
  async function syncRunGuard(store: OperationStore, notifyVerbose: boolean) {
    const { githubWsName } = nsmGhSlice.get(store.state);

    if (!githubWsName) {
      notify('Not a Github workspace', SEVERITY.WARNING);

      return false;
    }

    const ghConfig = await getGhConfig(githubWsName);

    if (!ghConfig) {
      return false;
    }

    const isSyncingRef = getIsSyncingRef(store);

    if (isSyncingRef.current) {
      notifyVerbose &&
        notify('Github синхронизация уже запущена', SEVERITY.INFO);

      return false;
    }

    try {
      const { lockAcquired, result } = await getGithubSyncLockWrapper(
        githubWsName,
        async () => {
          isSyncingRef.current = true;

          const result = await runSync(store, ghConfig);

          return result;
        },
      );

      if (!lockAcquired) {
        notifyVerbose &&
          notify('Github синхронизация уже запущена', SEVERITY.INFO);

        console.warn('Github синхронизация: блокировка не получена');

        return false;
      }

      if (
        result !== false &&
        result.status === 'merge-conflict' &&
        notifyVerbose
      ) {
        nsmApi2.ui.showNotification({
          severity: SEVERITY.ERROR,
          title: 'Github sync failed',
          uid: 'sync notification-' + Math.random(),
          content:
            'Синхронизация не удалась. Нажмите "Разрешить конфликт" для разрешения конфликтов.',
          transient: false,
          buttons: [
            {
              operation: OPERATION_SHOW_CONFLICT_DIALOG,
              title: 'Разрешить конфликт',
              dismissOnClick: true,
            },
          ],
        });
      }

      return result;
    } catch (error) {
      if (isAbortError(error)) {
        return false;
      }

      console.error(error);
      notify(
        'Github синхронизация не удалась',
        SEVERITY.ERROR,
        error instanceof Error ? error.message : 'Неизвестная ошибка',
      );

      return false;
    } finally {
      isSyncingRef.current = false;
    }
  }

  async function runSync(store: OperationStore, config: GithubConfig) {
    const { wsName: currentWsName } = nsmApi2.workspace.workspaceState();
    const { githubWsName } = nsmGhSlice.get(store.state);

    if (currentWsName !== githubWsName || !githubWsName || abort.aborted) {
      return false;
    }

    return githubSync({
      wsName: githubWsName,
      config,
      abortSignal: abort,
    });
  }

  return async (store) => {
    if (!navigator?.onLine) {
      return;
    }
    const result = await syncRunGuard(store, notifyVerbose);

    if (result === false) {
      console.debug('gh-sync returned false');
    } else {
      nsmApi2.workspace.refresh();

      const { count: changeCount } = result;

      if (result.status === 'merge-conflict') {
        store.dispatch(
          updateGithubDetails({
            conflictedWsPaths: result.conflict.map((r) => createWsPath(r)),
          }),
        );

        return;
      }

      if (typeof changeCount === 'number') {
        if (changeCount === 0) {
          notifyVerbose &&
            notify('Github синхронизация завершена', SEVERITY.INFO);
        }
        if (changeCount > 0) {
          notify(
            'Github синхронизация завершена',
            SEVERITY.INFO,
            `Синхронизировано ${changeCount} файлов`,
          );
        }
      }
    }
  };
});

export const discardLocalChanges = operation({
  deferred: false,
})(function discardLocalChanges(wsName: WsName, reloadOnSuccess?: boolean) {
  return async (store) => {
    const isSyncingRef = getIsSyncingRef(store);

    if (isSyncingRef.current) {
      notify(
        'Локальные изменения нельзя отменить',
        SEVERITY.INFO,
        'Синхронизация уже запущена. Дождитесь завершения.',
      );

      return;
    }

    const { githubWsName } = nsmGhSlice.get(store.state);

    if (githubWsName !== wsName) {
      notify(
        'Локальные изменения нельзя отменить',
        SEVERITY.INFO,
        'Это не GitHub-репозиторий',
      );

      return;
    }

    const { lockAcquired, result } = await getGithubSyncLockWrapper(
      wsName,
      async () => {
        const allEntries = await fileEntryManager.listAllEntries(wsName);

        const result = await pMap(
          allEntries.filter((entry) => {
            return (
              isEntryModified(entry) ||
              isEntryNew(entry) ||
              isEntryDeleted(entry)
            );
          }),
          async (entry) => {
            return discardLocalEntryChanges(entry.uid);
          },
          {
            concurrency: 10,
            abortSignal: new AbortController().signal,
          },
        );

        return result.every((r) => r);
      },
    );

    if (!lockAcquired) {
      notify(
        'Локальные изменения нельзя отменить',
        SEVERITY.INFO,
        'Синхронизация уже запущена. Дождитесь завершения.',
      );

      return;
    }

    if (!result) {
      notify(
        'Локальные изменения нельзя отменить',
        SEVERITY.INFO,
        'Локальные изменения нельзя отменить. Попробуйие ещё раз',
      );

      return;
    }

    notify('Локальные изменения отменены', SEVERITY.SUCCESS);

    if (reloadOnSuccess) {
      window.location.reload();
    }
  };
});

export const updateGithubToken = operation({
  deferred: false,
})(function updateGithubToken(wsName: WsName, token: string) {
  return async (store) => {
    const { githubWsName } = nsmGhSlice.get(store.state);

    if (githubWsName !== wsName) {
      notify(
        'Не могу изменить токен',
        SEVERITY.INFO,
        'Это не GitHub-репозиторий',
      );

      return;
    }

    await updateGhToken(token);
  };
});

export const manuallyResolveConflict = operation({
  deferred: false,
})(function manuallyResolveConflict(wsName: WsName) {
  return async (store) => {
    const config = await getGhConfig(wsName);

    if (!config) {
      return;
    }

    const { conflictedWsPaths } = nsmGhSlice.get(store.state);

    try {
      const { lockAcquired, result } = await getGithubSyncLockWrapper(
        wsName,
        async () => {
          let result: Array<
            Awaited<ReturnType<typeof duplicateAndResetToRemote>>
          > = [];

          for (const cWsPath of conflictedWsPaths) {
            result.push(
              await duplicateAndResetToRemote({
                config,
                wsPath: cWsPath,
                abortSignal: new AbortController().signal,
              }),
            );
          }

          return result;
        },
      );

      if (!lockAcquired || result.some((r) => r == null)) {
        if (!lockAcquired) {
          console.warn('cannot manually resolve conflict, lock not acquired');
        }

        notify(
          'Unable to resolve conflict',
          SEVERITY.ERROR,
          'Please close any other Bangle tab and try again.',
        );

        return;
      } else if (result) {
        store.dispatch(updateGithubDetails({ conflictedWsPaths: [] }));
        nsmApi2.workspace.refresh();

        notify(
          'Manual Conflict Resolution',
          SEVERITY.SUCCESS,
          'Successfully created copies of the the conflicted files. Please resolve the conflicts manually and then sync again.',
        );

        const firstConflictedWsPath = result.find((r) => Boolean(r));

        if (firstConflictedWsPath) {
          // open the first conflicted file for easier manual conflict resolution
          nsmApi2.workspace.pushOpenedWsPath((openedWsPaths) =>
            openedWsPaths
              .updatePrimaryWsPath(firstConflictedWsPath.remoteContentWsPath)
              .updateSecondaryWsPath(firstConflictedWsPath.localContentWsPath),
          );
        }

        return;
      }

      return;
    } catch (e) {
      console.error(e);
      notify(
        'Unable to resolve conflict',
        SEVERITY.ERROR,
        'Something went wrong, please reload and try again.',
      );

      return;
    }
  };
});

export const checkForConflicts = operation({
  deferred: false,
})(function checkForConflicts() {
  return async (store) => {
    const { githubWsName } = nsmGhSlice.get(store.state);

    if (!githubWsName) {
      return;
    }

    const config = await getGhConfig(githubWsName);

    if (!config) {
      return;
    }

    const conflicts = await getConflicts({ wsName: githubWsName, config });

    const { wsName: currentWsName } = nsmApi2.workspace.workspaceState();

    if (currentWsName !== githubWsName) {
      return;
    }

    const { conflictedWsPaths } = nsmGhSlice.get(store.state);

    if (conflicts.length > 0) {
      store.dispatch(updateGithubDetails({ conflictedWsPaths: conflicts }));

      return;
    }

    if (conflictedWsPaths.length > 0 && conflicts.length === 0) {
      store.dispatch(updateGithubDetails({ conflictedWsPaths: [] }));

      return;
    }
  };
});

export const optimizeDatabaseOperation = operation({
  deferred: false,
})(function optimizeDatabaseOperation(
  pruneUnused: boolean,
  abortSignal: AbortSignal,
) {
  const optimize = async (store: OperationStore) => {
    const { githubWsName } = nsmGhSlice.get(store.state);

    if (!githubWsName) {
      return;
    }

    const config = await getGhConfig(githubWsName);

    if (!config) {
      return;
    }

    const tree = await serialGetRepoTree({
      wsName: githubWsName,
      config,
      abortSignal: abortSignal,
    });

    const { lockAcquired, result } = await getGithubSyncLockWrapper(
      githubWsName,
      async () => {
        const {
          openedWsPaths,
          wsName: currentWsName,
          recentWsPaths: recentlyUsedWsPaths,
        } = nsmApi2.workspace.workspaceState();

        if (currentWsName !== githubWsName || abortSignal.aborted) {
          return false;
        }

        const retainedWsPaths = new Set(
          [...openedWsPaths.toArray(), ...(recentlyUsedWsPaths || [])].filter(
            (r): r is string => typeof r === 'string',
          ),
        );

        return optimizeDatabase({
          tree,
          abortSignal: abortSignal,
          config,
          retainedWsPaths,
          wsName: githubWsName,
          pruneUnused,
        });
      },
    );

    if (!lockAcquired || !result) {
      !lockAcquired &&
        console.debug('cannot cleanup ws paths, lock not acquired');

      return;
    }

    return;
  };

  return async (store) => {
    return optimize(store).finally(() => {
      store.dispatch(syncRunner(abortSignal));
    });
  };
});
