import React from 'react';

import { WorkspaceType } from '@bangle.io/constants';
import type { ListBoxOptionComponentType } from '@bangle.io/ui-components';
import {
  CheckIcon,
  Dialog,
  ExternalLink,
  Item,
  ListBox,
  mergeProps,
  useFocusRing,
  useListState,
  useOption,
} from '@bangle.io/ui-components';
import { cx } from '@bangle.io/utils';

import { defaultStorage, disabledStorageType } from './common';

export function PickWorkspaceType({
  onDismiss,
  onSelect,
  hasGithub,
  hasPrivateFs,
}: {
  onSelect: (type: WorkspaceType) => void;
  onDismiss: () => void;
  hasGithub?: boolean;
  hasPrivateFs: boolean;
}) {
  const [selectedKey, updateSelectedKey] =
    React.useState<WorkspaceType>(defaultStorage);

  const state = useListState({
    children: [
      <Item
        aria-label="локальное файловое хранилище"
        key={WorkspaceType.NativeFS}
        textValue="локальное файловое хранилище"
      >
        <div>
          <div>
            <span className="font-bold">Локальное файловое хранилище</span>
            {disabledStorageType.includes(WorkspaceType.NativeFS) ? (
              <span> (Не доступно)</span>
            ) : (
              <span> (Рекомендовано)</span>
            )}
          </div>
          <div>
            <span className="text-sm text-justify">
              Этот вариант позволяет сохранять заметки непосредственно в папку
              по вашему выбору. Мы рекомендуем его, так как он обеспечивает
              полный контроль над вашими данными.
            </span>
          </div>
        </div>
      </Item>,

      hasGithub ? (
        <Item key={WorkspaceType.Github} textValue="github storage">
          <div>
            <div>
              <span className="font-bold">GitHub-хранилище</span>
            </div>
            <div>
              <span className="text-sm text-justify">
                Позволяете синхронизировать ваши заметки с репозиторием GitHub
                по вашему выбору. Он будет поддерживать синхронизацию ваших
                заметок на несколько устройств.
              </span>
            </div>
          </div>
        </Item>
      ) : null,

      <Item
        key={hasPrivateFs ? WorkspaceType.PrivateFS : WorkspaceType.Browser}
        textValue="browser storage"
      >
        <div>
          <div>
            <span className="font-bold">Браузерное хранилище</span>
          </div>
          <div>
            <span className="text-sm text-justify">
              Хранит заметки в хранилище вашего браузера. Хорошее решение, если
              вы хотите попробовать Дневник. Однако, вы можете потерять ваши
              заметки, если очистите хранилище браузера.
            </span>
          </div>
        </div>
      </Item>,
    ].filter((r): r is React.ReactElement => Boolean(r)),
    selectionMode: 'single',
    disabledKeys: disabledStorageType,
    selectedKeys: [selectedKey],

    onSelectionChange(keys) {
      // keys cannot be all since single
      if (typeof keys !== 'string') {
        const key = [...keys][0];

        if (key) {
          updateSelectedKey(key as WorkspaceType);
        }
      }
    },
  });

  return (
    <Dialog
      footer={
        <ExternalLink
          text="Ваши данные остаются с вами"
          href="https://bangle.io/privacy"
        />
      }
      isDismissable
      headingTitle="Выберите тип хранилища"
      onDismiss={onDismiss}
      size="md"
      primaryButtonConfig={{
        text: 'Далее',
        onPress: () => {
          onSelect(selectedKey);
        },
      }}
    >
      <ListBox
        label="Выберите тип хранилища"
        state={state}
        optionComponent={Option}
        className="B-core-extension_pick-workspace-storage"
      />
    </Dialog>
  );
}

const Option: ListBoxOptionComponentType = ({ item, state }) => {
  // Get props for the option element
  let ref = React.useRef<HTMLLIElement>(null);

  let { optionProps, isSelected, isDisabled, isFocused } = useOption(
    { key: item.key },
    state,
    ref,
  );

  // Determine whether we should show a keyboard
  // focus ring for accessibility
  let { isFocusVisible, focusProps } = useFocusRing();

  return (
    <li
      {...mergeProps(optionProps, focusProps)}
      ref={ref}
      className={cx(
        'flex flex-row items-center rounded',
        isFocusVisible && 'ring-promote',
        'outline-none rounded-sm cursor-pointer my-2',
        isDisabled && 'opacity-50 cursor-not-allowed',
        isSelected && 'BU_is-active',
        isFocused && 'BU_is-focused',
      )}
    >
      <div className="px-3 py-2">{item.rendered}</div>
      <div className="px-3">
        {isSelected ? (
          <CheckIcon className="w-4 h-4" />
        ) : (
          <div className="w-4 h-4"></div>
        )}
      </div>
    </li>
  );
};
