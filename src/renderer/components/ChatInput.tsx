import { ArrowUp, Brain, Loader2, Paperclip, Square, Gauge } from 'lucide-react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import AttachmentPreviewList from '@/components/AttachmentPreviewList';

import { THINKING_LEVELS, THINKING_PRESETS, type ThinkingLevel } from '../../shared/core';
import type { ChatModelPreference, ModelProvider } from '../../shared/core';
import type { ContextWindowInfo } from '@/hooks/chat/useMessageStream';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onStopStreaming?: () => void;
  autoFocus?: boolean;
  onHeightChange?: (height: number) => void;
  attachments?: {
    id: string;
    file: File;
    previewUrl?: string;
    previewIsBlobUrl?: boolean;
    isImage: boolean;
  }[];
  onFilesSelected?: (files: FileList | File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  canSend?: boolean;
  attachmentError?: string | null;
  modelPreference: ChatModelPreference;
  onModelPreferenceChange: (preference: ChatModelPreference) => void;
  isModelPreferenceUpdating?: boolean;
  thinkingLevel: ThinkingLevel;
  onThinkingLevelChange: (level: ThinkingLevel) => void;
  isThinkingLevelUpdating?: boolean;
  provider: ModelProvider;
  onProviderChange: (provider: ModelProvider) => void;
  isProviderUpdating?: boolean;
  contextWindowInfo?: ContextWindowInfo | null;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  onStopStreaming,
  autoFocus = false,
  onHeightChange,
  attachments = [],
  onFilesSelected,
  onRemoveAttachment,
  canSend,
  attachmentError,
  modelPreference,
  onModelPreferenceChange,
  isModelPreferenceUpdating = false,
  thinkingLevel,
  onThinkingLevelChange,
  isThinkingLevelUpdating = false,
  provider,
  onProviderChange,
  isProviderUpdating = false,
  contextWindowInfo
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MIN_TEXTAREA_HEIGHT = 44;
  const MAX_TEXTAREA_HEIGHT = 200;
  const lastReportedHeightRef = useRef<number | null>(null);
  const dragCounterRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const computedCanSend = canSend ?? Boolean(value.trim());

  const reportHeight = useCallback(
    (height: number) => {
      if (!onHeightChange) return;
      const roundedHeight = Math.round(height);
      if (lastReportedHeightRef.current === roundedHeight) return;
      lastReportedHeightRef.current = roundedHeight;
      onHeightChange(roundedHeight);
    },
    [onHeightChange]
  );

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const measuredHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT);
    textarea.style.height = `${Math.max(measuredHeight, MIN_TEXTAREA_HEIGHT)}px`;
  };

  // Auto-focus when autoFocus is true
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && computedCanSend) {
        onSend();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    const items = Array.from(clipboardData.items);
    const fileItems = items.filter((item) => item.kind === 'file');

    if (fileItems.length > 0) {
      e.preventDefault();
      const files: File[] = [];

      for (const item of fileItems) {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }

      if (files.length > 0) {
        onFilesSelected?.(files);
      }
    }
  };

  const handleInputContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only focus if clicking on the container itself, not on interactive elements
    const target = e.target as HTMLElement;
    if (target.tagName !== 'TEXTAREA' && target.tagName !== 'BUTTON' && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleTextareaInput = () => {
    adjustTextareaHeight();
  };

  const handleRemoveAttachmentClick = (attachmentId: string) => {
    onRemoveAttachment?.(attachmentId);
  };

  const handleAttachmentButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) {
      onFilesSelected?.(event.target.files);
    }
    event.target.value = '';
  };

  const isFileDrag = (event: React.DragEvent) =>
    Array.from(event.dataTransfer?.types ?? []).includes('Files');

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragCounterRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    if (!isFileDrag(event)) return;
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDragActive(false);
    if (event.dataTransfer?.files?.length) {
      onFilesSelected?.(event.dataTransfer.files);
      event.dataTransfer.clearData();
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [value]);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    reportHeight(element.getBoundingClientRect().height);

    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      reportHeight(entry.contentRect.height);
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, [reportHeight]);

  const handleModelToggle = (preference: ChatModelPreference) => {
    if (preference === modelPreference) return;
    if (isModelPreferenceUpdating) return;
    onModelPreferenceChange(preference);
  };

  const handleThinkingLevelChange = (level: ThinkingLevel) => {
    if (level === thinkingLevel) return;
    if (isThinkingLevelUpdating) return;
    onThinkingLevelChange(level);
  };

  const handleProviderToggle = (newProvider: ModelProvider) => {
    if (newProvider === provider) return;
    if (isProviderUpdating) return;
    onProviderChange(newProvider);
  };

  const formatTokenCount = (tokens: number) => {
    if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(tokens % 1_000_000 === 0 ? 0 : 1)}M`;
    return `${Math.round(tokens / 1000)}k`;
  };

  const formatCost = (cost: number | undefined) =>
    typeof cost === 'number' && Number.isFinite(cost) && cost > 0 ? `$${cost.toFixed(2)}` : null;

  const contextTokensUsed = contextWindowInfo?.tokensUsed ?? 0;
  const contextWindow = contextWindowInfo?.contextWindow ?? 0;
  const contextTokensRemaining = Math.max(0, contextWindow - contextTokensUsed);
  const contextPercent =
    typeof contextWindowInfo?.contextPercent === 'number' ?
      Math.round(contextWindowInfo.contextPercent)
    : contextWindow > 0 ? Math.round((contextTokensUsed / contextWindow) * 100)
    : 0;
  const displayModelId = contextWindowInfo?.modelId ?? contextWindowInfo?.model?.split('/').pop();
  const displayCost = formatCost(contextWindowInfo?.cost);
  const isReasoningAvailable = provider === 'codex';

  const [isThinkingDropdownOpen, setIsThinkingDropdownOpen] = useState(false);
  const thinkingDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        thinkingDropdownRef.current &&
        !thinkingDropdownRef.current.contains(event.target as Node)
      ) {
        setIsThinkingDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="sticky inset-x-0 bottom-0 z-10 px-4 pt-6 pb-5 backdrop-blur [-webkit-app-region:no-drag]"
    >
      <div className="mx-auto max-w-3xl">
        <div
          className={`rounded-3xl bg-[var(--bg-white)] p-5 pb-3 shadow-[var(--shadow-input)] ${
            isDragActive ?
              'ring-2 ring-[var(--accent-coral)]/50'
            : ''
          }`}
          onClick={handleInputContainerClick}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />

          {attachments.length > 0 && (
            <AttachmentPreviewList
              attachments={attachments.map((attachment) => ({
                id: attachment.id,
                name: attachment.file.name,
                size: attachment.file.size,
                isImage: attachment.isImage,
                previewUrl: attachment.previewUrl
              }))}
              onRemove={handleRemoveAttachmentClick}
              className="mb-2 px-2"
            />
          )}

          {attachmentError && (
            <p className="px-3 pb-2 text-xs text-red-600 dark:text-red-400">{attachmentError}</p>
          )}

          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="How can I help you today?"
            rows={1}
            className="w-full resize-none border-0 bg-transparent px-3 py-2 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none"
            style={{
              minHeight: `${MIN_TEXTAREA_HEIGHT}px`,
              maxHeight: `${MAX_TEXTAREA_HEIGHT}px`
            }}
            onInput={handleTextareaInput}
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 px-2 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAttachmentButtonClick}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--user-bubble)] text-[var(--text-secondary)] transition hover:bg-[var(--border-light)] focus:ring-2 focus:ring-[var(--accent-coral)]/50 focus:outline-none"
                title="Attach files"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <div className="flex rounded-full bg-[var(--user-bubble)] p-1">
                <button
                  type="button"
                  aria-pressed={modelPreference === 'fast'}
                  onClick={() => handleModelToggle('fast')}
                  disabled={isModelPreferenceUpdating}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    modelPreference === 'fast' ?
                      'bg-[var(--bg-white)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  } ${isModelPreferenceUpdating ? 'opacity-70' : ''}`}
                >
                  Fast
                </button>
                <button
                  type="button"
                  aria-pressed={modelPreference === 'smart'}
                  onClick={() => handleModelToggle('smart')}
                  disabled={isModelPreferenceUpdating}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    modelPreference === 'smart' ?
                      'bg-[var(--bg-white)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  } ${isModelPreferenceUpdating ? 'opacity-70' : ''}`}
                >
                  Smart
                </button>
                <button
                  type="button"
                  aria-pressed={modelPreference === 'deep'}
                  onClick={() => handleModelToggle('deep')}
                  disabled={isModelPreferenceUpdating}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    modelPreference === 'deep' ?
                      'bg-[var(--bg-white)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  } ${isModelPreferenceUpdating ? 'opacity-70' : ''}`}
                >
                  Deep
                </button>
              </div>
              {isModelPreferenceUpdating && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-tertiary)]" />
              )}
              {/* Provider Toggle */}
              <div className="flex rounded-full bg-[var(--user-bubble)] p-1">
                <button
                  type="button"
                  aria-pressed={provider === 'codex'}
                  onClick={() => handleProviderToggle('codex')}
                  disabled={isProviderUpdating}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    provider === 'codex' ?
                      'bg-[var(--bg-white)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  } ${isProviderUpdating ? 'opacity-70' : ''}`}
                  title="Use Codex Codex API"
                >
                  Codex
                </button>
                <button
                  type="button"
                  aria-pressed={provider === 'glm'}
                  onClick={() => handleProviderToggle('glm')}
                  disabled={isProviderUpdating}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    provider === 'glm' ?
                      'bg-[var(--bg-white)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  } ${isProviderUpdating ? 'opacity-70' : ''}`}
                  title="Use Z.AI GLM API"
                >
                  Z.AI
                </button>
              </div>
              {isProviderUpdating && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-tertiary)]" />
              )}
              {/* Codex reasoning-effort dropdown. GLM/ZAI has no reasoning modes, so it is disabled. */}
              <div ref={thinkingDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => isReasoningAvailable && setIsThinkingDropdownOpen(!isThinkingDropdownOpen)}
                  disabled={isThinkingLevelUpdating || !isReasoningAvailable}
                  className={`flex items-center gap-1.5 rounded-full bg-[var(--user-bubble)] px-3 py-1.5 text-xs font-medium transition ${
                    isThinkingLevelUpdating ? 'opacity-70' : ''
                  } ${
                    !isReasoningAvailable ?
                      'cursor-not-allowed text-[var(--text-tertiary)] opacity-50'
                    : 'text-[var(--text-secondary)]'
                  }`}
                  title={
                    isReasoningAvailable ?
                      `Codex reasoning: ${THINKING_PRESETS[thinkingLevel].description}`
                    : 'Reasoning modes are only available for Codex; GLM/ZAI has no modes'
                  }
                >
                  <Brain className="h-3.5 w-3.5" />
                  <span>{isReasoningAvailable ? THINKING_PRESETS[thinkingLevel].label : 'No modes'}</span>
                  {isThinkingLevelUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
                </button>
                {isThinkingDropdownOpen && isReasoningAvailable && (
                  <div className="absolute bottom-full left-0 z-20 mb-2 w-48 rounded-xl bg-[var(--bg-white)] p-1 shadow-lg ring-1 ring-[var(--border-light)]">
                    {THINKING_LEVELS.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => {
                          handleThinkingLevelChange(level);
                          setIsThinkingDropdownOpen(false);
                        }}
                        className={`flex w-full flex-col items-start rounded-lg px-3 py-2 text-left transition ${
                          level === thinkingLevel ?
                            'bg-[var(--user-bubble)]'
                          : 'hover:bg-[var(--bg-cream)]'
                        }`}
                      >
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {THINKING_PRESETS[level].label}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)]">
                          {THINKING_PRESETS[level].description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {contextWindowInfo && (
                <div
                  className="col-start-1 row-start-2 flex w-fit max-w-full items-center gap-1.5 rounded-full bg-[var(--user-bubble)] px-2.5 py-1 text-xs whitespace-nowrap text-[var(--text-tertiary)]"
                  title={`${contextWindowInfo.model}${contextWindowInfo.thinkingLevel ? ` · ${contextWindowInfo.thinkingLevel}` : ''} — ${contextTokensUsed.toLocaleString()} tokens used, ${contextTokensRemaining.toLocaleString()} remaining of ${contextWindow.toLocaleString()} context${typeof contextWindowInfo.totalInputTokens === 'number' ? ` · input ${contextWindowInfo.totalInputTokens.toLocaleString()}` : ''}${typeof contextWindowInfo.totalOutputTokens === 'number' ? ` · output ${contextWindowInfo.totalOutputTokens.toLocaleString()}` : ''}${displayCost ? ` · ${displayCost}` : ''}`}
                >
                  <Gauge className="h-3 w-3" />
                  {displayModelId && (
                    <span className="hidden md:inline text-[var(--text-quaternary)]">{displayModelId}</span>
                  )}
                  <span>{contextPercent}%</span>
                  <span className="hidden sm:inline text-[var(--text-quaternary)]">
                    {formatTokenCount(contextTokensRemaining)} left / {formatTokenCount(contextWindow)}
                  </span>
                  {displayCost && (
                    <span className="hidden lg:inline text-[var(--text-quaternary)]">{displayCost}</span>
                  )}
                </div>
              )}
            <button
              onClick={isLoading && onStopStreaming ? onStopStreaming : onSend}
              disabled={isLoading && onStopStreaming ? false : !computedCanSend || isLoading}
              className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                isLoading && onStopStreaming ?
                  'bg-[var(--user-bubble)] text-[var(--text-primary)] hover:bg-[var(--border-light)]'
                : 'bg-[var(--accent-coral)] text-white hover:bg-[var(--accent-coral-dark)]'
              } col-start-2 row-start-1 row-span-2 self-end justify-self-end`}
            >
              {isLoading ?
                onStopStreaming ?
                  <Square className="h-5 w-5" />
                : <Loader2 className="h-5 w-5 animate-spin" />
              : <ArrowUp className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
