import React from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { useNsmSlice } from '@bangle.io/bangle-store-context';
import {
  CORE_OPERATIONS_NEW_WORKSPACE,
  CorePalette,
} from '@bangle.io/constants';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';
import { Button, CenteredBoxedPage } from '@bangle.io/ui-components';

import { WorkspaceSpan } from './WorkspaceNeedsAuth';

export function WorkspaceNotFound({ wsName }: { wsName?: string }) {
  // wsName can't be read here from the store because it is not found
  const { dispatchSerialOperation } = useSerialOperationContext();
  const [, uiDispatch] = useNsmSlice(nsmUISlice);

  wsName = decodeURIComponent(wsName || '');

  return (
    <CenteredBoxedPage
      title={
        <span className="font-normal">
          <WorkspaceSpan wsName={wsName || ''} emoji={'🕵️‍♀️'} />{' '}
          <span className="pl-1"> не найдено</span>
        </span>
      }
      actions={
        <>
          <Button
            ariaLabel="открыть другое пространство"
            text="Переключить пространство"
            onPress={() => {
              uiDispatch(nsmUI.togglePalette(CorePalette.Workspace));
            }}
          />
          <Button
            ariaLabel="Новое пространство"
            text="Новое пространство"
            onPress={() => {
              dispatchSerialOperation({
                name: CORE_OPERATIONS_NEW_WORKSPACE,
              });
            }}
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
