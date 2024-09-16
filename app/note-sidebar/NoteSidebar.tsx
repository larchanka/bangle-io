import React from 'react';

import { AiContainer } from '@bangle.io/ai';
import type { NoteSidebarWidget } from '@bangle.io/shared-types';
import {
  AddOnIcon,
  BrainIcon,
  Button,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from '@bangle.io/ui-components';

export function NoteSidebar({
  onDismiss,
  widgets,
}: {
  onDismiss: () => void;
  widgets: NoteSidebarWidget[];
}) {
  const [hasGpu]: [boolean] = React.useState(!!navigator.gpu);
  const [isAiReload, setIsAiReload]: [boolean, (isReload: boolean) => void] =
    React.useState(false);
  const [isAiFullscreen, setIsAiFullscreen]: [
    boolean,
    (isReload: boolean) => void,
  ] = React.useState(false);

  return (
    <div className="flex flex-col flex-grow h-full overflow-y-scroll text-colorNeutralTextSubdued relative">
      <div className="flex flex-row justify-between px-2 mt-2">
        <span className="font-bold self-center">Дополнения</span>
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

      <div className="mb-2">
        {widgets.map((r) => (
          <div key={r.name} className="">
            <div className="flex flex-row justify-between px-2 mt-2">
              <span className="ml-1 font-semibold">
                <AddOnIcon
                  width={16}
                  height={16}
                  className="display-inline"
                  style={{ fill: 'var(--BV-colorPositiveSolid)' }}
                />{' '}
                {r.title}
              </span>
              <div></div>
            </div>
            <div className="min-h-6 max-h-96 flex flex-col rounded-sm p-1 mx-2 mt-1 overflow-y-auto">
              <r.ReactComponent />
            </div>
          </div>
        ))}
      </div>

      {hasGpu && (
        <div
          className={`flex flex-col${
            isAiFullscreen
              ? ' w-full absolute top-10 bottom-0 left-0 z-10 bg-colorBgLayerBottom'
              : ' h-full'
          }`}
        >
          <div className="flex flex-row justify-between px-2 mt-2">
            <span className="font-bold self-center">
              <BrainIcon
                width={16}
                height={16}
                className="display-inline"
                style={{ color: 'var(--BV-colorCriticalBorderStrong)' }}
              />{' '}
              ИИ-ассистент <sup className="text-xs">бета</sup>
            </span>
            <span className="flex flex-row">
              <Button
                size="xs"
                variant="transparent"
                ariaLabel={isAiFullscreen ? 'exit-fullscreen' : 'fullscreen'}
                onPress={() => setIsAiFullscreen(!isAiFullscreen)}
                leftIcon={
                  isAiFullscreen ? <ChevronDownIcon /> : <ChevronUpIcon />
                }
              />
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
      )}
    </div>
  );
}
