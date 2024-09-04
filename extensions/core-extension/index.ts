import { internalApi, nsmApi2 } from '@bangle.io/api';
import {
  CHANGELOG_MODAL_NAME,
  CORE_OPERATIONS_CLOSE_EDITOR,
  CORE_OPERATIONS_CLOSE_MINI_EDITOR,
  CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
  CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
  CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE,
  CORE_OPERATIONS_NEW_NOTE,
  CORE_OPERATIONS_NEW_WORKSPACE,
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  CORE_OPERATIONS_OPEN_IN_MINI_EDITOR,
  CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE,
  CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE,
  CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
  CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
  GENERIC_ERROR_MODAL_NAME,
  NEW_BROWSER_WORKSPACE_DIALOG_NAME,
  NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME,
  NEW_NOTE_DIALOG_NAME,
  NEW_PRIVATE_FS_WORKSPACE_DIALOG_NAME,
  NEW_WORKSPACE_DIALOG_NAME,
  RELOAD_APPLICATION_DIALOG_NAME,
  RENAME_NOTE_DIALOG_NAME,
  SECONDARY_EDITOR_INDEX,
  SEVERITY,
  WorkspaceType,
} from '@bangle.io/constants';
import { Extension } from '@bangle.io/extension-registry';
import type { WsName } from '@bangle.io/shared-types';
import { createWsName } from '@bangle.io/ws-path';

import {
  CORE_OPERATIONS_DELETE_ACTIVE_NOTE,
  CORE_OPERATIONS_DOWNLOAD_WORKSPACE_COPY,
  CORE_OPERATIONS_NEW_WORKSPACE_FROM_BACKUP,
  CORE_OPERATIONS_RENAME_ACTIVE_NOTE,
  CORE_OPERATIONS_TOGGLE_NOTE_SIDEBAR,
  CORE_OPERATIONS_TOGGLE_UI_COLOR_SCHEME,
  extensionName,
} from './config';
import { ChangelogModal } from './dialogs/ChangelogModal';
import { GenericErrorModal } from './dialogs/GenericErrorModal';
import { NewBrowserWorkspaceDialog } from './dialogs/NewBrowserWorkspaceDialog';
import { NewNativeFsWorkspaceDialog } from './dialogs/NewNativeFsWorkspaceDialog';
import { NewPrivateFsWorkspaceDialog } from './dialogs/NewPrivateFsWorkspaceDialog';
import { NewWorkspaceModal } from './dialogs/NewWorkspaceModal';
import {
  NewNoteInputModal,
  RenameNoteInputModal,
} from './dialogs/NoteNameChangeDialog';
import { ReloadApplicationDialog } from './dialogs/ReloadApplicationDialog';
import {
  deleteActiveNote,
  downloadWorkspace,
  removeWorkspace,
  restoreWorkspaceFromBackup,
} from './operations';

