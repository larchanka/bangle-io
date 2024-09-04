import React, { useCallback, useState } from 'react';

import { nsmApi2, useNsmSliceDispatch, useNsmSliceState } from '@bangle.io/api';
import { Dialog } from '@bangle.io/ui-components';

import { DISCARD_LOCAL_CHANGES_DIALOG } from '../common';
import { nsmGhSlice, operations } from '../state';

export function DiscardLocalChangesDialog() {
  const [isProcessing, updateIsProcessing] = useState(false);
  const [manuallyReload, updateManuallyReload] = useState(false);

  const { githubWsName } = useNsmSliceState(nsmGhSlice);

  const dispatch = useNsmSliceDispatch(nsmGhSlice);

  const dismiss = useCallback(() => {
    if (!isProcessing) {
      nsmApi2.ui.dismissDialog(DISCARD_LOCAL_CHANGES_DIALOG);
    }
  }, [isProcessing]);

  if (manuallyReload) {
    return (
      <Dialog
        isDismissable={false}
        headingTitle="Подтвердите отмену локальных изменений"
        onDismiss={() => {}}
      >
        Перезагрузите приложение вручную
      </Dialog>
    );
  }

  if (!githubWsName) {
    return (
      <Dialog
        isDismissable
        onDismiss={() => {
          dismiss();
        }}
        headingTitle="Это не репозиторий Github"
      >
        Это действие может быть выполнено только в репозитории Github.
        Пожалуйста, откройте репозиторий Github и повторите попытку.
      </Dialog>
    );
  }

  return (
    <Dialog
      isDismissable
      headingTitle="Подтвердите отмену локальных изменений"
      isLoading={isProcessing}
      primaryButtonConfig={{
        isDestructive: true,
        text: 'Отменить',
        onPress: async () => {
          if (isProcessing) {
            return;
          }
          if (githubWsName) {
            updateIsProcessing(true);

            dispatch(operations.discardLocalChanges(githubWsName, true));

            dismiss();
          }
        },
      }}
      onDismiss={() => {
        dismiss();
      }}
    >
      Вы уверены, что хотите отменить все локальные изменения? Это действие не
      может быть отменено и может привести к{' '}
      <b>потере всех несохраненных изменений</b>.
    </Dialog>
  );
}
