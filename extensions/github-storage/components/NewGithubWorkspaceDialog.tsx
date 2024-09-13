import React, { useCallback, useEffect, useState } from 'react';

import { nsmApi2 } from '@bangle.io/api';
import {
  Dialog,
  ErrorBanner,
  ExternalLink,
  GithubIcon,
  TextField,
} from '@bangle.io/ui-components';
import { useDebouncedValue } from '@bangle.io/utils';

import {
  NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG,
  NEW_GITHUB_WORKSPACE_TOKEN_DIALOG,
} from '../common';
import { getGhToken, updateGhToken } from '../database';
import { ALLOWED_GH_SCOPES, hasValidGithubScope } from '../github-api-helpers';

const MIN_HEIGHT = 200;

export function NewGithubWorkspaceTokenDialog() {
  const [inputToken, updateInputToken] = useState<string | undefined>(
    undefined,
  );
  const [isLoading, updateIsLoading] = useState(false);
  const [error, updateError] = useState<Error | undefined>(undefined);

  const deferredIsLoading = useDebouncedValue(isLoading, { wait: 100 });

  useEffect(() => {
    getGhToken().then((token) => {
      if (token) {
        updateInputToken(token);
      }
    });
  }, []);

  const onNext = useCallback(async () => {
    if (!inputToken) {
      return;
    }
    try {
      updateIsLoading(true);
      updateError(undefined);

      if (!(await hasValidGithubScope({ token: inputToken }))) {
        throw new Error(
          `Bangle.io requires the one of the following scopes: ${ALLOWED_GH_SCOPES.join(
            ', ',
          )}`,
        );
      }
      await updateGhToken(inputToken);
      nsmApi2.ui.showDialog({
        dialogName: NEW_GITHUB_WORKSPACE_REPO_PICKER_DIALOG,
        metadata: {
          githubToken: inputToken,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        updateError(error);
      }
    } finally {
      updateIsLoading(false);
    }
  }, [inputToken]);

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter') {
        onNext();
      }
    },
    [onNext],
  );

  return (
    <Dialog
      isDismissable
      headingTitle="Github пространтсво"
      dismissText="Отмена"
      isLoading={deferredIsLoading}
      primaryButtonConfig={{
        text: 'Далее',
        disabled: !inputToken || inputToken.length === 0,
        onPress: onNext,
      }}
      onDismiss={() => {
        nsmApi2.ui.dismissDialog(NEW_GITHUB_WORKSPACE_TOKEN_DIALOG);
      }}
      headingIcon={<GithubIcon className="w-8 h-8" />}
      footer={
        <ExternalLink
          text="Как создать новый Github-токен?"
          href="https://docs.github.com/ru/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
        />
      }
    >
      <div style={{ minHeight: MIN_HEIGHT }}>
        {error && <ErrorBanner title={`Error`} content={error.message} />}
        Пожалуйста, введите персональный токен доступа для связи с Github. Токен
        будет безопасно храниться в локальном хранилище вашего браузера.
        <div className="my-4">
          <TextField
            spellCheck={false}
            onKeyDown={onKeyDown}
            placeholder="Github-токен"
            label="Токен"
            value={inputToken}
            onChange={(val) => {
              updateInputToken(val);
            }}
          />
        </div>
      </div>
    </Dialog>
  );
}
