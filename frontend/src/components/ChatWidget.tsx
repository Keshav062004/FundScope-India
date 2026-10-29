import { useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Sparkles } from 'lucide-react';
import { api } from '../api';

type Msg = { role: 'user' | 'model'; content: string };

const STARTER: Msg[] = [
  { role: 'model', content: "Hi, I'm the FundScope AI analyst. Ask me about CAGR, drawdown, volatility, or anything else in your current dataset." },
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(STARTER);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await api.aiChat(next.map((m) => ({ role: m.role, content: m.content })));
      setMode(res.mode);
      setMessages([...next, { role: 'model', content: res.reply }]);
    } catch (e: any) {
      setMode('unavailable');
      setMessages([...next, { role: 'model', content: `Something went wrong: ${e.message || e}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed bottom-24 right-3 z-50 flex h-[min(520px,calc(100vh-7rem))] w-[380px] max-w-[calc(100vw-24px)] flex-col rounded-2xl border sm:right-6 sm:max-w-[calc(100vw-48px)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-lg)' }}
          role="dialog" aria-label="FundScope Analyst chat"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b rounded-t-2xl text-white"
            style={{ borderColor: 'var(--border)', background: 'linear-gradient(115deg,#102845 0%,#173e6a 70%,#1f5ca2 100%)' }}>
            <div className="flex items-center gap-2">
              <Sparkles size={16} />
              <div>
                <div className="font-bold text-[13.5px] leading-none">FundScope Analyst</div>
                <div className="mt-1 text-[10px] text-[#cfe1f7]">{mode ? `Analysis mode: ${mode}` : 'Availability depends on server configuration'}</div>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close AI chat" className="rounded p-1 hover:bg-white/10"><X size={16} /></button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed"
                  style={
                    m.role === 'user'
                      ? { background: 'var(--brand)', color: '#061712', borderBottomRightRadius: 4 }
                      : { background: 'var(--surface-sunken)', color: 'var(--text-primary)', borderBottomLeftRadius: 4 }
                  }
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-xl px-3.5 py-2.5 text-[13px]" style={{ background: 'var(--surface-sunken)', color: 'var(--text-muted)' }}>
                  Thinking…
                </div>
              </div>
            )}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); void send(); }} className="flex gap-2 border-t p-3" style={{ borderColor: 'var(--border)' }}>
            <input
              aria-label="Message the FundScope Analyst"
              className="input min-w-0 flex-1"
              placeholder="Ask about your funds…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" disabled={loading || !input.trim()} aria-label="Send message" className="btn btn-primary btn-sm px-3"><Send size={15} /></button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full flex items-center justify-center text-white z-50 transition hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#65d8b7,#28a985)', color: '#061712', boxShadow: 'var(--shadow-lg)' }}
        aria-label={open ? 'Close AI chat' : 'Open AI chat'}
        aria-expanded={open}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
