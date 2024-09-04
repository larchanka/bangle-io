import { internalApi, nsmApi2 } from '@bangle.io/api';
import {
  HELP_FS_WORKSPACE_NAME,
  SEVERITY,
  WorkerErrorCode,
} from '@bangle.io/constants';
import type { WsName } from '@bangle.io/shared-types';
import { sleep } from '@bangle.io/utils';
import { naukarProxy } from '@bangle.io/worker-naukar-proxy';
import { resolvePath2 } from '@bangle.io/ws-path';

export function downloadWorkspace() {
  const { wsName } = nsmApi2.workspace.workspaceState();

  if (!wsName) {
    nsmApi2.ui.showNotification({
      severity: SEVERITY.ERROR,
      uid: 'new-note-not-no-workspace',
      title: 'Сначала выберите рабочее пространство',
      buttons: [],
    });

    return;
  }

  const abortController = new AbortController();
  nsmApi2.ui.showNotification({
    severity: SEVERITY.INFO,
    uid: 'downloading-ws-copy' + wsName,
    title: 'Подождите! ваш файл резервной копии будет скачан через мгновение.',
    buttons: [],
  });

  naukarProxy.abortable
    .abortableBackupAllFiles(abortController.signal, wsName)
    .then((blob: File) => {
      downloadBlob(blob, blob.name);
    });
}

export function restoreWorkspaceFromBackup() {
  const { wsName } = nsmApi2.workspace.workspaceState();

  if (!wsName) {
    nsmApi2.ui.showNotification({
      buttons: [],
      severity: SEVERITY.ERROR,
      uid: 'restoreWorkspaceFromBackup-no-workspace',
      title: 'Сначала создайте пустую рабочее пространство',
    });

    return false;
  }

  filePicker()
    .then((file) => {
      const abortController = new AbortController();

      nsmApi2.ui.showNotification({
        buttons: [],
        severity: SEVERITY.INFO,
        uid: 'restoreWorkspaceFromBackup-' + wsName,
        title:
          'Подождите! Дневник обрабатывает ваши заметки. Пожалуйста, не перезагружайте и не закрывайте эту вкладку.',
      });

      return naukarProxy.abortable.abortableCreateWorkspaceFromBackup(
        abortController.signal,
        wsName,
        file,
      );
    })
    .then(() => {
      return sleep(100);
    })
    .then(
      () => {
        nsmApi2.workspace.refresh();

        nsmApi2.ui.showNotification({
          buttons: [],
          severity: SEVERITY.SUCCESS,
          uid: 'recovery-finished-' + wsName,
          title: `Восстановление прошло успешно! ${
            nsmApi2.workspace.workspaceState().noteWsPaths?.length || 0
          } заметок были восстановлены.`,
        });
      },
      (error) => {
        // comlink is unable to understand custom errors
        if (error?.message?.includes(WorkerErrorCode.EMPTY_WORKSPACE_NEEDED)) {
          nsmApi2.ui.showNotification({
            buttons: [],
            severity: SEVERITY.ERROR,
            uid: 'restoreWorkspaceFromBackup-workspace-has-things',
            title: 'Данная операция требует пустое рабочее пространство. ',
          });

          return;
        }
      },
    );

  return true;
}

export function deleteActiveNote() {
  const focusedWsPath = nsmApi2.editor.getFocusedWsPath();

  if (!focusedWsPath) {
    nsmApi2.ui.showNotification({
      severity: SEVERITY.ERROR,
      uid: 'delete-wsPath-not-found',
      title: 'Невозможно удалить, потому что нет основной заметки',
      buttons: [],
    });

    return true;
  }

  nsmApi2.ui.updatePalette(undefined);

  if (
    typeof window !== 'undefined' &&
    window.confirm(
      `Вы уверены, что хотите удалить "${
        resolvePath2(focusedWsPath).filePath
      }"? Это действие нельзя отменить.`,
    )
  ) {
    nsmApi2.workspace
      .deleteNote(focusedWsPath)
      .then(() => {
        nsmApi2.ui.showNotification({
          buttons: [],
          severity: SEVERITY.SUCCESS,
          uid: 'success-delete-' + focusedWsPath,
          title: 'Удаление прошло успешно ' + focusedWsPath,
        });
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          nsmApi2.ui.showNotification({
            buttons: [],
            severity: SEVERITY.ERROR,
            uid: 'delete-' + deleteActiveNote,
            title: error.message,
          });
        }
      });
  }

  return true;
}

export function removeWorkspace(wsName?: WsName) {
  wsName = wsName || nsmApi2.workspace.workspaceState().wsName;

  if (!wsName) {
    nsmApi2.ui.showNotification({
      buttons: [],
      severity: SEVERITY.ERROR,
      uid: 'removeWorkspace-no-workspace',
      title: 'Сначала откройте рабочее пространство',
    });

    return;
  }

  if (wsName === HELP_FS_WORKSPACE_NAME) {
    nsmApi2.ui.showNotification({
      buttons: [],
      severity: SEVERITY.ERROR,
      uid: 'removeWorkspace-not-allowed',
      title: 'Нельзя удалить справочное рабочее пространство',
    });

    return;
  }

  if (
    window.confirm(
      `Вы уверены, что хотите удалить "${wsName}"? Удаление рабочего пространства не удалит файлы внутри него.`,
    )
  ) {
    internalApi.workspace.deleteWorkspace(wsName);

    nsmApi2.ui.showNotification({
      buttons: [],
      severity: SEVERITY.SUCCESS,
      uid: 'success-removed-' + wsName,
      title: 'Удаление прошло успешно ' + wsName,
    });
  }
}

function filePicker(): Promise<File> {
  return new Promise((res, rej) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';

    input.addEventListener(
      'change',
      () => {
        const file = input.files?.[0];

        if (file) {
          res(file);
        } else {
          rej(new Error('Unable to pick backup file'));
        }
      },
      { once: true },
    );
    input.click();
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.addEventListener(
    'click',
    () => {
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 150);
    },
    { once: true },
  );

  a.click();
}
