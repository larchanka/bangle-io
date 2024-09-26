import React, { useEffect, useState } from 'react';

import {
  nsmApi2,
  useNsmSliceState,
  useSerialOperationContext,
  wsPathHelpers,
} from '@bangle.io/api';
import { SEVERITY } from '@bangle.io/constants';
import type { PlainObjEntry } from '@bangle.io/remote-file-sync';
import { isEntryUntouched } from '@bangle.io/remote-file-sync';
import { Button, Sidebar } from '@bangle.io/ui-components';
import { shallowCompareArray, useInterval } from '@bangle.io/utils';
import { createWsPath } from '@bangle.io/ws-path';

import { OPERATION_SYNC_GITHUB_CHANGES } from '../common';
import { fileEntryManager } from '../file-entry-manager';
import { nsmGhSlice } from '../state/github-storage-slice';

const LOG = false;

const log = LOG ? console.info.bind(console, 'GithubSidebar') : () => {};

const REFRESH_INTERVAL = 3000;

export function GithubSidebar() {
  const { openedWsPaths } = nsmApi2.workspace.useWorkspace();

  const { githubWsName } = useNsmSliceState(nsmGhSlice);

  return githubWsName ? (
    <ModifiedEntries wsName={githubWsName} openedWsPaths={openedWsPaths} />
  ) : (
    <div className="pl-3">
      Пожалуйста, откройте Github-
      <span className="font-semibold">пространство</span>
    </div>
  );
}

function ModifiedEntries({
  wsName,
  openedWsPaths,
}: {
  wsName: string;
  openedWsPaths: wsPathHelpers.OpenedWsPaths;
}) {
  const [modifiedEntries, updateModifiedEntries] = useState<
    undefined | PlainObjEntry[]
  >(undefined);

  const [refreshEntries, updateRefreshEntries] = useState(0);

  const { conflictedWsPaths } = useNsmSliceState(nsmGhSlice);

  const { dispatchSerialOperation } = useSerialOperationContext();

  useEffect(() => {
    let destroyed = false;
    fileEntryManager.listAllEntries(wsName).then((entries) => {
      if (!destroyed) {
        const result = entries.filter((e) => {
          return !isEntryUntouched(e);
        });
        updateModifiedEntries((prevEntries) => {
          const newWsPaths = result.map((e) => e.uid);
          const oldWsPaths = prevEntries?.map((e) => e.uid) || [];

          if (!shallowCompareArray(newWsPaths, oldWsPaths)) {
            return result;
          }

          return prevEntries;
        });
      }
    });

    return () => {
      destroyed = true;
    };
  }, [refreshEntries, wsName]);

  useEffect(() => {
    log('modifiedEntries', modifiedEntries);
  }, [modifiedEntries]);

  // check if there changes in entries every X interval
  useInterval(
    () => {
      updateRefreshEntries((prev) => prev + 1);
    },
    [],
    REFRESH_INTERVAL,
  );

  return !modifiedEntries || modifiedEntries.length === 0 ? (
    <div className="m-3 p-1 text-sm text-center bg-colorNeutralBgLayerBottom rounded-sm">
      Все синхронизовано
      <span role="img" aria-label="ok" className="ml-1">
        🧘‍♂️
      </span>
      !
    </div>
  ) : (
    <div>
      <div className="px-4 my-4">
        <Button
          className="w-full"
          onPress={() => {
            nsmApi2.ui.showNotification({
              title: 'Старт синхронизации',
              severity: SEVERITY.INFO,
              uid: 'starting-sync' + Date.now(),
              transient: true,
            });

            dispatchSerialOperation({ name: OPERATION_SYNC_GITHUB_CHANGES });
          }}
          ariaLabel="Нажмите для синхронизации изменений"
          tooltipPlacement="bottom"
          text="Синхронизировать"
        />
      </div>
      <div className="px-3 text-sm">Файлы для синхронизации</div>
      <div className="">
        {modifiedEntries.map((r) => {
          const wsPath = wsPathHelpers.isValidNoteWsPath(r.uid)
            ? createWsPath(r.uid)
            : undefined;

          return (
            <Sidebar.Row2
              key={wsPath}
              isActive={openedWsPaths.primaryWsPath === wsPath}
              className="rounded text-sm truncate py-1 select-none pl-3"
              extraInfoClassName="ml-1 text-sm"
              onClick={() => {
                if (wsPath && !r.deleted) {
                  nsmApi2.workspace.pushPrimaryWsPath(createWsPath(wsPath));
                }
              }}
              item={{
                uid: wsPath || r.uid,
                isDisabled: Boolean(!wsPath || r.deleted),
                showDividerAbove: false,
                title: `${r.deleted ? '(удален) ' : ''}${
                  wsPath && conflictedWsPaths.includes(wsPath)
                    ? '(конфликт) '
                    : ''
                }${wsPath ? wsPathHelpers.resolvePath2(wsPath).filePath : ''}`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
