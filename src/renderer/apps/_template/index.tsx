import { useEffect, useMemo, useState } from 'react';

const APP_ID = '_template';

type StreamEvent = { type: 'text'; value: string } | { type: 'thinking'; value: string };

export default function TemplateApp() {
  const [status, setStatus] = useState<string>('Idle');
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  // Attach lightweight listeners to demonstrate streaming
  useEffect(() => {
    const cleanups = [
      window.electron.agent.onMessageChunk(APP_ID, (chunk: string) => {
        setIsStreaming(true);
        setStatus('Streaming response…');
        setStreamEvents((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].type === 'text') {
            const updated = [...prev];
            updated[updated.length - 1] = {
              type: 'text',
              value: `${updated[updated.length - 1].value}${chunk}`
            };
            return updated;
          }
          return [...prev, { type: 'text', value: chunk }];
        });
        console.log('[template] message chunk:', chunk);
      }),
      window.electron.agent.onThinkingChunk(APP_ID, ({ delta }) => {
        setIsStreaming(true);
        setStatus('Thinking…');
        setStreamEvents((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].type === 'thinking') {
            const updated = [...prev];
            updated[updated.length - 1] = {
              type: 'thinking',
              value: `${updated[updated.length - 1].value}${delta}`
            };
            return updated;
          }
          return [...prev, { type: 'thinking', value: delta }];
        });
        console.log('[template] thinking chunk:', delta);
      }),
      window.electron.agent.onMessageComplete(APP_ID, () => {
        setIsStreaming(false);
        setStatus('Response complete');
      }),
      window.electron.agent.onMessageError(APP_ID, (error: string) => {
        setIsStreaming(false);
        setStatus(`Error: ${error}`);
      })
    ];

    return () => cleanups.forEach((cleanup) => cleanup?.());
  }, []);

  const handlePing = async () => {
    setStatus('Sending a sample message…');
    setStreamEvents([]);
    setIsStreaming(true);
    try {
      await window.electron.agent.runConversation(APP_ID, {
        messages: [
          {
            type: 'user',
            message: {
              role: 'user',
              content: [{ type: 'text', text: 'Hello from the template app!' }]
            },
            parent_tool_use_id: null,
            session_id: undefined
          }
        ],
        systemPrompt: [
          'You are a friendly demo agent. Keep replies short.',
          'If asked to inspect a file, call the summarize-file tool from the _template skill with --path <file>.',
          'Return the JSON result from the tool plus a one-line takeaway.'
        ].join(' ')
      });
      setStatus('Streaming response…');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStatus(`Error: ${message}`);
      setIsStreaming(false);
    }
  };

  const rendered = useMemo(() => {
    if (streamEvents.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 bg-white/2 px-6 py-10 text-slate-200/80">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300/80" />
          <p className="text-sm tracking-tight">Live stream will appear here.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 text-sm leading-relaxed">
        {streamEvents.map((event, idx) => (
          <div
            key={`${event.type}-${idx}`}
            className="group relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur"
          >
            <div className="absolute inset-0 opacity-0 transition duration-500 group-hover:bg-gradient-to-r group-hover:from-emerald-500/10 group-hover:to-cyan-500/10 group-hover:opacity-100" />
            <div className="relative flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-slate-200/80 uppercase">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-[10px] ${
                  event.type === 'thinking' ?
                    'border-amber-300/60 bg-amber-400/15 text-amber-50'
                  : 'border-emerald-300/70 bg-emerald-400/10 text-emerald-50'
                }`}
              >
                {event.type === 'thinking' ? 'Δ' : '→'}
              </span>
              {event.type === 'thinking' ? 'Thinking' : 'Message'}
              <span className="ml-auto text-slate-400/80">{String(idx + 1).padStart(2, '0')}</span>
            </div>
            <p className="relative mt-3 text-[15px] leading-relaxed font-semibold text-slate-50">
              {event.value.trim()}
            </p>
          </div>
        ))}
      </div>
    );
  }, [streamEvents]);

  const statusTone = (() => {
    if (status.startsWith('Error')) return 'bg-rose-500/15 text-rose-100 ring-1 ring-rose-500/40';
    if (isStreaming) return 'bg-emerald-400/15 text-emerald-100 ring-1 ring-emerald-400/40';
    return 'bg-white/10 text-slate-200 ring-1 ring-white/15';
  })();

  return (
    <div className="flex h-full flex-col gap-6 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-slate-50 shadow-[0_30px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/5">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.04] p-6 shadow-xl backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.14),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(6,182,212,0.12),transparent_30%)]" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.28em] text-slate-300/80 uppercase">Template App</p>
              <h1 className="text-3xl font-semibold tracking-tight text-white">
                Pi Codex Playground
              </h1>
              <p className="max-w-3xl text-sm text-slate-200/80">
                A minimal, production-ready shell for new apps. Stream events are wired through{' '}
                <span className="font-mono text-emerald-200/90">window.electron.agent</span> so you
                can plug in your own UI quickly.
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusTone}`}>
              {status}
            </span>
          </div>

          <div className="relative mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 font-mono text-[13px] text-emerald-100 shadow-inner ring-1 shadow-emerald-500/10 ring-emerald-400/20">
            {`await window.electron.agent.sendMessage('${APP_ID}', {
  text: 'Hello from my new app'
});`}
          </div>

          <div className="relative mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={handlePing}
              className="rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-400 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-md shadow-emerald-400/40 transition hover:from-emerald-300 hover:to-cyan-300"
            >
              Send sample message
            </button>
            <button
              type="button"
              onClick={async () => {
                setStatus('Summarizing README.md…');
                setStreamEvents([]);
                setIsStreaming(true);
                try {
                  await window.electron.agent.runConversation(APP_ID, {
                    systemPrompt: [
                      'Use the summarize-file tool from the _template skill when asked to inspect a file.',
                      'Prefer summarizing README.md at the workspace root. If missing, say it is not available.',
                      'Return the JSON from the tool and add a one-line human summary.'
                    ].join(' '),
                    messages: [
                      {
                        type: 'user',
                        message: {
                          role: 'user',
                          content: [
                            {
                              type: 'text',
                              text: 'Summarize README.md with the template skill and list any TODOs.'
                            }
                          ]
                        },
                        parent_tool_use_id: null,
                        session_id: undefined
                      }
                    ]
                  });
                  setStatus('Streaming response…');
                } catch (error) {
                  const message = error instanceof Error ? error.message : 'Unknown error';
                  setStatus(`Error: ${message}`);
                  setIsStreaming(false);
                }
              }}
              className="rounded-xl border border-emerald-300/50 bg-white/10 px-4 py-2 text-sm font-semibold text-emerald-100 shadow-sm transition hover:bg-white/15"
            >
              Demo: summarize README
            </button>
            {isStreaming ?
              <span className="flex items-center gap-2 text-sm text-slate-200/90">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-300" />
                Live streaming…
              </span>
            : <span className="text-sm text-slate-300/80">{status}</span>}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-5 shadow-xl backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(52,211,153,0.08),transparent_35%),radial-gradient(circle_at_85%_20%,rgba(56,189,248,0.08),transparent_30%)]" />
          <div className="relative mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs tracking-[0.24em] text-slate-300/80 uppercase">Live Stream</p>
              <p className="text-sm text-slate-200/80">
                Realtime agent output with thinking vs text.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase ${
                isStreaming ?
                  'bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-300/40'
                : 'bg-white/10 text-slate-200 ring-1 ring-white/15'
              }`}
            >
              {isStreaming ? 'Active' : 'Idle'}
            </span>
          </div>
          <div className="relative mt-2 flex-1 overflow-auto rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/80 p-4 shadow-inner shadow-black/40">
            {rendered}
          </div>
        </div>
      </div>
    </div>
  );
}
