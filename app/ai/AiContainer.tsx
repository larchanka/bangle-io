import type {
  ChatCompletionMessageParam,
  InitProgressReport,
  MLCEngineInterface,
} from '@mlc-ai/web-llm';
import { CreateMLCEngine } from '@mlc-ai/web-llm';
import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import Markdown from 'react-markdown';

import { useNsmSliceState } from '@bangle.io/bangle-store-context';
import { nsmSliceWorkspace } from '@bangle.io/nsm-slice-workspace';
import {
  Button,
  ChevronRightIcon,
  CloseIcon,
  CopyIcon,
  ExclamationIcon,
  SpinnerIcon,
} from '@bangle.io/ui-components';
import { fs } from '@bangle.io/workspace-info';

const isPowerfullPc = navigator?.deviceMemory >= 4;

const selectedModel = isPowerfullPc
  ? 'Qwen2-1.5B-Instruct-q4f32_1-MLC'
  : 'Qwen2-0.5B-Instruct-q4f32_1-MLC';
// Phi-3.5-mini-instruct-q4f16_1-MLC-1k
// TinyLlama-1.1B-Chat-v0.4-q4f16_1-MLC-1k
// RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC
// Qwen2-0.5B-Instruct-q4f16_1-MLC

const Div = ({ ...props }: React.ComponentProps<'div'>) => <div {...props} />;
const Form = ({ ...props }: React.ComponentProps<'form'>) => (
  <form {...props} />
);
const Progress = ({ ...props }: React.ComponentProps<'progress'>) => (
  <progress {...props} />
);
const Textarea = ({ reff, ...props }: React.ComponentProps<'textarea'>) => (
  <textarea ref={reff} {...props} />
);
const Button2 = ({ ...props }: React.ComponentProps<'button'>) => (
  <button {...props} />
);

