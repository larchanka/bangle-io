import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useVirtual } from 'react-virtual';

import { nsmApi2, useSerialOperationContext } from '@bangle.io/api';
import { CORE_OPERATIONS_NEW_NOTE, CorePalette } from '@bangle.io/constants';
import type { WsName, WsPath } from '@bangle.io/shared-types';
import {
  ButtonIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  DocumentAddIcon,
  FilePresentationIcon,
  Sidebar,
} from '@bangle.io/ui-components';
import {
  isFirefox,
  safeScrollIntoViewIfNeeded,
  useLocalStorage,
} from '@bangle.io/utils';
import {
  filePathToWsPath2,
  removeExtension,
  resolvePath,
} from '@bangle.io/ws-path';

import { fileWsPathsToFlatDirTree } from './file-ws-paths-to-flat-dir-tree';

const DEFAULT_FOLD_DEPTH = 2;
const PADDING_OFFSET = 16;
const BASE_PADDING = 16;

const rem =
  typeof window === 'undefined'
    ? 16
    : parseFloat(getComputedStyle(document.documentElement).fontSize);

const rowHeight = 1.75 * rem; // 1.75rem line height of text-lg

// TODO the current design just ignores empty directory
// TODO check if in widescreen sidebar is closed
export function NotesTree() {
  const { widescreen } = nsmApi2.ui.useUi();

  const {
    wsName,
    openedWsPaths,
    noteWsPaths = [],
  } = nsmApi2.workspace.useWorkspace();

  const { dispatchSerialOperation } = useSerialOperationContext();

  const { primaryWsPath } = openedWsPaths;
  const activeFilePath = primaryWsPath
    ? resolvePath(primaryWsPath).filePath
    : undefined;

  const closeSidebar = useCallback(() => {
    if (!widescreen) {
      nsmApi2.ui.closeSidebar();
    }
  }, [widescreen]);

  const createNewFile = useCallback(
    (path) => {
      dispatchSerialOperation({
        name: CORE_OPERATIONS_NEW_NOTE,
        value: {
          path: path,
        },
      });
    },
    [dispatchSerialOperation],
  );

  if (!wsName) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span
          className="text-sm font-extrabold cursor-pointer bangle-io_textColorLighter"
          onClick={() => {
            nsmApi2.ui.togglePalette(CorePalette.Workspace);
          }}
        >
          Откройте рабочее пространство
        </span>
      </div>
    );
  }

  if (noteWsPaths.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <span className="text-sm font-extrabold bangle-io_textColorLighter">
          Нет заметок
        </span>
      </div>
    );
  }

  return (
    <GenericFileBrowser
      wsName={wsName}
      files={noteWsPaths}
      activeFilePath={activeFilePath}
      closeSidebar={closeSidebar}
      createNewFile={createNewFile}
    />
  );
}
const IconStyle = {
  height: '1em',
  width: '1em',
  marginRight: '.25em',
  color: 'var(--BV-colorSecondarySolidStronger)',
};

export function GenericFileBrowser({
  wsName,
  files,
  activeFilePath,
  closeSidebar,
  createNewFile,
}: {
  wsName: WsName;
  files: readonly WsPath[];
  activeFilePath?: string;
  closeSidebar: () => void;
  createNewFile: (path?: string) => void;
}) {
  const { filesAndDirList, dirSet } = useMemo(() => {
    return fileWsPathsToFlatDirTree(files);
  }, [files]);

  if (!wsName || filesAndDirList.length === 0) {
    return null;
  }

  return (
    <RenderItems
      wsName={wsName}
      filesAndDirList={filesAndDirList}
      dirSet={dirSet}
      activeFilePath={activeFilePath}
      closeSidebar={closeSidebar}
      createNewFile={createNewFile}
    />
  );
}

