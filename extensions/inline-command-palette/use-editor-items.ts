import { useMemo } from 'react';

import {
  bulletList,
  listItem,
  orderedList,
  paragraph,
} from '@bangle.dev/base-components';
import type { EditorState, EditorView } from '@bangle.dev/pm';
import { setBlockType } from '@bangle.dev/pm';
import { rafCommandExec } from '@bangle.dev/utils';

import { replaceSuggestionMarkWith } from '@bangle.io/inline-palette';
import { assertNotUndefined } from '@bangle.io/utils';

import {
  chainedInsertParagraphAbove,
  chainedInsertParagraphBelow,
  isList,
} from './commands';
import { palettePluginKey } from './config';
import { PaletteItem } from './palette-item';

const { convertToParagraph } = paragraph;
const {
  toggleBulletList,
  toggleTodoList,
  queryIsBulletListActive,
  queryIsTodoListActive,
} = bulletList;
const { insertEmptySiblingListAbove, insertEmptySiblingListBelow } = listItem;
const { toggleOrderedList, queryIsOrderedListActive } = orderedList;

const setHeadingBlockType =
  (level: number) =>
  (state: EditorState, dispatch: EditorView['dispatch'] | undefined) => {
    const type = state.schema.nodes.heading;

    assertNotUndefined(type, 'heading must be defined');

    return setBlockType(type, { level })(state, dispatch);
  };

export function useEditorItems() {
  const baseItem = useMemo(
    () => [
      PaletteItem.create({
        uid: 'paraBelow',
        title: 'Вставить параграф ниже ⤵️',
        group: 'editor',
        description: 'Добавляет параграф ниже текущего блока',
        // TODO current just disabling it, but we need to implement this method for lists
        disabled: (state: any) => {
          return isList()(state);
        },
        editorExecuteCommand: () => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, chainedInsertParagraphBelow());
            }

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'paraAbove',
        title: 'Вставить параграф выше ⤴️',
        group: 'editor',
        description: 'Добавляет параграф выше текущего блока',
        disabled: (state: any) => {
          return isList()(state);
        },
        editorExecuteCommand: () => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, chainedInsertParagraphAbove());
            }

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'paraConvert',
        title: 'Параграф',
        group: 'editor',
        description: 'Конвертирует текущий блок в параграф',
        editorExecuteCommand: () => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(
                view,
                (
                  state: EditorState,
                  dispatch: EditorView['dispatch'] | undefined,
                  view: EditorView | undefined,
                ) => {
                  if (queryIsTodoListActive()(state)) {
                    return toggleTodoList()(state, dispatch, view);
                  }
                  if (queryIsBulletListActive()(state)) {
                    return toggleBulletList()(state, dispatch, view);
                  }
                  if (queryIsOrderedListActive()(state)) {
                    return toggleOrderedList()(state, dispatch, view);
                  }

                  return convertToParagraph()(state, dispatch, view);
                },
              );
            }

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'bulletListConvert',
        title: 'Список',
        group: 'editor',
        keywords: ['unordered', 'lists'],
        description: 'Конвертирует блок в список',
        editorExecuteCommand: () => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, toggleBulletList());
            }

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'todoListConvert',
        title: 'Туду лист',
        group: 'editor',
        keywords: ['todo', 'lists', 'checkbox', 'checked'],
        description: 'Конвертирует блок в Туду лист',
        editorExecuteCommand: () => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, toggleTodoList());
            }

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'orderedListConvert',
        group: 'editor',
        title: 'Нумерованный список',
        keywords: ['numbered', 'lists'],
        description: 'Конвертирует блок в нумерованный список',
        editorExecuteCommand: () => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, toggleOrderedList());
            }

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'insertSiblingListAbove',
        group: 'editor',
        title: 'Добавить в список выше ⤴️',
        keywords: ['insert', 'above', 'lists'],
        description: 'Добавляет новый элемент в список выше текущего',
        disabled: (state: any) => {
          return !isList()(state);
        },
        editorExecuteCommand: () => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              rafCommandExec(view, insertEmptySiblingListAbove());
            }

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      PaletteItem.create({
        uid: 'insertSiblingListBelow',
        group: 'editor',
        title: 'Добавить в список ниже ⤵️',
        keywords: ['insert', 'below', 'lists'],
        description: 'Добавляет новый элемент в список ниже текущего',
        disabled: (state: any) => {
          return !isList()(state);
        },
        editorExecuteCommand: () => {
          return (
            state: EditorState,
            dispatch: EditorView['dispatch'] | undefined,
            view: EditorView | undefined,
          ) => {
            if (view) {
              if (view) {
                rafCommandExec(view, insertEmptySiblingListBelow());
              }
            }

            return replaceSuggestionMarkWith(palettePluginKey, '')(
              state,
              dispatch,
              view,
            );
          };
        },
      }),

      ...Array.from({ length: 3 }, (_, i) => {
        const level = i + 1;

        return PaletteItem.create({
          uid: 'headingConvert' + level,
          title: 'H' + level,
          group: 'editor',
          description: 'Конвертирует текущий блок в заголовок уровня ' + level,
          disabled: (state: any) => {
            const result = isList()(state);

            return result;
          },
          editorExecuteCommand: () => {
            return (
              state: EditorState,
              dispatch: EditorView['dispatch'] | undefined,
              view: EditorView | undefined,
            ) => {
              if (view) {
                rafCommandExec(view, setHeadingBlockType(level));
              }

              return replaceSuggestionMarkWith(palettePluginKey, '')(
                state,
                dispatch,
                view,
              );
            };
          },
        });
      }),
    ],
    [],
  );

  return baseItem;
}
