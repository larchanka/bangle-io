import React, { useEffect, useState } from 'react';

import { requestNativeBrowserFSPermission } from '@bangle.io/baby-fs';
import {
  useNsmSliceDispatch,
  useNsmSliceState,
} from '@bangle.io/bangle-store-context';
import { SEVERITY, WorkspaceType } from '@bangle.io/constants';
import type { WorkspaceInfo } from '@bangle.io/shared-types';
import { nsmNotification } from '@bangle.io/slice-notification';
import {
  goToLandingPage,
  goToWorkspaceHome,
  goToWsNameRouteNotFoundRoute,
  nsmPageSlice,
} from '@bangle.io/slice-page';
import { nsmUISlice } from '@bangle.io/slice-ui';
import { AlbumIcon, Button, CenteredBoxedPage } from '@bangle.io/ui-components';
import { keybindingsHelper } from '@bangle.io/utils';
import { readWorkspaceInfo } from '@bangle.io/workspace-info';
import { createWsName } from '@bangle.io/ws-path';

export function WorkspaceNativefsAuthBlockade({
  wsName: _wsName,
}: {
  wsName: string;
}) {
  const wsName = createWsName(decodeURIComponent(_wsName || ''));
  const [permissionDenied, updatePermissionDenied] = useState(false);
  const pageDispatch = useNsmSliceDispatch(nsmPageSlice);
  const notificationDispatch = useNsmSliceDispatch(
    nsmNotification.nsmNotificationSlice,
  );

  const [wsInfo, updateWsInfo] = useState<WorkspaceInfo>();

  useEffect(() => {
    let destroyed = false;

    readWorkspaceInfo(wsName).then(
      (wsInfo) => {
        if (destroyed) {
          return;
        }
        if (!wsInfo) {
          pageDispatch(goToWsNameRouteNotFoundRoute({ wsName }));
        } else {
          updateWsInfo(wsInfo);
        }
      },
      (error) => {
        if (destroyed) {
          return;
        }

        notificationDispatch(
          nsmNotification.showNotification({
            content: `Ошибка чтения пространства ${wsName}. ${error.message}`,
            title: 'Ошибка',
            severity: SEVERITY.ERROR,
            uid: 'workspace-info-read-error' + Date.now(),
          }),
        );

        // TODO should we try send to storage error handling?
        // the problem is that it could cause infinite loop
        console.error(error);

        return;
      },
    );

    return () => {
      destroyed = true;
    };
  }, [wsName, pageDispatch, notificationDispatch]);

  const onGranted = () => {
    pageDispatch(goToWorkspaceHome({ wsName, replace: true }));
  };

  const requestFSPermission = async () => {
    if (!wsInfo) {
      throw new Error('пространство не найдено');
    }
    if (wsInfo.type !== WorkspaceType.NativeFS) {
      onGranted();

      return true;
    }

    const result = await requestNativeBrowserFSPermission(
      wsInfo.metadata.rootDirHandle,
    );

    if (result) {
      onGranted();

      return true;
    } else {
      updatePermissionDenied(true);

      return false;
    }
  };

  useEffect(() => {
    if (!wsName) {
      pageDispatch(goToLandingPage());
    }
  }, [pageDispatch, wsName]);

  if (!wsName || !wsInfo) {
    return null;
  }

  return (
    <PermissionModal
      permissionDenied={permissionDenied}
      requestFSPermission={requestFSPermission}
      wsName={wsName}
    />
  );
}

function PermissionModal({
  permissionDenied,
  requestFSPermission,
  wsName,
}: {
  permissionDenied: boolean;
  requestFSPermission: () => Promise<boolean>;
  wsName: string;
}) {
  const { dialogName, paletteType } = useNsmSliceState(nsmUISlice);

  const isPaletteActive = Boolean(paletteType);
  useEffect(() => {
    let callback = keybindingsHelper({
      Enter: () => {
        if (isPaletteActive || dialogName) {
          return false;
        }
        requestFSPermission();

        return true;
      },
    });
    document.addEventListener('keydown', callback);

    return () => {
      document.removeEventListener('keydown', callback);
    };
  }, [requestFSPermission, isPaletteActive, dialogName]);

  return (
    <CenteredBoxedPage
      title={
        <span className="font-normal">
          <WorkspaceSpan
            wsName={wsName}
            emoji={permissionDenied ? '❌' : '📖'}
          />
          <span className="pl-1">
            {permissionDenied ? 'доступ запрещен' : 'необходимо разрешение'}
          </span>
        </span>
      }
      actions={
        <Button
          tone="promote"
          ariaLabel="Дать доступ к диску"
          onPress={() => {
            requestFSPermission();
          }}
          text="Разрешить доступ [Ввод]"
        />
      }
    >
      <span>
        Дневник не может работать без доступа к файлам. Нажмите кнопку{' '}
      </span>
    </CenteredBoxedPage>
  );
}

export function WorkspaceSpan({
  wsName,
  emoji = '📖',
}: {
  wsName: string;
  emoji?: string;
}) {
  return (
    <>
      <span className="font-normal flex" style={{ gap: '.25rem' }}>
        <AlbumIcon width="16" height="16" />
        <span>Пространство</span>
        <span className="font-bold overflow-hidden text-ellipsis">
          {wsName}
        </span>
      </span>
    </>
  );
}
