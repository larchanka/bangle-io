import React from 'react';

import { cx, isTouchDevice } from '@bangle.io/utils';

import type { ItemType } from '../UniversalPalette/PaletteItem';

export function Row2({
  item,
  className = '',
  titleClassName = 'text-base font-normal',
  extraInfoClassName = 'text-base font-light',
  descriptionClassName = 'text-sm',
  onClick,
  isActive,
  style,
  // on touch devices having :hover forces you to click twice
  allowHover = !isTouchDevice,
  extraInfoOnNewLine = false,
  onMouseOver,
  onMouseLeave,
}: {
  item: ItemType;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  className?: string;
  titleClassName?: string;
  extraInfoClassName?: string;
  descriptionClassName?: string;
  isActive?: boolean;
  style?: any;
  allowHover?: boolean;
  extraInfoOnNewLine?: boolean;
  onMouseOver?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const titleElement = (
    <div className={cx(extraInfoOnNewLine && 'flex flex-col', 'truncate')}>
      <span className={titleClassName}>{item.title}</span>
      {item.extraInfo && (
        <div
          className={cx(
            'B-ui-components_extra-info truncate ' + extraInfoClassName,
            extraInfoOnNewLine && 'B-ui-components_extra-info-on-new-line',
          )}
        >
          {item.extraInfo}
        </div>
      )}
    </div>
  );

  return (
    <div
      role="button"
      data-id={item.uid}
      onClick={onClick}
      onMouseOver={onMouseOver}
      onMouseLeave={onMouseLeave}
      className={cx(
        'B-ui-components_sidebar-row2',
        allowHover && 'BU_hover',
        isActive && 'BU_active',
        item.isDisabled && 'BU_disabled',
        item.showDividerAbove && 'BU_divider',
        className,
      )}
      style={{
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        userSelect: 'none',
        ...style,
      }}
    >
      <div className="truncate">
        <div className="flex">
          <div className="B-ui-components_left-node">{item.leftNode}</div>
          {item.description ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {titleElement}
              <span
                className={
                  'B-ui-components_description ' + descriptionClassName
                }
              >
                {item.description}
              </span>
            </div>
          ) : (
            titleElement
          )}
        </div>
      </div>
      <div className="flex flex-row">
        <span className="B-ui-components_right-node">{item.rightNode}</span>
        <span className="B-ui-components_right-hover-node">
          {item.rightHoverNode}
        </span>
      </div>
    </div>
  );
}