const RenderItems = ({
  wsName,
  filesAndDirList,
  dirSet,
  activeFilePath,
  closeSidebar,
  createNewFile,
}: {
  wsName: WsName;
  filesAndDirList: string[];
  dirSet: Set<string>;
  activeFilePath?: string;
  closeSidebar: () => void;
  createNewFile: (path?: string) => void;
}) => {
  const [collapsed, toggleCollapse] = useLocalStorage<string[]>(
    'RenderTree6261:' + wsName,
    () => {
      const result = filesAndDirList.filter(
        (path) =>
          dirSet.has(path) && path.split('/').length === DEFAULT_FOLD_DEPTH,
      );

      return result;
    },
  );

  // this exists as a ref so that we can use it later
  // but without depending on it
  const collapsedRef = useRef(collapsed);
  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  // If there is an activeFilePath make sure that the file tree
  // is uncollapsed
  useEffect(() => {
    if (activeFilePath) {
      const parentsToKeep = collapsedRef.current.filter((r) => {
        return !activeFilePath.startsWith(r + '/');
      });

      if (parentsToKeep.length < collapsedRef.current.length) {
        toggleCollapse(parentsToKeep);
      }
    }
  }, [activeFilePath, toggleCollapse]);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const rows = useMemo(() => {
    return filesAndDirList.filter((path) => {
      if (
        collapsed.some((collapseDirPath) =>
          path.startsWith(collapseDirPath + '/'),
        ) ||
        path?.toLowerCase().indexOf('readme.md') !== -1
      ) {
        return false;
      }

      return true;
    });
  }, [filesAndDirList, collapsed]);

  const rowVirtualizer = useVirtual({
    size: rows.length,
    parentRef,
    overscan: 60,
    estimateSize: React.useCallback(() => {
      // NOTE its easy to trip this and make it run on every render

      return rowHeight;
    }, []),
    keyExtractor: useCallback((i: number) => rows[i]!, [rows]),
  });

  const result = rowVirtualizer.virtualItems.map((virtualRow) => {
    const path = rows[virtualRow.index]!;
    const isDir = dirSet.has(path);
    const isPresentation = !isDir && path.endsWith('.p.md');
    const wsPath = filePathToWsPath2(wsName, path);
    const splittedPath = path.split('/');
    const depth = splittedPath.length;
    const name = removeExtension(splittedPath.pop() || 'Unknown file name');
    const isArchive = name === 'Архив';

    const onClick = (event: React.MouseEvent<any>) => {
      if (isDir) {
        toggleCollapse((array) => {
          if (array.includes(path)) {
            return array.filter((p) => p !== path);
          } else {
            return [...array, path];
          }
        });

        return;
      }
      if (event.metaKey) {
        nsmApi2.workspace.openWsPathInNewTab(wsPath);
      } else if (event.shiftKey) {
        nsmApi2.workspace.pushSecondaryWsPath(wsPath);
      } else {
        nsmApi2.workspace.pushPrimaryWsPath(wsPath);
      }
      closeSidebar();
    };

    if (name.toLowerCase() === 'readme') {
      return null;
    }

    return (
      <RenderRow
        isArchive={isArchive}
        key={path}
        virtualRow={virtualRow}
        path={path}
        isDir={isDir}
        isPresentation={isPresentation}
        wsPath={wsPath}
        name={name}
        depth={depth}
        isActive={activeFilePath === path}
        isCollapsed={collapsed.includes(path)}
        createNewFile={createNewFile}
        onClick={onClick}
      />
    );
  });

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div
        style={{
          height: `${rowVirtualizer.totalSize}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {result}
      </div>
    </div>
  );
};

function RenderRow({
  virtualRow,
  path,
  isDir,
  isPresentation,
  wsPath,
  name,
  depth,
  isActive,
  isArchive = false,
  isCollapsed,
  onClick,
  createNewFile,
}: {
  virtualRow: any;
  path: string;
  isDir: boolean;
  isPresentation: boolean;
  wsPath: WsPath;
  name: string;
  depth: number;
  isActive: boolean;
  isArchive?: boolean;
  isCollapsed: boolean;
  onClick: (event: React.MouseEvent<any>) => void;
  createNewFile: (path?: string) => void;
}) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isActive) {
      // scrolling into view is broken in firefox
      if (!isFirefox) {
        elementRef.current &&
          safeScrollIntoViewIfNeeded(elementRef.current, false);
      }
    }
  }, [isActive]);

  return (
    <div
      ref={elementRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualRow.size}px`,
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <Sidebar.Row2
        isActive={isActive}
        onClick={onClick}
        // before changing this look at estimateSize of virtual
        titleClassName="truncate select-none tree-item-title"
        style={{
          paddingLeft: (isDir ? depth : depth + 1) * BASE_PADDING,
          paddingRight: PADDING_OFFSET,
          lineHeight: '1.5em',
        }}
        onMouseOver={() => {
          setIsHovered(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
        }}
        item={{
          uid: wsPath,
          showDividerAbove: false,
          title: name,
          leftNode: (
            <ButtonIcon onClick={async (e: Event) => {}}>
              {isDir ? (
                isCollapsed ? (
                  <ChevronRightIcon style={IconStyle} />
                ) : (
                  <ChevronDownIcon style={IconStyle} />
                )
              ) : (
                isPresentation && (
                  <FilePresentationIcon
                    style={{
                      ...IconStyle,
                      color: 'var(--BV-colorPositiveIcon)',
                    }}
                  />
                )
              )}
            </ButtonIcon>
          ),
          rightHoverNode: isDir ? (
            <ButtonIcon
              hint="Новый файл"
              onClick={async (e: Event) => {
                e.stopPropagation();

                if (depth === 0) {
                  createNewFile();
                } else {
                  createNewFile(path + '/');
                }
              }}
              hintPos="bottom-right"
            >
              <DocumentAddIcon style={IconStyle} />
            </ButtonIcon>
          ) : (
            <ButtonIcon
              hint="Удалить файл"
              hintPos="bottom-right"
              onClick={async (e) => {
                e.stopPropagation();

                if (
                  window.confirm(`Вы действительно хотите удалить "${name}"? `)
                ) {
                  nsmApi2.workspace.deleteNote(wsPath);
                }
              }}
            >
              <CloseIcon style={IconStyle} />
            </ButtonIcon>
          ),
        }}
      />
    </div>
  );
}
