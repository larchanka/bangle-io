import type {
  ChatCompletionMessageParam,
  InitProgressReport,
  MLCEngineInterface,
} from '@mlc-ai/web-llm';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import React from 'react';
import Markdown from 'react-markdown';

import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import { Button, ChevronRightIcon } from '@bangle.io/ui-components';
import { fs } from '@bangle.io/workspace-info';

const Div = ({ ...props }: React.ComponentProps<'div'>) => <div {...props} />;
const Form = ({ ...props }: React.ComponentProps<'form'>) => (
  <form {...props} />
);
const Progress = ({ ...props }: React.ComponentProps<'progress'>) => (
  <progress {...props} />
);
const Textarea = ({ ...props }: React.ComponentProps<'textarea'>) => (
  <textarea {...props} />
);
const Button2 = ({ ...props }: React.ComponentProps<'button'>) => (
  <button {...props} />
);

export function AiContainer() {
  const [isEnabled, setIsEnabled] = React.useState(
    window.localStorage.getItem('aiEnabled') === 'true',
  );
  const [isChatDisabled, setIsChatDisabled] = React.useState(true);
  const [requestValue, setRequestValue] = React.useState('');
  const [chatHistory, setChatHistory] = React.useState<
    ChatCompletionMessageParam[]
  >([]);
  const { primaryWsPath } = useNsmSliceState(nsmSliceWorkspace);
  React.useEffect(() => {
    if (isEnabled && primaryWsPath) {
      async function startAiAssistant() {
        let page = '';

        if (primaryWsPath) {
          page = await fs.readFileAsText(primaryWsPath);
        }
        setupAi(page, true);
      }

      startAiAssistant();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnabled, primaryWsPath]);

  const setIsEnabledLocal = () => {
    window.localStorage.setItem('aiEnabled', isEnabled ? 'false' : 'true');
    setIsEnabled(!isEnabled);
  };

  async function setupAi(context = '...', reset = false) {
    const localChatHistory = [
      {
        role: 'user',
        content:
          'Ты помогаешь пользователю. Отвечай кратко, если не укзано иное. Отвечай в markdown-формате. Контекст: ' +
          context,
      },
    ];

    if (reset) {
      setChatHistory(localChatHistory);
    }

    const progressBar = document.querySelector('progress');

    const selectedModel = 'Phi-3.5-mini-instruct-q4f16_1-MLC-1k'; // 'Phi-3.5-mini-instruct-q4f16_1-MLC-1k' "TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k" "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC"

    const enableChat = () => {
      setIsChatDisabled(false);
    };

    const initProgressCallback = (report: InitProgressReport) => {
      if (progressBar) {
        progressBar.value = report.progress;
      }

      if (report.progress >= 1) {
        progressBar?.remove();
        enableChat();
      }
    };

    const engine: MLCEngineInterface = await CreateMLCEngine(selectedModel, {
      initProgressCallback: initProgressCallback,
    });

    window.submitRequest = (val: string): void => {
      startEngine(val);
    };

    async function startEngine(message: string) {
      setIsChatDisabled(true);
      let curMessage = '';
      let index = 0;
      localChatHistory.push({ role: 'user', content: message });
      const tmpChatHistory = [...localChatHistory];
      const completion = await engine.chat.completions.create({
        stream: true,
        messages: localChatHistory,
      });

      tmpChatHistory.push({ role: 'assistant', content: '...' });
      setChatHistory(tmpChatHistory);

      for await (const chunk of completion) {
        const curDelta = chunk.choices?.[0].delta.content;

        if (curDelta) {
          curMessage += curDelta;
        }

        if (index % 5 === 0) {
          tmpChatHistory.pop();
          tmpChatHistory.push({ role: 'assistant', content: curMessage });
          setChatHistory(tmpChatHistory);
          const aiChatDiv = document.getElementById('ai-chat');

          if (aiChatDiv) {
            aiChatDiv.scrollTop = aiChatDiv.scrollHeight;
          }
        }
        index++;
      }
      const response = await engine.getMessage();
      localChatHistory.push({ role: 'assistant', content: response });
      setChatHistory(localChatHistory);
      setRequestValue('');
      const aiChatDiv = document.getElementById('ai-chat');

      if (aiChatDiv) {
        aiChatDiv.scrollTop = aiChatDiv.scrollHeight;
      }
      setIsChatDisabled(false);
    }
  }

  const handleSubmit = (e: Event) => {
    e.preventDefault();

    if (!requestValue) {
      return;
    }
    window.submitRequest(requestValue);
  };

  if (!isEnabled) {
    return (
      <Div className="flex flex-col flex-grow h-full overflow-y-scroll text-colorNeutralTextSubdued p-2">
        <Button
          ariaLabel="Включить"
          size="sm"
          variant="soft"
          style={{
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
          text="Включить"
          onPress={setIsEnabledLocal}
        />
      </Div>
    );
  }

  return (
    <Div className="h-full flex flex-col">
      <Div className="p-2">
        <Progress className="w-full" id="progress" value={0} />
      </Div>
      <Div
        className="flex flex-col flex-grow h-dvh overflow-hidden"
        style={{ flex: '1 0 0' }}
      >
        <Div
          id="ai-chat"
          className="flex flex-col items-end flex-grow h-full overflow-y-scroll text-colorNeutralTextSubdued p-2"
        >
          {chatHistory.map(
            (message: ChatCompletionMessageParam, index: number) =>
              index > 0 ? (
                <Div
                  className={`ai-message-content ${
                    message.role === 'user'
                      ? 'color-colorTextDisabled pl-4'
                      : 'color-colorText w-full'
                  } mt-2`}
                  key={`k-${index}`}
                >
                  <Markdown>{message.content}</Markdown>
                </Div>
              ) : null,
          )}
        </Div>
      </Div>
      <Form onSubmit={handleSubmit}>
        <Div className="flex flex-row items-end flex-growtext-colorNeutralTextSubdued p-2">
          <Textarea
            disabled={isChatDisabled}
            className="block p-2.5 w-full rounded-lg resize-none"
            maxLength={200}
            style={{ 'color': 'black', 'border-bottom-right-radius': '0' }}
            value={requestValue}
            onChange={(e: InputEvent) => setRequestValue(e.target?.value)}
            placeholder="Введите запрос"
          />
          <Button2
            className="font-600 h-8 min-w-8 px-2 select-none inline-flex justify-center items-center rounded-md whitespace-nowrap overflow-hidden py-1 transition-all duration-100 cursor-pointer bg-colorBgLayerFloat hover:bg-colorNeutralBgLayerTop disabled:bg-colorNeutralBgLayerBottom"
            disabled={isChatDisabled}
            ariaLabel="Отправить запрос"
            style={{
              'border-bottom-left-radius': 0,
              'border-top-left-radius': 0,
            }}
            role="submit"
          >
            <ChevronRightIcon />
          </Button2>
        </Div>
      </Form>
    </Div>
  );
}