const extension = Extension.create({
  name: extensionName,
  application: {
    dialogs: [
      {
        name: CHANGELOG_MODAL_NAME,
        ReactComponent: ChangelogModal,
      },
      {
        name: NEW_NOTE_DIALOG_NAME,
        ReactComponent: NewNoteInputModal,
      },
      {
        name: RENAME_NOTE_DIALOG_NAME,
        ReactComponent: RenameNoteInputModal,
      },
      {
        name: NEW_WORKSPACE_DIALOG_NAME,
        ReactComponent: NewWorkspaceModal,
      },
      {
        name: NEW_NATIVE_FS_WORKSPACE_DIALOG_NAME,
        ReactComponent: NewNativeFsWorkspaceDialog,
      },
      {
        name: NEW_BROWSER_WORKSPACE_DIALOG_NAME,
        ReactComponent: NewBrowserWorkspaceDialog,
      },
      {
        name: NEW_PRIVATE_FS_WORKSPACE_DIALOG_NAME,
        ReactComponent: NewPrivateFsWorkspaceDialog,
      },
      {
        name: RELOAD_APPLICATION_DIALOG_NAME,
        ReactComponent: ReloadApplicationDialog,
      },
      {
        name: GENERIC_ERROR_MODAL_NAME,
        ReactComponent: GenericErrorModal,
      },
    ],
    operations: [
      {
        name: CORE_OPERATIONS_CLOSE_EDITOR,
        title: 'Закрыть все открытые редакторы',
        keywords: ['dismiss', 'hide'],
      },
      {
        name: CORE_OPERATIONS_DELETE_ACTIVE_NOTE,
        title: 'Удалить текущую заметку',
        keywords: ['remove'],
      },
      {
        name: CORE_OPERATIONS_NEW_NOTE,
        title: 'Новая заметка',
        keywords: ['create'],
        preventEditorFocusOnExecute: true,
      },
      {
        name: CORE_OPERATIONS_NEW_WORKSPACE,
        title: 'Новое пространство',
        keywords: ['create'],
        preventEditorFocusOnExecute: true,
      },
      {
        name: CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE,
        title: 'Удалить текущее пространство',
        keywords: ['delete'],
      },
      {
        name: CORE_OPERATIONS_RENAME_ACTIVE_NOTE,
        title: 'Переименовать текущую заметку',
        preventEditorFocusOnExecute: true,
      },
      {
        name: CORE_OPERATIONS_TOGGLE_NOTE_SIDEBAR,
        title: 'Показать/спрятать дополнения',
        keywords: ['hide', 'outline', 'toc', 'backlink', 'right sidebar'],
      },
      {
        name: CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT,
        title: 'Показать/спрятать разделение экрана',
        keybinding: 'Mod-\\',
        keywords: ['hide'],
      },
      {
        name: CORE_OPERATIONS_OPEN_IN_MINI_EDITOR,
        title: 'Открыть в мини-редакторе',
        keywords: ['preview'],
      },
      {
        name: CORE_OPERATIONS_CLOSE_MINI_EDITOR,
        title: 'Закрыть мини-редактор',
        keywords: ['hide'],
      },
      {
        name: CORE_OPERATIONS_TOGGLE_UI_COLOR_SCHEME,
        title: 'Сменить светлую/темную тему',
        keywords: ['darkmode', 'lightmode', 'color'],
      },
      {
        name: CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
        title: 'Создать пространство с локальными файлами',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
        title: 'Создать пространство в браузере',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE,
        title: 'Создать приватное пространство с локальными файлами',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_SERVICE_WORKER_RELOAD,
        title: 'Обновить страницу в ответ на обновление служебного воркера',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_SERVICE_WORKER_DISMISS_UPDATE,
        title: 'Закрыть уведомление об обновлении служебного воркера',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
        title: 'Рассказать о проблеме',
        hidden: true,
      },
      {
        name: CORE_OPERATIONS_DOWNLOAD_WORKSPACE_COPY,
        title: 'Скачать резервную копию пространства',
      },
      {
        name: CORE_OPERATIONS_NEW_WORKSPACE_FROM_BACKUP,
        title: 'Восстановить пространство из резервной копии',
      },
      {
        name: 'operation::@bangle.io/core-extension:focus-primary-editor',
        title: 'Редактор: Фокус на главном редакторе',
      },
      {
        name: 'operation::@bangle.io/core-extension:focus-secondary-editor',
        title: 'Редактор: Фокус на вторичном редакторе',
      },
      {
        name: 'operation::@bangle.io/core-extension:toggle-editing-mode',
        title: 'Редактор: Переключить режим редактирования',
      },
      {
        name: 'operation::@bangle.io/core-extension:reload-application',
        title: 'Перезагрузить приложение',
      },
      {
        name: 'operation::@bangle.io/core-extension:show-changelog',
        title: 'Показать изменения',
        keywords: ['update', 'what is new'],
        preventEditorFocusOnExecute: true,
      },
    ],
    operationHandler() {
      return {
        handle(operation, payload: unknown) {
          switch (operation.name) {
            case CORE_OPERATIONS_NEW_NOTE: {
              if (!nsmApi2.workspace.workspaceState().wsName) {
                nsmApi2.ui.showNotification({
                  severity: SEVERITY.ERROR,
                  uid: 'new-note-not-no-workspace',
                  title: 'Сначала выберите пространство',
                });

                return true;
              }
              // TODO fix payload as any
              const { path } = (payload as any) || {};

              let _path = typeof path === 'string' ? path : undefined;

              nsmApi2.ui.showDialog({
                dialogName: NEW_NOTE_DIALOG_NAME,
                metadata: {
                  initialValue: _path,
                },
              });

              return true;
            }

            case CORE_OPERATIONS_NEW_WORKSPACE: {
              nsmApi2.ui.showDialog({
                dialogName: NEW_WORKSPACE_DIALOG_NAME,
              });

              return true;
            }

            case CORE_OPERATIONS_RENAME_ACTIVE_NOTE: {
              nsmApi2.ui.updatePalette(undefined);
              nsmApi2.ui.showDialog({
                dialogName: RENAME_NOTE_DIALOG_NAME,
              });

              return true;
            }

            case CORE_OPERATIONS_TOGGLE_NOTE_SIDEBAR: {
              nsmApi2.ui.toggleNoteSidebar();

              return true;
            }

            case CORE_OPERATIONS_DELETE_ACTIVE_NOTE: {
              deleteActiveNote();

              return true;
            }

            case CORE_OPERATIONS_TOGGLE_EDITOR_SPLIT: {
              const { openedWsPaths } = nsmApi2.workspace.workspaceState();

              if (openedWsPaths.secondaryWsPath) {
                nsmApi2.workspace.pushOpenedWsPath((openedWsPath) =>
                  openedWsPath.updateSecondaryWsPath(undefined),
                );
              } else if (openedWsPaths.primaryWsPath) {
                nsmApi2.workspace.pushOpenedWsPath((openedWsPath) =>
                  openedWsPath.updateSecondaryWsPath(
                    openedWsPaths.primaryWsPath,
                  ),
                );
              }

              return true;
            }

            case CORE_OPERATIONS_OPEN_IN_MINI_EDITOR: {
              const targetWsPath =
                nsmApi2.workspace.workspaceState().primaryWsPath;

              if (targetWsPath) {
                nsmApi2.workspace.pushOpenedWsPath((openedWsPath) =>
                  openedWsPath.updateMiniEditorWsPath(targetWsPath),
                );
              }

              return true;
            }
            case CORE_OPERATIONS_CLOSE_MINI_EDITOR: {
              nsmApi2.workspace.pushOpenedWsPath((openedWsPath) =>
                openedWsPath.updateMiniEditorWsPath(undefined),
              );

              return true;
            }

            case CORE_OPERATIONS_CLOSE_EDITOR: {
              if (typeof payload === 'number') {
                nsmApi2.workspace.closeEditor(payload);

                return true;
              } else {
                nsmApi2.workspace.closeEditor();

                return true;
              }
            }

            case CORE_OPERATIONS_DOWNLOAD_WORKSPACE_COPY: {
              downloadWorkspace();

              return true;
            }

            case CORE_OPERATIONS_NEW_WORKSPACE_FROM_BACKUP: {
              restoreWorkspaceFromBackup();

              return true;
            }

            case CORE_OPERATIONS_REMOVE_ACTIVE_WORKSPACE: {
              const targetWsName =
                typeof payload === 'string' ? payload : undefined;

              removeWorkspace(
                targetWsName ? createWsName(targetWsName) : undefined,
              );

              return true;
            }
            case 'operation::@bangle.io/core-extension:focus-primary-editor': {
              nsmApi2.editor.getPrimaryEditor()?.focusView();

              return true;
            }

            case 'operation::@bangle.io/core-extension:focus-secondary-editor': {
              nsmApi2.editor.getEditor(SECONDARY_EDITOR_INDEX)?.focusView();

              return true;
            }

            case CORE_OPERATIONS_TOGGLE_UI_COLOR_SCHEME: {
              nsmApi2.ui.toggleColorSchema();

              return true;
            }

            case CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE: {
              // TODO fix payload as any
              const { wsName } = (payload as any) || {};

              createBrowserWorkspace(wsName);

              return true;
            }

            case CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE: {
              // TODO fix payload as any
              const { wsName } = (payload as any) || {};

              console.debug('Creating private fs workspace', wsName);

              createPrivateFsWorkspace(wsName);

              return true;
            }

            case CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE: {
              // TODO fix payload as any
              const { rootDirHandle } = (payload as any) || {};
              createNativeFsWorkspace(rootDirHandle);

              return true;
            }

            case CORE_OPERATIONS_OPEN_GITHUB_ISSUE: {
              window.open(`https://github.com/bangle-io/bangle-io/issues/new`);

              return true;
            }

            case 'operation::@bangle.io/core-extension:toggle-editing-mode': {
              nsmApi2.editor.toggleEditing();
              let { editingAllowed } = nsmApi2.editor.editorState();

              nsmApi2.ui.showNotification({
                severity: editingAllowed ? SEVERITY.INFO : SEVERITY.WARNING,
                uid: 'editing-mode' + editingAllowed + Date.now(),
                title:
                  'Режим редактирования ' +
                  (editingAllowed ? 'включен' : 'выключен'),
              });

              return true;
            }

            case 'operation::@bangle.io/core-extension:reload-application': {
              nsmApi2.ui.showDialog({
                dialogName: RELOAD_APPLICATION_DIALOG_NAME,
              });

              return true;
            }
            case 'operation::@bangle.io/core-extension:show-changelog': {
              nsmApi2.ui.showDialog({
                dialogName: CHANGELOG_MODAL_NAME,
              });

              return true;
            }

            default: {
              return false;
            }
          }
        },
      };
    },
  },
});

