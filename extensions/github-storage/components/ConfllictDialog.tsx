import React, { useCallback, useEffect } from 'react';

import { nsmApi2, useNsmSliceDispatch, useNsmSliceState } from '@bangle.io/api';
import { SEVERITY } from '@bangle.io/constants';
import { NoteLink } from '@bangle.io/contextual-ui-components';
import { Dialog } from '@bangle.io/ui-components';

import { CONFLICT_DIALOG } from '../common';
import { nsmGhSlice, operations } from '../state';

export function ConflictDialog() {
  const dismiss = useCallback(() => {
    nsmApi2.ui.dismissDialog(CONFLICT_DIALOG);
  }, []);

  const { conflictedWsPaths, githubWsName } = useNsmSliceState(nsmGhSlice);
  const nsmDispatch = useNsmSliceDispatch(nsmGhSlice);

  useEffect(() => {
    if (conflictedWsPaths.length === 0) {
      dismiss();

      nsmApi2.ui.showNotification({
        title: 'Нет конфликтов',
        severity: SEVERITY.INFO,
        uid: 'gh-conflict' + Date.now(),
        transient: true,
      });
    }
  }, [conflictedWsPaths, dismiss]);

  return (
    <Dialog
      isDismissable
      headingTitle="Конфликт"
      onDismiss={dismiss}
      primaryButtonConfig={{
        text: 'Вручную',
        onPress: () => {
          if (githubWsName) {
            nsmDispatch(operations.manuallyResolveConflict(githubWsName));
          }
          dismiss();
        },
      }}
      allowScroll
    >
      <p className="text-sm">
        Дневник не может синхронизировать следующие файлы, потому что у вас есть
        локальные изменения, а также изменения в удаленном репозитории, которые
        конфликтуют. Это может произойти, если файл изменен в нескольких местах
        одновременно.
      </p>
      <ul className="list-disc list-inside py-3 pl-2 text-sm">
        {conflictedWsPaths.map((path) => (
          <li key={path}>
            <NoteLink
              className="cursor-pointer hover:underline"
              wsPath={path}
              onClick={dismiss}
            >
              {path}
            </NoteLink>
          </li>
        ))}
      </ul>
      <p className="text-sm">You can resolve this issue by doing:</p>
      <ol className="list-decimal list-inside py-2 pl-2 text-sm">
        <li className="mb-2">
          Нажатие на кнопку "решить" создаст новый файл с тем же именем, но с
          постфиксом <code>-conflict</code> для каждого конфликтующего файла, а
          оригинальный файл будет сброшен до состояния, соответствующего
          удаленному файлу.
        </li>
        <li className="mb-2">
          Файл <code>-conflict</code> будет представлять собой ссылку на ваш
          локальный файл, чтобы вы не потеряли данные.
        </li>
        <li className="mb-2">
          Вы можете сравнить этот файл с оригинальным файлом и внести
          необходимые изменения, чтобы разрешить конфликт.
        </li>
        <li className="mb-2">
          Как только вы внесете изменения в оригинальный файл, удалите файлы
          <code>-conflict</code> и синхронизируйте снова.
        </li>
      </ol>
    </Dialog>
  );
}
