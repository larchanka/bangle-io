import React from 'react';
import type { FallbackProps } from 'react-error-boundary';

export function ErrorBoundary({ error }: FallbackProps) {
  return (
    <div className="w-full p-4">
      <div className="w-full p-4 rounded-md B-ui-components_bangle-error-boundary">
        <div className="w-full text-5xl text-center">🤕</div>
        <h1 className="w-full my-4 text-center">Что-то пошло не так!</h1>
        <div className="w-full text-sm text-center">
          Помогите исправить ошибку{' '}
          <a
            target="_blank"
            rel="noreferrer noopener"
            className="font-extrabold underline"
            href="#/issues/new"
          >
            Github
          </a>
          <div className="w-full text-sm italic text-center">
            Ошибка: {error?.name + ':' + error?.message}
          </div>
        </div>
      </div>
    </div>
  );
}
