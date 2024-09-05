import React from 'react';

import { nsmApi2 } from '@bangle.io/api';
import { CorePalette } from '@bangle.io/constants';
import { vars } from '@bangle.io/css-vars';
import { safeRequestAnimationFrame } from '@bangle.io/utils';

import type { WorkspaceCreateErrorTypes } from './common';
import {
  CLICKED_TOO_SOON_ERROR,
  ERROR_PICKING_DIRECTORY_ERROR,
  INVALID_WORKSPACE_NAME_ERROR,
  UNKNOWN_ERROR,
  WORKSPACE_AUTH_REJECTED_ERROR,
  WORKSPACE_NAME_ALREADY_EXISTS_ERROR,
} from './common';

export function ShowError({
  errorType,
  closeModal,
}: {
  errorType: WorkspaceCreateErrorTypes | undefined;
  closeModal: () => void;
}) {
  if (!errorType) {
    return null;
  }

  let content, title;

  switch (errorType) {
    case WORKSPACE_NAME_ALREADY_EXISTS_ERROR: {
      title = 'Пространство с таким именем уже существует';
      content = (
        <div>
          <button
            className="underline"
            onClick={() => {
              closeModal();
              safeRequestAnimationFrame(() => {
                nsmApi2.ui.togglePalette(CorePalette.Workspace);
              });
            }}
          >
            Нажмите
          </button>{' '}
          для открытия
        </div>
      );
      break;
    }

    case ERROR_PICKING_DIRECTORY_ERROR: {
      title = 'Ошибка открытия папки с заметками.';
      content = (
        <div>
          Пожалуйста, убедитесь, что папка с заметками находится в общем месте,
          например, в Документах или на Рабочем столе.
        </div>
      );
      break;
    }

    case CLICKED_TOO_SOON_ERROR: {
      title = 'Что-то пошло не так';
      content = <div>Пожалуйста, нажмите кнопку "Выбрать" снова.</div>;
      break;
    }
    case INVALID_WORKSPACE_NAME_ERROR: {
      title = 'Недопустимое имя рабочего пространства';
      content = (
        <div>
          Имя рабочего пространства не может содержать <code>:</code>.
        </div>
      );
      break;
    }
    case WORKSPACE_AUTH_REJECTED_ERROR: {
      title = 'Дневник не получил доступ к вашим заметкам.';
      content = (
        <div>
          Пожалуйста, попробуйте снова и нажмите <i>разрешить</i>, чтобы Дневник
          мог получить доступ к вашим локально сохраненным заметкам.
        </div>
      );
      break;
    }
    case UNKNOWN_ERROR: {
      title = 'Произошла неизвестная ошибка.';
      content = (
        <div>
          Пожалуйста, перезагрузите страницу и попробуйте снова. Если проблема
          все еще существует, создайте тему на{' '}
          <a href="#/issues" className="underline">
            Github
          </a>{' '}
        </div>
      );
      break;
    }

    default: {
      // hack to catch switch slipping
      let val: never = errorType;
      throw new Error('Неизвестная ошибка ' + val);
    }
  }

  return (
    <div
      className="w-full m-1 px-5 py-3 text-center rounded"
      data-testid={errorType}
      style={{
        backgroundColor: vars.color.critical.solidFaint,
        color: vars.color.critical.solidText,
      }}
    >
      <div className="font-semibold text-left">{title}</div>
      <div className="text-left">{content}</div>
    </div>
  );
}