export function AiContainer() {
  const [isEnabled, setIsEnabled] = React.useState(
    window.localStorage.getItem('aiEnabled') === 'true',
  );
  const [isChatDisabled, setIsChatEnabled] = React.useState(true);
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [requestValue, setRequestValue] = React.useState('');
  const [chatHistory, setChatHistory] = React.useState<
    ChatCompletionMessageParam[]
  >([]);
  const { primaryWsPath } = useNsmSliceState(nsmSliceWorkspace);
  const textareaRef = React.useRef(null);

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

  React.useEffect(() => {
    console.log(222, textareaRef.current);

    if (textareaRef.current) {
      // This will auto-resize the textarea whenever the content changes
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        textareaRef?.current?.scrollHeight + 'px';
    }
  }, [requestValue, textareaRef]);

  const setIsEnabledLocal = () => {
    window.localStorage.setItem('aiEnabled', isEnabled ? 'false' : 'true');
    setIsEnabled(!isEnabled);
  };

  async function setupAi(context = '...', reset = false) {
    const localChatHistory = [
      {
        role: 'system',
        content: `
          Ты – ассистент, который помогает пользователю генерировать тексты на русском языке, если не указан иной язык.
          Отвечай кратко в одном-двух предложениях, если не указано иное.
          Отвечай в markdown-формате, если не указано иное.
          Не повторяй контекст.
          Контекст: ${context}
          `,
      },
    ];

    if (reset) {
      setChatHistory(localChatHistory);
    }

    const progressBar = document.querySelector('progress');

    const enableChat = () => {
      setIsChatEnabled(false);
    };

    const initProgressCallback = (report: InitProgressReport) => {
      if (progressBar) {
        progressBar.value = report.progress;
      }

      if (report.progress >= 1) {
        progressBar?.parentNode?.classList.add('hidden');
        enableChat();
      }
    };

    const engine: MLCEngineInterface = await CreateMLCEngine(
      selectedModel,
      {
        initProgressCallback: initProgressCallback,
      },
      {
        vocab_size: 10000,
        repetition_penalty: 0.8,
        frequency_penalty: 0.4,
        presence_penalty: 0.4,
        top_p: 0.95,
        temperature: 0.9,
      },
    );

    window.submitRequest = (val: string): void => {
      startEngine(val);
    };

    async function startEngine(message: string) {
      setIsRequesting(true);
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

        if (index % 2 === 0) {
          tmpChatHistory.pop();
          tmpChatHistory.push({ role: 'assistant', content: curMessage });
          setChatHistory(tmpChatHistory);
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
      setIsRequesting(false);
    }
  }

  const handleSubmit = (e: Event) => {
    e?.preventDefault();

    if (!requestValue) {
      return;
    }
    window.submitRequest(requestValue);
  };

  function submitOnEnter(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit(event);
    }
  }

  function disableAiHandler() {
    setIsEnabledLocal();
  }

  if (!isEnabled) {
    return (
      <Div className="flex flex-col flex-grow h-full overflow-y-scroll text-colorNeutralTextSubdued p-2">
        <Button
          ariaLabel="Включить"
          size="sm"
          style={{
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          }}
          text="Включить"
          onPress={setIsEnabledLocal}
        />
        <Div
          className="mt-4"
          style={{ fontSize: 'var(--BV-typographyTextSmSize)' }}
        >
          <Div
            className="flex gap-2 items-center mb-2"
            style={{
              fontWeight: 600,
              color: 'var(--BV-colorCriticalSolidStronger)',
              fontSize: 'var(--BV-typographyTextMdSize)',
            }}
          >
            <ExclamationIcon className="w-4 h-4" />
            Локальная модель
          </Div>
          <Div className="p-1">
            Это локальная модель, работающая в вашем браузере. Она может не
            знать или неправильно интерпретировать некоторые вещи. Поэтому,
            пожалуйста, проверяйте информацию, полученную от нее, и не
            полагайтесь на нее слепо.
          </Div>
        </Div>
      </Div>
    );
  }

  return (
    <Div className="h-full flex flex-col relative">
      {!isChatDisabled && (
        <Div
          className="top-0 left-0 p-2 flex items-center justify-between"
          style={{
            fontSize: 'var(--BV-typographyTextXsSize)',
          }}
        >
          <Div>Модель: {selectedModel.split('-').splice(0, 3).join(' ')}</Div>
          <Button
            size="xs"
            variant="soft"
            ariaLabel="disable-ai"
            onPress={disableAiHandler}
            leftIcon={<CloseIcon />}
          />
        </Div>
      )}
      <Div className="p-2">
        <Progress
          className="w-full"
          title={selectedModel}
          id="progress"
          value={0}
        />
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
                  className={`markdown ai-message-content ${
                    message.role === 'user'
                      ? 'opacity-50 pl-4'
                      : 'color-colorText w-full'
                  } mt-2`}
                  key={`k-${index}`}
                >
                  {message.role === 'assistant' && (
                    <Div
                      className="float-right mt-2 z-10 relative"
                      title="Копировать ответ"
                    >
                      <CopyToClipboard
                        text={message.content}
                        options={{ format: 'text/plain' }}
                      >
                        <Div className="text-base active:bg-colorNeutralBgLayerTop h-9 smallscreen:h-10 min-w-10 px-3  select-none inline-flex justify-center items-center rounded-md whitespace-nowrap overflow-hidden py-1 transition-all duration-100 cursor-pointer ">
                          <CopyIcon style={{ width: 16, height: 16 }} />
                        </Div>
                      </CopyToClipboard>
                    </Div>
                  )}
                  <Markdown>{message.content}</Markdown>
                </Div>
              ) : null,
          )}
        </Div>
      </Div>
      <Form onSubmit={handleSubmit}>
        <Div className="flex flex-row items-end flex-growtext-colorNeutralTextSubdued p-2 relative">
          {isRequesting && (
            <Div className="absolute top-0 left-0 w-full h-full z-10 flex justify-center items-center opacity-50">
              <SpinnerIcon width="2rem" height="2rem" />
            </Div>
          )}
          <Textarea
            disabled={isChatDisabled || isRequesting}
            className="block p-2.5 w-full rounded-lg resize-none"
            maxLength={200}
            style={{
              color: 'black',
              borderBottomRightRadius: '0',
              height: 'auto',
            }}
            value={requestValue}
            onChange={(e: InputEvent) => setRequestValue(e.target?.value)}
            placeholder="Введите запрос"
            onKeyDown={submitOnEnter}
            reff={textareaRef}
          />
          <Button2
            className="font-600 h-8 min-w-8 px-2 select-none inline-flex justify-center items-center rounded-md whitespace-nowrap overflow-hidden py-1 transition-all duration-100 cursor-pointer bg-colorBgLayerFloat hover:bg-colorNeutralBgLayerTop disabled:bg-colorNeutralBgLayerBottom"
            disabled={isChatDisabled || isRequesting}
            aria-label="Отправить запрос"
            style={{
              borderBottomLeftRadius: 0,
              borderTopLeftRadius: 0,
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
