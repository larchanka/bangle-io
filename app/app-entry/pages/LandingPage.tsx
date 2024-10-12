import React, { useCallback, useEffect, useState } from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { lastWorkspaceUsed } from '@bangle.io/bangle-store';
import { useNsmSliceDispatch } from '@bangle.io/bangle-store-context';
import { CORE_OPERATIONS_NEW_WORKSPACE } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { goToWorkspaceHome, nsmPageSlice } from '@bangle.io/slice-page';
import { AlbumIcon, Button, CenteredBoxedPage } from '@bangle.io/ui-components';
import { readAllWorkspacesInfo } from '@bangle.io/workspace-info';
import { createWsName } from '@bangle.io/ws-path';

export function LandingPage() {
  const [workspaces, updateWorkspaces] = useState<WorkspaceInfo[]>([]);
  const pageDispatch = useNsmSliceDispatch(nsmPageSlice);

  useEffect(() => {
    let destroyed = false;
    readAllWorkspacesInfo().then((wsInfos) => {
      if (destroyed) {
        return;
      }
      updateWorkspaces(wsInfos);
    });

    return () => {
      destroyed = true;
    };
  }, []);

  const { dispatchSerialOperation } = useSerialOperationContext();

  const onClickWsName = useCallback(
    (wsName: string) => {
      pageDispatch(
        goToWorkspaceHome({
          wsName: createWsName(wsName),
          replace: true,
        }),
      );
    },
    [pageDispatch],
  );

  return (
    <CenteredBoxedPage
      title="Добро пожаловать в Дневник"
      actions={
        <>
          <Button
            ariaLabel="Новое пространство"
            onPress={() => {
              dispatchSerialOperation({
                name: CORE_OPERATIONS_NEW_WORKSPACE,
              });
            }}
            text="Новое пространство"
          />
        </>
      }
    >
      {workspaces.length !== 0 ? (
        <RecentWorkspace
          workspaces={workspaces}
          onClickWsName={onClickWsName}
        />
      ) : (
        <div className="mb-3">У вас пока нет рабочих пространств</div>
      )}
    </CenteredBoxedPage>
  );
}

function RecentWorkspace({
  workspaces,
  onClickWsName,
}: {
  workspaces: WorkspaceInfo[];
  onClickWsName: (wsName: string) => void;
}) {
  const [lastWsName] = useState(() => {
    return lastWorkspaceUsed.get();
  });

  return (
    <div className="mb-3" data-test="landing-page">
      <div className="flex flex-row mt-6">
        <h3 className="mr-1 leading-none text-l sm:text-xl lg:text-xl">
          Пространства
        </h3>
      </div>
      <div className="my-2 ml-2 max-h-72 overflow-y-auto">
        {workspaces
          .sort((a, b) => {
            if (a.name === lastWsName) {
              return -1;
            }

            if (b.name === lastWsName) {
              return 1;
            }

            return a.name.localeCompare(b.name);
          })
          .map((r, i) => {
            return (
              <div key={i}>
                <button
                  role="link"
                  onClick={(e) => {
                    onClickWsName(r.name);
                  }}
                  className="py-1 hover:underline flex items-center gap-1"
                >
                  <AlbumIcon width="16" height="16" />
                  <span>{r.name} </span>
                  {r.name === lastWsName && (
                    <span className="font-light italic text-colorNeutralTextSubdued">
                      (последнее открытое)
                    </span>
                  )}
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
