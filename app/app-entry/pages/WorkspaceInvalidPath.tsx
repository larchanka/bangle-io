import React from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { useNsmSliceDispatch } from '@bangle.io/bangle-store-context';
import {
  CORE_OPERATIONS_NEW_WORKSPACE,
  CorePalette,
} from '@bangle.io/constants';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';
import { Button, CenteredBoxedPage } from '@bangle.io/ui-components';

export function WorkspaceInvalidPath() {
  const { dispatchSerialOperation } = useSerialOperationContext();
  const uiDispatch = useNsmSliceDispatch(nsmUISlice);

  return (
    <CenteredBoxedPage
      title={
        <span className="font-normal">
          <span className="pl-1">🙈 Неверный путь</span>
        </span>
      }
      actions={
        <>
          <Button
            ariaLabel="Открыть другое пространство"
            text="Переключить пространство"
            onPress={() => {
              uiDispatch(nsmUI.togglePalette(CorePalette.Workspace));
            }}
          />

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
      <span>Если вы считаете, что это – ошибка, напишите нам на </span>
      <a
        target="_blank"
        rel="noreferrer"
        className="font-extrabold underline"
        href="#/issues/new"
      >
        Github
      </a>
    </CenteredBoxedPage>
  );
}
