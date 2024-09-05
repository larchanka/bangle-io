import { nsmApi2 } from '@bangle.io/api';
import {
  CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
  SEVERITY,
} from '@bangle.io/constants';
import type { ErrorCodeType as RemoteFileSyncErrorCodeType } from '@bangle.io/remote-file-sync';
import { ErrorCode as RemoteSyncErrorCode } from '@bangle.io/remote-file-sync';
import { isIndexedDbException } from '@bangle.io/storage';
import { BaseError } from '@bangle.io/utils';

import { OPERATION_UPDATE_GITHUB_TOKEN } from './common';
import type { ErrorCodesType } from './errors';
import {
  GITHUB_API_ERROR,
  GITHUB_STORAGE_NOT_ALLOWED,
  INVALID_GITHUB_FILE_FORMAT,
  INVALID_GITHUB_RESPONSE,
  INVALID_GITHUB_TOKEN,
} from './errors';

export function handleError(error: Error) {
  if (!(error instanceof BaseError)) {
    return false;
  }

  const errorCode = error.code as ErrorCodesType | RemoteFileSyncErrorCodeType;

  if (isIndexedDbException(error)) {
    console.debug(error.code, error.name);

    nsmApi2.ui.showNotification({
      severity: SEVERITY.ERROR,
      title: 'Error writing to browser storage',
      content: error.message,
      uid: errorCode + Math.random(),
      buttons: [],
    });

    return true;
  }

  switch (errorCode) {
    case GITHUB_API_ERROR: {
      if (error.message.includes('Bad credentials')) {
        nsmApi2.ui.showNotification({
          severity: SEVERITY.ERROR,
          title: 'Ошибка входа в Github',
          content:
            'Проверьте, что ваш Github-токен обладает необхзодимыми правами.',
          uid: `github-storage-error-${errorCode}`,
          buttons: [
            {
              title: 'Обновить токен',
              hint: `Обновить ваш Github-токен`,
              operation: OPERATION_UPDATE_GITHUB_TOKEN,
              dismissOnClick: true,
            },
          ],
        });

        break;
      }
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        title: 'Ошибка Github API',
        content: error.message,
        uid: `github-storage-error-${errorCode}`,
        buttons: [],
      });
      break;
    }
    case INVALID_GITHUB_FILE_FORMAT: {
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        title: 'Неверный формат файла',
        content: error.message,
        uid: `github-file-format`,
        buttons: [],
      });
      break;
    }
    case INVALID_GITHUB_TOKEN: {
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        title: 'Github-токен недействителен',
        content:
          'Проверьте, что ваш Github-токен обладает необхзодимыми правами.',
        uid: `github-storage-error-${errorCode}`,
        buttons: [
          {
            title: 'Обновить токен',
            hint: `Обновить ваш Github-токен`,
            operation: OPERATION_UPDATE_GITHUB_TOKEN,
            dismissOnClick: true,
          },
        ],
      });

      break;
    }

    case INVALID_GITHUB_RESPONSE: {
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        title: 'Получен некорректный ответ Github',
        content: error.message,
        uid: INVALID_GITHUB_RESPONSE,
        buttons: [],
      });
      break;
    }

    case GITHUB_STORAGE_NOT_ALLOWED: {
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        title: 'Запрещено',
        content: error.message,
        uid: GITHUB_STORAGE_NOT_ALLOWED + error.message,
        buttons: [],
      });
      break;
    }

    case RemoteSyncErrorCode.REMOTE_SYNC_NOT_ALLOWED_ERROR: {
      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        title: 'Запрещено',
        content: error.message,
        uid: RemoteSyncErrorCode.REMOTE_SYNC_NOT_ALLOWED_ERROR + error.message,
        buttons: [],
      });
      break;
    }

    default: {
      // hack to catch switch slipping
      let val: never = errorCode;

      console.error(error);

      nsmApi2.ui.showNotification({
        severity: SEVERITY.ERROR,
        title: 'Ошибка 📕 Дневника.',
        uid: `uncaughtExceptionNotification-` + error.name,
        buttons: [
          {
            title: 'Отправить отчёт об ошибке',
            hint: `Отправить отчёт об ошибке на Github`,
            operation: CORE_OPERATIONS_OPEN_GITHUB_ISSUE,
          },
        ],
        content: error.message,
      });

      return false;
    }
  }

  return true;
}
