import React, { useCallback } from 'react';

import { useSerialOperationContext } from '@bangle.io/api';
import { useNsmSlice } from '@bangle.io/bangle-store-context';
import {
  CHANGELOG_MODAL_NAME,
  CORE_OPERATIONS_NEW_NOTE,
  CORE_OPERATIONS_NEW_WORKSPACE,
  CORE_PALETTES_TOGGLE_NOTES_PALETTE,
  CORE_PALETTES_TOGGLE_OPERATION_PALETTE,
  CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE,
  CorePalette,
} from '@bangle.io/constants';
import type { SidebarType } from '@bangle.io/extension-registry';
import type { SerialOperationKeybindingMapping } from '@bangle.io/shared-types';
import { nsmUI, nsmUISlice } from '@bangle.io/slice-ui';
import {
  DotsVerticalIcon,
  DropdownMenu,
  GiftIcon,
  MenuItem,
  MenuSection,
  PrettyKeybinding,
  SettingsIcon,
} from '@bangle.io/ui-components';

import { ButtonStyleOBj } from './common';

export const ActionPaletteKey = 'ActionPalette';
export const DiscordKey = 'Discord';
export const NewNoteKey = 'NewNote';
export const NewWorkspaceKey = 'NewWorkspace';
export const NotesPaletteKey = 'NotesPalette';
export const ReportIssueKey = 'ReportIssue';
export const SwitchWorkspaceKey = 'SwitchWorkspace';
export const ToggleThemeKey = 'ToggleTheme';
export const TwitterKey = 'Twitter';
export const WhatsNewKey = 'WhatsNewKey';

type AllKeysType =
  | typeof ActionPaletteKey
  | typeof DiscordKey
  | typeof NewNoteKey
  | typeof NewWorkspaceKey
  | typeof NotesPaletteKey
  | typeof ReportIssueKey
  | typeof SwitchWorkspaceKey
  | typeof ToggleThemeKey
  | typeof TwitterKey
  | typeof WhatsNewKey;

export function ActivitybarOptionsDropdown({
  widescreen,
  operationKeybindings,
  sidebarItems,
  activeSidebar,
}: {
  widescreen: boolean;
  operationKeybindings: SerialOperationKeybindingMapping;
  sidebarItems?: SidebarType[];
  activeSidebar?: string;
}) {
  const [, uiDispatch] = useNsmSlice(nsmUISlice);

  const { dispatchSerialOperation } = useSerialOperationContext();

  const handleDropdown = useCallback(
    (k: any) => {
      let key: AllKeysType = k;
      switch (key) {
        case ActionPaletteKey: {
          uiDispatch(nsmUI.togglePalette(CorePalette.Operation));
          break;
        }
        case NewNoteKey: {
          dispatchSerialOperation({
            name: CORE_OPERATIONS_NEW_NOTE,
          });
          break;
        }
        case NewWorkspaceKey: {
          dispatchSerialOperation({
            name: CORE_OPERATIONS_NEW_WORKSPACE,
          });
          break;
        }
        case NotesPaletteKey: {
          uiDispatch(nsmUI.togglePalette(CorePalette.Notes));
          break;
        }
        case ReportIssueKey: {
          window.open(
            'https://github.com/bangle-io/bangle-io/issues',
            '_blank',
          );
          break;
        }
        case SwitchWorkspaceKey: {
          uiDispatch(nsmUI.togglePalette(CorePalette.Workspace));
          break;
        }
        case ToggleThemeKey: {
          uiDispatch(nsmUI.toggleColorSchema());
          break;
        }
        case DiscordKey: {
          window.open('https://discord.gg/GvvbWJrVQY', '_blank');
          break;
        }
        case TwitterKey: {
          window.open('https://twitter.com/bangle_io', '_blank');
          break;
        }
        case WhatsNewKey: {
          uiDispatch(
            nsmUI.showDialog({
              dialogName: CHANGELOG_MODAL_NAME,
            }),
          );

          break;
        }
        default: {
          const match = sidebarItems?.find((i) => i.name === k);

          if (match) {
            if (match.name !== activeSidebar) {
              uiDispatch(nsmUI.changeSidebar(match.name));
            }
          }
        }
      }
    },
    [activeSidebar, dispatchSerialOperation, uiDispatch, sidebarItems],
  );

  const sidebarChildren: any =
    sidebarItems?.map((item) => {
      return (
        <MenuItem
          key={item.name}
          textValue={item.title}
          aria-label={item.title}
        >
          {item.title}
          {React.cloneElement(item.activitybarIcon, {
            className:
              (item.activitybarIcon.props.className || '') + ' w-5 h-5',
          })}
        </MenuItem>
      );
    }) || null;

  return (
    <DropdownMenu
      buttonProps={{
        variant: 'transparent',
        ariaLabel: 'меню опций',
        size: widescreen ? 'lg' : 'sm',
        tone: 'secondary',
        //  we need this to use the activitybar color of the icon
        style: widescreen ? ButtonStyleOBj.normal : undefined,

        leftIcon: widescreen ? <SettingsIcon /> : <DotsVerticalIcon />,
        onHoverStyle: ButtonStyleOBj.hover,
        onPressStyle: ButtonStyleOBj.press,
      }}
      menuProps={{
        ariaLabel: 'выпадающий список опций',
        placement: widescreen ? 'right-start' : 'bottom-start',
      }}
      onAction={handleDropdown}
    >
      <MenuSection aria-label="misc section">
        <MenuItem aria-label="новая заметка" key={NewNoteKey}>
          Новая заметка
        </MenuItem>
        <MenuItem aria-label="новое пространство" key={NewWorkspaceKey}>
          Новое пространство
        </MenuItem>
        <MenuItem
          aria-label="переключить пространство"
          key={SwitchWorkspaceKey}
          textValue="переключить пространство"
        >
          <span>Переключить пространство</span>
          {widescreen && (
            <PrettyKeybinding
              rawKey={
                operationKeybindings[CORE_PALETTES_TOGGLE_WORKSPACE_PALETTE] ||
                ''
              }
            />
          )}
        </MenuItem>
      </MenuSection>
      {sidebarChildren && (
        <MenuSection aria-label="activitybar section">
          {sidebarChildren}
        </MenuSection>
      )}
      <MenuSection aria-label="ui section">
        <MenuItem aria-label="Сменить светлую/темную тему" key={ToggleThemeKey}>
          Сменить светлую/темную тему
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="palettes">
        <MenuItem
          key={NotesPaletteKey}
          textValue="все заметки"
          aria-label="все заметки"
        >
          <span>Все заметки</span>
          {widescreen && (
            <PrettyKeybinding
              rawKey={
                operationKeybindings[CORE_PALETTES_TOGGLE_NOTES_PALETTE] || ''
              }
            />
          )}
        </MenuItem>
        <MenuItem
          key={ActionPaletteKey}
          textValue="все действия"
          aria-label="все действия"
        >
          <span>Все действия</span>
          {widescreen && (
            <PrettyKeybinding
              rawKey={
                operationKeybindings[CORE_PALETTES_TOGGLE_OPERATION_PALETTE] ||
                ''
              }
            />
          )}
        </MenuItem>
      </MenuSection>
      <MenuSection aria-label="links section">
        <MenuItem
          key={WhatsNewKey}
          textValue="что нового?"
          aria-label="что нового?"
        >
          <span>Что нового?</span>
          <GiftIcon className="w-5 h-5" />
        </MenuItem>
      </MenuSection>
    </DropdownMenu>
  );
}
