import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { otpService } from '../../lib/services/otp';
import FarmAsystLogo from '../../components/ui/FarmAsystLogo';
import './Login.css';
import { getApiErrorMessage } from '../../lib/errors';

interface OTPVerificationProps {
  userId:     string;
  channels:   ('sms' | 'email')[];
  phone?:     string;
  email?:     string;
  redirectTo?: string;
  onSkip?:    () => void;
  /** Called when all channels are verified and no redirectTo is set (gated roles) */
  onComplete?: () => void;
}

export default function OTPVerification({
  userId, channels, phone, email, redirectTo, onSkip, onComplete,
}: OTPVerificationProps) {
  const navigate = useNavigate();
  const [activeChannel, setActiveChannel] = useState<'sms' | 'email'>(channels[0] ?? 'sms');
  const [code,         setCode]         = useState(['', '', '', '', '', '']);
  const [busy,         setBusy]         = useState(false);
  const [error,        setError]        = useState('');
  const [resendBusy,   setResendBusy]   = useState(false);
  const [resendMsg,    setResendMsg]    = useState('');
  const [verified,     setVerified]     = useState<string[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, [activeChannel]);

  const codeString = code.join('');

  const handleInput = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[idx] = val.slice(-1);
    setCode(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
    if (e.key === 'Enter' && codeString.length === 6) handleVerify();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    if (codeString.length < 6 || busy) return;
    setBusy(true); setError('');
    try {
      await otpService.verify({ user_id: userId, code: codeString, channel: activeChannel });
      setVerified(prev => [...prev, activeChannel]);
      setCode(['', '', '', '', '', '']);

      const remaining = channels.filter(c => c !== activeChannel && !verified.includes(c));
      if (remaining.length > 0) {
        setActiveChannel(remaining[0]);
      } else {
        // All channels verified
        if (redirectTo) navigate(redirectTo);
        else if (onComplete) onComplete();
        else navigate('/login');
      }
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Incorrect code. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    setResendBusy(true); setResendMsg('');
    try {
      await otpService.resend(userId, activeChannel);
      setResendMsg(`New code sent via ${activeChannel.toUpperCase()}.`);
      setTimeout(() => setResendMsg(''), 5000);
    } catch {
      setResendMsg('Failed to resend. Please try again.');
    } finally {
      setResendBusy(false);
    }
  };

  const channelLabel = activeChannel === 'sms'
    ? `SMS to ${phone ? `+233${phone.replace(/^0/, '').slice(0, 3)}****${phone.slice(-3)}` : 'your phone'}`
    : `Email to ${email ? `${email.slice(0, 3)}***@${email.split('@')[1]}` : 'your email'}`;

  return (
    <div className="login-page">
      <div className="login-page__bg" />
      <div className="login-page__container">
        <div className="login-page__header">
          <FarmAsystLogo size={52} />
          <h1 className="login-page__title">Verify your account</h1>
          <p className="login-page__tagline">
            We sent a 6-digit code via {channelLabel}
          </p>
        </div>

        {/* Channel tabs if multiple */}
        {channels.length > 1 && (
          <div className="auth-toggle" style={{ marginBottom: 20 }}>
            {channels.map(ch => (
              <button
                key={ch}
                className={`auth-toggle__btn ${activeChannel === ch ? 'auth-toggle__btn--active' : ''}`}
                onClick={() => { setActiveChannel(ch); setCode(['', '', '', '', '', '']); setError(''); }}
                type="button"
              >
                {ch === 'sms' ? '📱 SMS Code' : '📧 Email Code'}
                {verified.includes(ch) && ' ✓'}
              </button>
            ))}
          </div>
        )}

        {/* Verified channel indicator */}
        {verified.length > 0 && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginBottom: 16,
            background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
            fontSize: 13,
          }}>
            ✓ {verified.map(c => c.toUpperCase()).join(' and ')} verified.
            {channels.filter(c => !verified.includes(c)).length > 0 && ' Please also verify the next channel below.'}
          </div>
        )}

        {/* 6-digit code input */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
          {code.map((digit, idx) => (
            <input
              key={idx}
              ref={el => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleInput(idx, e.target.value)}
              onKeyDown={e => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              disabled={busy}
              style={{
                width: 46, height: 54,
                textAlign: 'center', fontSize: 24, fontWeight: 700,
                border: `2px solid ${digit ? '#2D4A1E' : 'var(--col-border, #ddd)'}`,
                borderRadius: 10,
                background: digit ? '#f0fdf4' : '#fff',
                outline: 'none', transition: 'border-color 0.15s',
                fontFamily: 'monospace',
              }}
            />
          ))}
        </div>

        {error && (
          <p style={{ color: '#dc2626', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
            {error}
          </p>
        )}

        {resendMsg && (
          <p style={{ color: '#16a34a', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
            {resendMsg}
          </p>
        )}

        <button
          onClick={handleVerify}
          disabled={codeString.length < 6 || busy}
          className="login-form__submit"
          style={{ marginBottom: 12 }}
        >
          {busy ? 'Verifying…' : 'Verify →'}
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <button
            onClick={handleResend}
            disabled={resendBusy}
            style={{
              background: 'none', border: 'none', cursor: resendBusy ? 'not-allowed' : 'pointer',
              color: '#2D4A1E', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            {resendBusy ? 'Sending…' : 'Resend code'}
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#9ca3af', fontSize: 12, fontFamily: 'inherit',
              }}
            >
              Skip for now
            </button>
          )}
        </div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9ca3af' }}>
          Code expires in 10 minutes.
        </p>
      </div>
    </div>
  );
}
