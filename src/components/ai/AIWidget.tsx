import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, ChevronDown, Minimize2 } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { aiService } from '../../lib/services/ai';
import { useLocation } from 'react-router-dom';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ROLE_HINTS: Record<string, string> = {
  farmer:             'Ask me about your flock health, credit, training, or farm activity.',
  investor:           'Ask me about your portfolio, farmer performance, or investment opportunities.',
  admin:              'Ask me about platform metrics, user management, or credit workflows.',
  monitoring_officer: 'Ask me about farm audit protocols, disease signals, or report guidance.',
  vet:                'Ask me about poultry diseases, treatment protocols, or booking management.',
  consumer:           'Ask me about products, orders, or subscriptions.',
  input_dealer:       'Ask me about listing products, managing stock, or reaching farmers.',
};

const ROLE_COLORS: Record<string, string> = {
  farmer:             '#4A7C2F',
  investor:           '#1A4A6B',
  admin:              '#5C2D8B',
  monitoring_officer: '#7B5C1A',
  vet:                '#1A5C4A',
  consumer:           '#8B3A2F',
  input_dealer:       '#2F4A7C',
};

// Pages where the widget is hidden (the dedicated full-page AI Assistant)
const AI_PAGE_PATTERNS = ['/ai'];

export default function AIWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const role = user?.role ?? 'farmer';
  const accentColor = ROLE_COLORS[role] ?? '#4A7C2F';

  // Hide on dedicated AI Assistant page
  const isAIPage = AI_PAGE_PATTERNS.some(p => location.pathname.endsWith(p));
  if (isAIPage) return null;

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [unread, setUnread] = useState(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [open, messages]);

  useEffect(() => {
    if (open && !minimized) {
      textareaRef.current?.focus();
    }
  }, [open, minimized]);

  const sendMessage = async () => {
    if (!input.trim() || busy) return;
    const userText = input.trim();
    setInput('');
    setBusy(true);
    const newMessages: Message[] = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);

    try {
      const res = await aiService.chat(userText, sessionId);
      setSessionId(res.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
      if (!open || minimized) setUnread(prev => prev + 1);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ I could not respond right now. Please try again.' }]);
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ── Floating Bubble ───────────────────────────────────── */}
      {!open && (
        <button
          onClick={() => { setOpen(true); setMinimized(false); }}
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: accentColor,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            zIndex: 1000,
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          title="AI Assistant"
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(0,0,0,0.32)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)';
          }}
        >
          <Bot size={26} color="#fff" />
          {unread > 0 && (
            <span style={{
              position: 'absolute',
              top: -2,
              right: -2,
              background: '#dc2626',
              color: '#fff',
              borderRadius: '50%',
              width: 20,
              height: 20,
              fontSize: 11,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #fff',
            }}>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      )}

      {/* ── Chat Panel ───────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: 28,
            right: 28,
            width: 360,
            maxWidth: 'calc(100vw - 40px)',
            borderRadius: 16,
            background: 'var(--col-surface)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid var(--col-border)',
            maxHeight: minimized ? 56 : '75vh',
            transition: 'max-height 0.3s ease',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: accentColor,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
              cursor: minimized ? 'pointer' : 'default',
            }}
            onClick={() => minimized && setMinimized(false)}
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <Bot size={18} color="#fff" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>FarmAsyst AI</div>
              <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 1 }}>
                {busy ? 'Thinking…' : 'Online'}
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setMinimized(prev => !prev); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              title={minimized ? 'Expand' : 'Minimise'}
            >
              {minimized
                ? <ChevronDown size={18} color="rgba(255,255,255,0.85)" />
                : <Minimize2 size={16} color="rgba(255,255,255,0.85)" />
              }
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
              title="Close"
            >
              <X size={18} color="rgba(255,255,255,0.85)" />
            </button>
          </div>

          {/* Messages */}
          {!minimized && (
            <>
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '14px 14px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                minHeight: 200,
              }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', marginTop: 24, padding: '0 8px' }}>
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      background: accentColor + '18',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}>
                      <Bot size={24} color={accentColor} />
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--col-muted)', lineHeight: 1.55, margin: 0 }}>
                      {ROLE_HINTS[role] ?? 'How can I help you today?'}
                    </p>
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {getSuggestions(role).map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                          style={{
                            background: accentColor + '12',
                            border: `1px solid ${accentColor}30`,
                            borderRadius: 8,
                            padding: '7px 12px',
                            fontSize: 12,
                            color: accentColor,
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontFamily: 'inherit',
                            fontWeight: 500,
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '82%',
                      padding: '9px 13px',
                      borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: m.role === 'user' ? accentColor : 'var(--col-chalk, #f5f5f0)',
                      color: m.role === 'user' ? '#fff' : 'var(--col-text)',
                      fontSize: 13,
                      lineHeight: 1.55,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {busy && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div style={{
                      padding: '9px 14px',
                      borderRadius: '14px 14px 14px 4px',
                      background: 'var(--col-chalk, #f5f5f0)',
                      fontSize: 13,
                      color: 'var(--col-muted)',
                      display: 'flex',
                      gap: 4,
                      alignItems: 'center',
                    }}>
                      <span style={{ animation: 'aiDot 1.2s ease-in-out infinite' }}>●</span>
                      <span style={{ animation: 'aiDot 1.2s ease-in-out 0.2s infinite' }}>●</span>
                      <span style={{ animation: 'aiDot 1.2s ease-in-out 0.4s infinite' }}>●</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div style={{
                borderTop: '1px solid var(--col-border)',
                padding: '10px 12px',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-end',
                flexShrink: 0,
                background: 'var(--col-surface)',
              }}>
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything… (Enter to send)"
                  rows={1}
                  disabled={busy}
                  style={{
                    flex: 1,
                    resize: 'none',
                    border: '1px solid var(--col-border)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: 13,
                    fontFamily: 'inherit',
                    background: 'var(--col-chalk, #f7f4ee)',
                    maxHeight: 80,
                    outline: 'none',
                    lineHeight: 1.4,
                  }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || busy}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: (!input.trim() || busy) ? 'var(--col-border)' : accentColor,
                    border: 'none',
                    cursor: (!input.trim() || busy) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background 0.2s',
                  }}
                >
                  <Send size={15} color="#fff" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Typing dot animation */}
      <style>{`
        @keyframes aiDot {
          0%, 60%, 100% { opacity: 0.2; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-3px); }
        }
      `}</style>
    </>
  );
}

function getSuggestions(role: string): string[] {
  const map: Record<string, string[]> = {
    farmer:             ['How do I apply for credit?', 'Signs of Newcastle disease?', 'How to improve my credit score?'],
    investor:           ['Which farmers have the best returns?', 'How is my portfolio performing?', 'What risks should I watch?'],
    admin:              ['How many pending credit applications?', 'What are today\'s critical alerts?', 'Summarise platform activity'],
    monitoring_officer: ['What should I check during a farm audit?', 'How do I submit a report?', 'Signs of biosecurity failure?'],
    vet:                ['What are common poultry diseases in Ghana?', 'How do I manage my bookings?', 'Treatment for coccidiosis?'],
    consumer:           ['How do I track my order?', 'What products are available?', 'How do subscriptions work?'],
    input_dealer:       ['How do I add a new listing?', 'How do farmers order from me?', 'How to manage my stock?'],
  };
  return map[role] ?? ['How can I help you today?'];
}
