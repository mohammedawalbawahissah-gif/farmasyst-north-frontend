import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Minimize2, MessageCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { aiService } from '../../lib/services/ai';
import { FarmAsystLogoMark } from '../ui/FarmAsystLogo';
import './AIFloatingWidget.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const ROLE_GREETINGS: Record<string, string> = {
  farmer:            'Hi! I\'m your FarmAsyst AI. Ask me about your flock health, credit, training, or anything farm-related.',
  investor:          'Hello! I\'m your investment AI. Ask me about portfolio performance, farmer profiles, or impact data.',
  admin:             'Hi! I\'m the admin AI. Ask about credit scoring, user management, or platform analytics.',
  monitoring_officer:'Hi! I\'m your field AI. Ask about farm audits, biosecurity scoring, or report writing.',
  vet:               'Hello! I\'m your veterinary AI. Ask about poultry diseases, treatment protocols, or bookings.',
  consumer:          'Hi! I\'m your buyer AI. Ask about produce listings, orders, or product quality.',
  input_dealer:      'Hello! I\'m your dealer AI. Ask about listings, farmer needs, or feed information.',
};

export default function AIFloatingWidget() {
  const { user } = useAuth();
  const role = user?.role ?? 'farmer';

  const [open, setOpen]           = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState('');
  const [busy, setBusy]           = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [unread, setUnread]       = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Seed greeting on first open
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: ROLE_GREETINGS[role] ?? ROLE_GREETINGS.farmer,
      }]);
    }
  }, [open]);

  useEffect(() => {
    if (open && !minimized) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnread(0);
      inputRef.current?.focus();
    }
  }, [messages, open, minimized]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);

    try {
      const res = await aiService.chat(text, sessionId);
      setSessionId(res.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
      if (minimized || !open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '⚠️ I\'m having trouble right now. Please try again in a moment.',
      }]);
    } finally {
      setBusy(false);
    }
  }, [input, busy, sessionId, minimized, open]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setMinimized(false);
    setUnread(0);
  };

  return (
    <>
      {/* Floating button */}
      {(!open || minimized) && (
        <button
          className="ai-fab"
          onClick={handleOpen}
          title="Open AI Assistant"
          aria-label="Open AI Assistant"
        >
          <FarmAsystLogoMark size={36} aiMode />
          {unread > 0 && <span className="ai-fab__badge">{unread}</span>}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className={`ai-widget${minimized ? ' ai-widget--min' : ''}`}>
          {/* Header */}
          <div className="ai-widget__header">
            <div className="ai-widget__header-left">
              <div className="ai-widget__avatar">
                <FarmAsystLogoMark size={24} aiMode />
              </div>
              <div>
                <div className="ai-widget__title">FarmAsyst AI</div>
                <div className="ai-widget__status">
                  <span className="ai-widget__dot" />
                  {busy ? 'Thinking…' : 'Online'}
                </div>
              </div>
            </div>
            <div className="ai-widget__header-actions">
              <button
                className="ai-widget__icon-btn"
                onClick={() => setMinimized(m => !m)}
                title={minimized ? 'Expand' : 'Minimise'}
              >
                {minimized ? <MessageCircle size={15} /> : <Minimize2 size={15} />}
              </button>
              <button
                className="ai-widget__icon-btn"
                onClick={() => setOpen(false)}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          {!minimized && (
            <>
              <div className="ai-widget__body">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`ai-widget__bubble ai-widget__bubble--${m.role}`}
                  >
                    {m.content}
                  </div>
                ))}
                {busy && (
                  <div className="ai-widget__bubble ai-widget__bubble--assistant ai-widget__bubble--typing">
                    <span /><span /><span />
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="ai-widget__footer">
                <textarea
                  ref={inputRef}
                  className="ai-widget__input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Ask anything… (Enter to send)"
                  rows={1}
                  disabled={busy}
                />
                <button
                  className="ai-widget__send"
                  onClick={send}
                  disabled={!input.trim() || busy}
                  title="Send"
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
