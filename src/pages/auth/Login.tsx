import { useState, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { authService } from '../../lib/services/auth';
import './Login.css';

type Mode = 'login' | 'register' | 'success';

// Admin is excluded — created by admins only
const ROLES = [
  { value: 'farmer',             label: '🐔 Poultry Farmer',        desc: 'Apply for credit, manage farm, access training' },
  { value: 'investor',           label: '💼 Investor / Partner',    desc: 'Fund farmers, track portfolio, view reports' },
  { value: 'consumer',           label: '🛒 Consumer / Buyer',      desc: 'Browse and order quality poultry produce' },
  { value: 'monitoring_officer', label: '🔍 Monitoring Officer',    desc: 'Conduct farm audits and submit field reports (admin approval required)' },
  { value: 'vet',                label: '🩺 Veterinarian',          desc: 'Offer vet services to poultry farmers (admin approval required)' },
  { value: 'input_dealer',       label: '🏪 Farm Input Dealer',     desc: 'Sell feed, vaccines & equipment on the platform (admin approval required)' },
];

function parseApiError(err: unknown): string {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
  if (!data) return 'Something went wrong. Please try again.';
  if (data['detail'])        return String(data['detail']);
  if (data['non_field_errors']) {
    const v = data['non_field_errors'];
    return Array.isArray(v) ? String(v[0]) : String(v);
  }
  if (data['email']) {
    const v = data['email'];
    return Array.isArray(v) ? String(v[0]) : String(v);
  }
  const first = Object.values(data)[0];
  return Array.isArray(first) ? String(first[0]) : String(first ?? 'Registration failed.');
}

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [mode, setMode] = useState<Mode>('login');

  // ── Login ──────────────────────────────────────────────────────
  const [email,      setEmail]     = useState('');
  const [password,   setPassword]  = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginBusy,  setLoginBusy]  = useState(false);

  // ── Register ───────────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [role,      setRole]      = useState('farmer');
  const [regEmail,  setRegEmail]  = useState('');
  const [regPass,   setRegPass]   = useState('');
  const [regPass2,  setRegPass2]  = useState('');
  const [regError,  setRegError]  = useState('');
  const [regBusy,   setRegBusy]   = useState(false);
  const [regDone,   setRegDone]   = useState<{ name: string; email: string } | null>(null);

  const switchMode = (m: Mode) => {
    setMode(m);
    setLoginError(''); setRegError('');
  };

  // ── Login submit ───────────────────────────────────────────────
  const handleLogin = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (loginBusy) return;
    setLoginError('');
    setLoginBusy(true);
    try {
      const { user: me } = await login({ email, password });
      navigate(`/${me.role}`);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setLoginError(detail ?? 'Invalid email or password.');
    } finally {
      setLoginBusy(false);
    }
  }, [loginBusy, email, password, login, navigate]);

  // ── Register submit ────────────────────────────────────────────
  const handleRegister = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (regBusy) return;

    if (!firstName.trim() || !lastName.trim()) { setRegError('Please enter your full name.'); return; }
    if (!regEmail.trim())  { setRegError('Please enter your email address.'); return; }
    if (!phone.trim())     { setRegError('Please enter your phone number.'); return; }
    if (regPass.length < 8) { setRegError('Password must be at least 8 characters.'); return; }
    if (regPass !== regPass2) { setRegError('Passwords do not match.'); return; }

    setRegError('');
    setRegBusy(true);

    try {
      await authService.register({
        email: regEmail.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        role,
        password: regPass,
        password2: regPass2,
      });
      setRegDone({ name: firstName.trim(), email: regEmail.trim() });
      setMode('success');
    } catch (err: unknown) {
      setRegError(parseApiError(err));
    } finally {
      setRegBusy(false);
    }
  }, [regBusy, firstName, lastName, regEmail, phone, role, regPass, regPass2]);

  // ── Success screen ─────────────────────────────────────────────
  if (mode === 'success' && regDone) {
    return (
      <div className="login-page">
        <div className="login-page__bg" />
        <div className="login-page__container">
          <div className="login-page__header">
            <div className="login-page__logo-mark">F</div>
            <h1 className="login-page__title">FarmAsyst North</h1>
          </div>
          <div className="reg-success-card">
            <div className="reg-success-card__icon">✅</div>
            <h2 className="reg-success-card__title">Account request submitted!</h2>
            <p className="reg-success-card__body">
              Hi <strong>{regDone.name}</strong>, your account has been created and is now
              <strong> pending verification</strong> by a FarmAsyst North administrator.
            </p>
            <p className="reg-success-card__body">
              Once approved, you'll receive a notification and can sign in with{' '}
              <strong>{regDone.email}</strong>.
            </p>
            <p className="reg-success-card__note">
              📧 You'll be notified by email or SMS when your account is activated.
            </p>
            <button
              className="login-form__submit"
              style={{ marginTop: 16 }}
              onClick={() => { setMode('login'); setRegDone(null); }}
            >
              Back to Sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-page__bg" />

      <div className="login-page__container">
        <div className="login-page__header">
          <div className="login-page__logo-mark">F</div>
          <h1 className="login-page__title">FarmAsyst North</h1>
          <p className="login-page__tagline">
            Agri-fintech platform connecting poultry farmers,<br />
            investors, and markets across northern Ghana.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="auth-toggle">
          <button
            className={`auth-toggle__btn ${mode === 'login' ? 'auth-toggle__btn--active' : ''}`}
            onClick={() => switchMode('login')} type="button"
          >Sign in</button>
          <button
            className={`auth-toggle__btn ${mode === 'register' ? 'auth-toggle__btn--active' : ''}`}
            onClick={() => switchMode('register')} type="button"
          >Create account</button>
        </div>

        {/* ── LOGIN ── */}
        {mode === 'login' && (
          <form className="login-form" onSubmit={handleLogin} noValidate>
            <div className="login-form__field">
              <label htmlFor="email">Email address</label>
              <input id="email" type="email" autoComplete="email"
                placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required disabled={loginBusy} />
            </div>
            <div className="login-form__field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" autoComplete="current-password"
                placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)}
                required disabled={loginBusy} />
            </div>
            {loginError && <p className="login-form__error">{loginError}</p>}
            <button type="submit" className="login-form__submit"
              disabled={loginBusy || !email || !password}>
              {loginBusy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="login-form__switch">
              Don't have an account?{' '}
              <button type="button" onClick={() => switchMode('register')}>Create one</button>
            </p>
          </form>
        )}

        {/* ── REGISTER ── */}
        {mode === 'register' && (
          <form className="login-form" onSubmit={handleRegister} noValidate>

            <div className="role-picker">
              {ROLES.map(r => (
                <button key={r.value} type="button"
                  className={`role-card ${role === r.value ? 'role-card--active' : ''}`}
                  onClick={() => setRole(r.value)} disabled={regBusy}>
                  <span className="role-card__label">{r.label}</span>
                  <span className="role-card__desc">{r.desc}</span>
                </button>
              ))}
            </div>

            <div className="login-form__row">
              <div className="login-form__field">
                <label htmlFor="firstName">First name</label>
                <input id="firstName" type="text" placeholder="Kofi"
                  value={firstName} onChange={e => setFirstName(e.target.value)}
                  required disabled={regBusy} />
              </div>
              <div className="login-form__field">
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" type="text" placeholder="Mensah"
                  value={lastName} onChange={e => setLastName(e.target.value)}
                  required disabled={regBusy} />
              </div>
            </div>

            <div className="login-form__field">
              <label htmlFor="regEmail">Email address</label>
              <input id="regEmail" type="email" placeholder="you@example.com"
                value={regEmail} onChange={e => setRegEmail(e.target.value)}
                required disabled={regBusy} />
            </div>

            <div className="login-form__field">
              <label htmlFor="phone">Phone number (MoMo)</label>
              <input id="phone" type="tel" placeholder="024XXXXXXX"
                value={phone} onChange={e => setPhone(e.target.value)}
                required disabled={regBusy} />
            </div>

            <div className="login-form__row">
              <div className="login-form__field">
                <label htmlFor="regPass">Password</label>
                <input id="regPass" type="password" placeholder="Min. 8 characters"
                  value={regPass} onChange={e => setRegPass(e.target.value)}
                  required disabled={regBusy} autoComplete="new-password" />
              </div>
              <div className="login-form__field">
                <label htmlFor="regPass2">Confirm password</label>
                <input id="regPass2" type="password" placeholder="Repeat password"
                  value={regPass2} onChange={e => setRegPass2(e.target.value)}
                  required disabled={regBusy} autoComplete="new-password" />
              </div>
            </div>

            {regPass.length > 0 && regPass.length < 8 && (
              <p style={{ fontSize: 12, color: '#E8A020', margin: '-8px 0 4px' }}>
                Password must be at least 8 characters
              </p>
            )}
            {regPass.length >= 8 && regPass2.length > 0 && regPass !== regPass2 && (
              <p style={{ fontSize: 12, color: '#c0392b', margin: '-8px 0 4px' }}>
                Passwords do not match
              </p>
            )}

            {regError && <p className="login-form__error">{regError}</p>}

            <button type="submit" className="login-form__submit"
              disabled={
                regBusy ||
                !firstName || !lastName || !regEmail || !phone ||
                regPass.length < 8 || regPass !== regPass2
              }>
              {regBusy ? 'Creating account…' : 'Create account'}
            </button>

            <p className="login-form__switch">
              Already have an account?{' '}
              <button type="button" onClick={() => switchMode('login')}>Sign in</button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
