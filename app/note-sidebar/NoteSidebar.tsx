import React from 'react';

import { AiContainer } from '@bangle.io/ai';
import type { NoteSidebarWidget } from '@bangle.io/shared-types';
import {
  Button,
  ChevronRightIcon,
  FileDocumentIcon,
} from '@bangle.io/ui-components';

export function NoteSidebar({
  onDismiss,
  widgets,
}: {
  onDismiss: () => void;
  widgets: NoteSidebarWidget[];
}) {
  const [hasGpu] = React.useState(!!navigator.gpu);

  return (
    <div className="flex flex-col flex-grow h-full overflow-y-scroll text-colorNeutralTextSubdued">
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
              <span className="ml-1 font-semibold">{r.title}</span>
              <div></div>
            </div>
            <div className="min-h-6 max-h-96 flex flex-col rounded-md p-1 mx-2 mt-1 overflow-y-auto bg-colorNeutralBgLayerTop border-neutral">
              <r.ReactComponent />
            </div>
          </div>
        ))}
      </div>

      {hasGpu && (
        <div className="flex flex-col h-full">
          <div className="flex flex-row justify-between px-2 mt-2">
            <span className="font-bold self-center">ИИ-компаньон</span>
            <span>
              <FileDocumentIcon style={{ width: '1em', height: '1em' }} />
            </span>
          </div>
          <div className="h-full">
            <AiContainer />
          </div>
        </div>
      )}
    </div>
  );
}
