import { useState, useRef, useEffect, useMemo } from 'react';
import { PageHeader, Card, Button, SectionTitle } from '../../components/ui';
import { useAuth } from '../../lib/auth-context';
import { aiService } from '../../lib/services/ai';
import { adminService } from '../../lib/services/admin';
import { farmsService } from '../../lib/services/farms';
import { useAsync } from '../../lib/hooks/useAsync';
import { toArray } from '../../lib/api';
import type { Farm } from '../../types';
import { Send, TrendingUp, RefreshCw, ChevronDown, Search } from 'lucide-react';
import DiseaseDetection from '../../components/ai/DiseaseDetection';
import FarmAsystLogo from '../../components/ui/FarmAsystLogo';
import '../farmer/farmer.css';

type Tab = 'chat' | 'disease' | 'credit';

const GRADE_COLORS: Record<string, string> = {
  A: '#16a34a', B: '#4A7C2F', C: '#ca8a04', D: '#ea580c', F: '#dc2626',
};

// ── Farmer dropdown types ─────────────────────────────────────────────────────
interface FarmerOption {
  id: string;
  name: string;
  district?: string;
  region?: string;
}

// ── Farmer Dropdown Component ─────────────────────────────────────────────────
function FarmerDropdown({
  farmers,
  selectedId,
  onSelect,
  loading,
}: {
  farmers: FarmerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = farmers.find(f => f.id === selectedId);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return farmers;
    return farmers.filter(
      f =>
        f.name.toLowerCase().includes(q) ||
        (f.district ?? '').toLowerCase().includes(q) ||
        (f.region ?? '').toLowerCase().includes(q),
    );
  }, [farmers, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Focus search when opened
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const choose = (id: string) => {
    onSelect(id);
    setOpen(false);
    setSearch('');
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: 260 }}>
      <label
        style={{
          display: 'block',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--col-muted)',
          marginBottom: 6,
        }}
      >
        Select Farmer
      </label>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        disabled={loading}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 12px',
          border: '1px solid var(--col-border)',
          borderRadius: 8,
          background: loading ? 'var(--col-surface-raised, #f8f8f8)' : 'var(--col-surface)',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 14,
          fontFamily: 'inherit',
          color: selected ? 'var(--col-text)' : 'var(--col-muted)',
          textAlign: 'left',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading
            ? 'Loading farmers…'
            : selected
            ? selected.name
            : farmers.length === 0
            ? 'No farmers found'
            : 'Choose a farmer…'}
        </span>
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            color: 'var(--col-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'var(--col-surface)',
            border: '1px solid var(--col-border)',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
            overflow: 'hidden',
          }}
        >
          {/* Search */}
          <div
            style={{
              padding: '8px 10px',
              borderBottom: '1px solid var(--col-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Search size={14} style={{ color: 'var(--col-muted)', flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search by name or district…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                fontSize: 13,
                fontFamily: 'inherit',
                background: 'transparent',
                color: 'var(--col-text)',
              }}
            />
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: '14px 12px',
                  fontSize: 13,
                  color: 'var(--col-muted)',
                  textAlign: 'center',
                }}
              >
                No farmers match "{search}"
              </div>
            ) : (
              filtered.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => choose(f.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '10px 12px',
                    border: 'none',
                    background:
                      f.id === selectedId
                        ? 'var(--col-primary-light, rgba(74,124,47,0.1))'
                        : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    borderBottom: '1px solid var(--col-border)',
                  }}
                  onMouseEnter={e => {
                    if (f.id !== selectedId)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        'var(--col-surface-raised, #f8f8f8)';
                  }}
                  onMouseLeave={e => {
                    if (f.id !== selectedId)
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: f.id === selectedId ? 600 : 400,
                      color:
                        f.id === selectedId ? 'var(--col-primary)' : 'var(--col-text)',
                    }}
                  >
                    {f.name}
                  </span>
                  {(f.district || f.region) && (
                    <span style={{ fontSize: 11, color: 'var(--col-muted)', marginTop: 2 }}>
                      {[f.district, f.region].filter(Boolean).join(', ')}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AIAssistant Page ─────────────────────────────────────────────────────
export default function AIAssistant() {
  const { user } = useAuth();
  const role = user?.role ?? 'farmer';

  const showCreditTab = ['admin', 'farmer'].includes(role);
  const showDiseaseTab = ['admin', 'farmer', 'monitoring_officer', 'vet'].includes(role);

  const [tab, setTab] = useState<Tab>('chat');

  // ── Chat ──────────────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendChat = async () => {
    if (!chatInput.trim() || chatBusy) return;
    const userMsg = chatInput.trim();
    setChatInput('');
    setChatBusy(true);
    setChatError('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    try {
      const res = await aiService.chat(userMsg, sessionId);
      setSessionId(res.session_id);
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply }]);
    } catch {
      setChatError('Assistant unavailable. Please try again.');
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '⚠️ I could not respond. Please try again.' },
      ]);
    } finally {
      setChatBusy(false);
    }
  };

  // ── Farms (for disease detection) ─────────────────────────────────────────
  const farms = useAsync(() => farmsService.list(), []);
  const farmList = toArray<Farm>(farms.data);

  // ── Credit Scoring ────────────────────────────────────────────────────────
  // For farmers: always use their own ID. For admins: dropdown.
  const [creditFarmerId, setCreditFarmerId] = useState<string>(
    role === 'farmer' ? (user?.id ?? '') : '',
  );
  const [creditResult, setCreditResult] = useState<any>(null);
  const [creditBusy, setCreditBusy] = useState(false);
  const [creditError, setCreditError] = useState('');

  // Load farmer list for admin dropdown
  const farmerListAsync = useAsync(
    () =>
      role === 'admin'
        ? adminService.listFarmerProfiles()
        : Promise.resolve([] as any[]),
    [role],
  );

  // Normalise the farmer list into simple { id, name, district, region }
  const farmerOptions: FarmerOption[] = useMemo(() => {
    const raw = toArray<any>(farmerListAsync.data);
    return raw
      .map(item => {
        // /profiles/farmers/ returns FarmerProfile with nested user
        const u = item.user ?? item;
        const name = u.full_name?.trim() || `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email;
        return {
          id: u.id as string,
          name: name || 'Unknown Farmer',
          district: item.district ?? u.district,
          region: item.region ?? u.region,
        } as FarmerOption;
      })
      .filter(f => f.id && f.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [farmerListAsync.data]);

  const runCreditScore = async () => {
    if (!creditFarmerId) return;
    setCreditBusy(true);
    setCreditError('');
    setCreditResult(null);
    try {
      const res = await aiService.scoreCreditworthiness(creditFarmerId);
      setCreditResult(res);
    } catch (err: any) {
      setCreditError(err?.response?.data?.detail ?? 'Credit scoring failed.');
    } finally {
      setCreditBusy(false);
    }
  };

  const roleLabels: Record<string, string> = {
    farmer: 'Poultry Farmer Assistant',
    investor: 'Investment AI Assistant',
    admin: 'Admin AI Assistant',
    monitoring_officer: 'Field Officer Assistant',
    vet: 'Veterinary AI Assistant',
    consumer: 'Buyer Assistant',
    input_dealer: 'Input Dealer Assistant',
  };

  const tabs: Tab[] = (['chat'] as Tab[])
    .concat(showDiseaseTab ? ['disease'] : [])
    .concat(showCreditTab ? ['credit'] : []);

  return (
    <div>
      <PageHeader
        title="AI Assistant"
        subtitle={roleLabels[role] ?? 'FarmAsyst North AI'}
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--sp-lg)', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              background: tab === t ? 'var(--col-primary)' : 'var(--col-surface)',
              color: tab === t ? '#fff' : 'var(--col-text)',
              boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
              fontFamily: 'inherit',
            }}
          >
            {t === 'chat'
              ? '💬 AI Chat'
              : t === 'disease'
              ? '🦠 Disease Detection'
              : '📊 Credit Scoring'}
          </button>
        ))}
      </div>

      {/* ── CHAT TAB ── */}
      {tab === 'chat' && (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              minHeight: 360,
              maxHeight: 500,
              overflowY: 'auto',
              padding: 'var(--sp-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 60, color: 'var(--col-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                  <FarmAsystLogo size={48} circle />
                </div>
                <p style={{ margin: 0, fontSize: 14 }}>
                  Ask me anything about your{' '}
                  {role === 'farmer'
                    ? 'farm, flock health, credit, or training'
                    : role === 'investor'
                    ? 'portfolio, farmer profiles, or impact data'
                    : role === 'vet'
                    ? 'bookings, poultry diseases, or treatment protocols'
                    : role === 'monitoring_officer'
                    ? 'farm audits, disease signals, or report protocols'
                    : 'platform features and data'}
                  .
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '78%',
                    padding: '10px 14px',
                    borderRadius:
                      m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background:
                      m.role === 'user'
                        ? 'var(--col-primary)'
                        : 'var(--col-surface-raised, #f5f5f5)',
                    color: m.role === 'user' ? '#fff' : 'var(--col-text)',
                    fontSize: 14,
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {chatBusy && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'var(--col-surface-raised, #f5f5f5)',
                    fontSize: 13,
                    color: 'var(--col-muted)',
                  }}
                >
                  Thinking…
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div
            style={{
              borderTop: '1px solid var(--col-border)',
              padding: 'var(--sp-sm) var(--sp-md)',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            {chatError && (
              <p style={{ color: 'var(--col-danger)', fontSize: 12, margin: 0 }}>{chatError}</p>
            )}
            <textarea
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
              placeholder="Type your question… (Enter to send)"
              rows={2}
              disabled={chatBusy}
              style={{
                flex: 1,
                resize: 'none',
                border: '1px solid var(--col-border)',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                fontFamily: 'inherit',
              }}
            />
            <Button
              onClick={sendChat}
              disabled={!chatInput.trim() || chatBusy}
              style={{ padding: '10px 16px', minWidth: 48 }}
            >
              <Send size={16} />
            </Button>
          </div>
        </Card>
      )}

      {/* ── DISEASE DETECTION TAB ── */}
      {tab === 'disease' && showDiseaseTab && (
        <DiseaseDetection farmList={farmList} role={role} />
      )}

      {/* ── CREDIT SCORING TAB ── */}
      {tab === 'credit' && showCreditTab && (
        <div>
          <Card>
            <SectionTitle>AI Credit Scoring Engine</SectionTitle>
            <p style={{ fontSize: 14, color: 'var(--col-muted)', margin: '0 0 var(--sp-md)' }}>
              Analyse farmer KPIs, farm data, audit scores, and activity logs to generate a
              creditworthiness score.
            </p>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              {/* Admin: show farmer dropdown */}
              {role === 'admin' && (
                <FarmerDropdown
                  farmers={farmerOptions}
                  selectedId={creditFarmerId}
                  onSelect={setCreditFarmerId}
                  loading={farmerListAsync.loading}
                />
              )}

              {/* Farmer: show their own name as read-only context */}
              {role === 'farmer' && (
                <div style={{ flex: 1, minWidth: 260 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--col-muted)',
                      marginBottom: 6,
                    }}
                  >
                    Farmer
                  </label>
                  <div
                    style={{
                      padding: '10px 12px',
                      border: '1px solid var(--col-border)',
                      borderRadius: 8,
                      background: 'var(--col-surface-raised, #f8f8f8)',
                      fontSize: 14,
                      color: 'var(--col-text)',
                    }}
                  >
                    {user?.full_name ||
                      `${user?.first_name ?? ''} ${user?.last_name ?? ''}`.trim() ||
                      'My Profile'}
                  </div>
                </div>
              )}

              <Button
                onClick={runCreditScore}
                disabled={creditBusy || !creditFarmerId}
                style={{ whiteSpace: 'nowrap' }}
              >
                {creditBusy ? (
                  <>
                    <RefreshCw size={14} style={{ marginRight: 6 }} />
                    Scoring…
                  </>
                ) : (
                  '📊 Run Credit Score'
                )}
              </Button>
            </div>

            {creditError && (
              <p style={{ color: 'var(--col-danger)', marginTop: 12, fontSize: 14 }}>
                {creditError}
              </p>
            )}
          </Card>

          {creditResult && (
            <Card style={{ marginTop: 'var(--sp-md)' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginBottom: 'var(--sp-md)',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 26,
                    fontWeight: 800,
                    background: (GRADE_COLORS[creditResult.grade] ?? '#666') + '18',
                    color: GRADE_COLORS[creditResult.grade] ?? '#666',
                    border: `3px solid ${GRADE_COLORS[creditResult.grade] ?? '#666'}`,
                  }}
                >
                  {creditResult.grade}
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>
                    {creditResult.overall_score}
                    <span style={{ fontSize: 14, color: 'var(--col-muted)', fontWeight: 400 }}>
                      /100
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--col-muted)' }}>
                    {creditResult.farmer_name}
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: 'auto',
                    padding: '8px 18px',
                    borderRadius: 20,
                    fontWeight: 700,
                    fontSize: 13,
                    textTransform: 'capitalize',
                    background:
                      creditResult.recommendation === 'approve'
                        ? '#16a34a20'
                        : creditResult.recommendation === 'review'
                        ? '#ca8a0420'
                        : '#dc262620',
                    color:
                      creditResult.recommendation === 'approve'
                        ? '#16a34a'
                        : creditResult.recommendation === 'review'
                        ? '#ca8a04'
                        : '#dc2626',
                  }}
                >
                  <TrendingUp size={12} style={{ marginRight: 6 }} />
                  {creditResult.recommendation}
                </div>
              </div>

              <SectionTitle>Score Breakdown</SectionTitle>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 10,
                  marginBottom: 'var(--sp-md)',
                }}
              >
                {Object.entries(creditResult.dimensions).map(([key, val]: [string, any]) => (
                  <div
                    key={key}
                    style={{
                      padding: '12px 14px',
                      background: 'var(--col-surface-raised, #f8f8f8)',
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--col-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: 4,
                      }}
                    >
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700 }}>
                      {val}
                      <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>/20</span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: 'var(--col-border)',
                        marginTop: 6,
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          borderRadius: 2,
                          background: 'var(--col-primary)',
                          width: `${(val / 20) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 'var(--sp-md)' }}>
                {creditResult.narrative}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--sp-md)',
                }}
              >
                <div>
                  <SectionTitle>Strengths</SectionTitle>
                  <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                    {creditResult.strengths?.map((s: string, i: number) => (
                      <li key={i} style={{ marginBottom: 4, color: '#16a34a' }}>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <SectionTitle>Risks</SectionTitle>
                  <ul style={{ paddingLeft: 20, fontSize: 14 }}>
                    {creditResult.risks?.map((r: string, i: number) => (
                      <li key={i} style={{ marginBottom: 4, color: '#ea580c' }}>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <p
                style={{
                  fontSize: 12,
                  color: 'var(--col-muted)',
                  marginTop: 'var(--sp-md)',
                  borderTop: '1px solid var(--col-border)',
                  paddingTop: 8,
                }}
              >
                Generated: {new Date(creditResult.generated_at).toLocaleString()}
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
