import type { Dispatch, SetStateAction } from 'react';
import React from 'react';

import { AiContainer } from '@bangle.io/ai';
import type { NoteSidebarWidget } from '@bangle.io/shared-types';
import {
  BrainIcon,
  Button,
  ChevronRightIcon,
  LinkIcon,
  ListIcon,
} from '@bangle.io/ui-components';

export function NoteSidebar({
  onDismiss,
  widgets,
}: {
  onDismiss: () => void;
  widgets: NoteSidebarWidget[];
}) {
  const [hasGpu]: [boolean, any] = React.useState<boolean>(!!navigator.gpu);
  const [activeTab, setActiveTab]: [number, Dispatch<SetStateAction<number>>] =
    React.useState<number>(1);
  const [isAiReload, setIsAiReload]: [boolean, (isReload: boolean) => void] =
    React.useState(false);

  const ICONS = [
    <ListIcon
      width={16}
      height={16}
      className="display-inline"
      style={{ fill: 'var(--BV-miscKbdBg)' }}
    />,
    <LinkIcon
      width={16}
      height={16}
      className="display-inline"
      style={{ fill: 'var(--BV-miscKbdBg)' }}
    />,
  ];

  const tabs = widgets.map((w, idx) => {
    return {
      icon: ICONS[idx],
      onClick: () => setActiveTab(idx),
    };
  });

  if (hasGpu) {
    tabs.push({
      icon: <BrainIcon width={16} height={16} className="display-inline" />,
      onClick: () => setActiveTab(2),
    });
  }

  return (
    <div className="flex flex-col flex-grow h-full overflow-y-scroll text-colorNeutralTextSubdued relative">
      <div className="flex flex-row justify-between px-2 mt-2 mb-2">
        <span className="font-bold self-center">
          {tabs.map((t, idx) => (
            <Button
              key={idx}
              variant={idx === activeTab ? 'soft' : 'transparent'}
              size="md"
              leftIcon={t.icon}
              onPress={t.onClick}
            />
          ))}
        </span>
        <span>
          <Button
            size="sm"
            variant="transparent"
            onPress={onDismiss}
            ariaLabel={'hide'}
            tooltipPlacement="bottom"
            leftIcon={<ChevronRightIcon />}
          />
        </span>
      </div>

      {widgets.map((r, idx) => (
        <div
          key={r.name}
          className={
            'note-sidebar-tab' +
            (idx === activeTab ? ' note-sidebar-tab-active' : '')
          }
        >
          <div className="flex flex-row justify-between px-2 mt-2">
            <span className="ml-1 font-semibold">{r.title}</span>
            <div></div>
          </div>
          <div className="min-h-6 max-h-96 flex flex-col rounded-sm p-1 mx-2 mt-1 overflow-y-auto">
            <r.ReactComponent />
          </div>
        </div>
      ))}

      {hasGpu && (
        <div
          className={
            'note-sidebar-tab h-full' +
            (2 === activeTab ? ' note-sidebar-tab-active' : '')
          }
        >
          <div className="flex flex-col h-full">
            <div className="flex flex-row justify-between px-2 mt-2">
              <span className="font-bold self-center">
                ИИ-ассистент <sup className="text-xs">бета</sup>
              </span>
              <span className="flex flex-row">
                <Button
                  size="xs"
                  variant="transparent"
                  text="очистить"
                  onPress={async () => {
                    setIsAiReload(true);
                    await new Promise((resolve) => setTimeout(resolve, 10));
                    setIsAiReload(false);
                  }}
                />
              </span>
            </div>
            <div className="h-full">{!isAiReload && <AiContainer />}</div>
          </div>
        </div>
      )}
    </div>
  );
}