export default extension;

export * from './operations';

async function createNativeFsWorkspace(rootDirHandle: any) {
  const wsName = rootDirHandle?.name;

  if (typeof wsName === 'string') {
    try {
      await internalApi.workspace.createWorkspace(
        createWsName(wsName),
        WorkspaceType.NativeFS,
        {
          rootDirHandle,
        },
      );
      (window as any).fathom?.trackGoal('K3NFTGWX', 0);
    } catch (error: any) {
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        uid: 'error-create-workspace-' + rootDirHandle?.name,
        title: 'Не могу создать пространство ' + rootDirHandle?.name,
        content: error.displayMessage || error.message,
      });

      throw error;
    }
  } else {
    throw new Error(
      'Incorrect parameters for ' + CORE_OPERATIONS_CREATE_NATIVE_FS_WORKSPACE,
    );
  }

  return true;
}

async function createBrowserWorkspace(wsName: WsName) {
  if (typeof wsName !== 'string') {
    throw new Error(
      'Incorrect parameters for ' + CORE_OPERATIONS_CREATE_BROWSER_WORKSPACE,
    );
  }

  try {
    await internalApi.workspace.createWorkspace(
      wsName,
      WorkspaceType.Browser,
      {},
    );

    (window as any).fathom?.trackGoal('AISLCLRF', 0);
  } catch (error: any) {
    nsmApi2.ui.showNotification({
      severity: SEVERITY.ERROR,
      uid: 'error-create-workspace-' + wsName,
      title: 'Не могу создать пространство ' + wsName,
      content: error.displayMessage || error.message,
    });
    throw error;
  }

  return true;
}

async function createPrivateFsWorkspace(wsName: WsName) {
  if (typeof wsName !== 'string') {
    throw new Error(
      'Incorrect parameters for ' + CORE_OPERATIONS_CREATE_PRIVATE_FS_WORKSPACE,
    );
  }

  try {
    await internalApi.workspace.createWorkspace(
      wsName,
      WorkspaceType.PrivateFS,
      {},
    );

    (window as any).fathom?.trackGoal('KWXITXAK', 0);
  } catch (error: any) {
    nsmApi2.ui.showNotification({
      severity: SEVERITY.ERROR,
      uid: 'error-create-workspace-' + wsName,
      title: 'Не могу создать пространство ' + wsName,
      content: error.displayMessage || error.message,
    });
    throw error;
  }

  return true;
}
