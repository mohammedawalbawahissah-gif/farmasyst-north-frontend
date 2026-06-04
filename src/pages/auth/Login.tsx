import { useState, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth-context';
import { authService } from '../../lib/services/auth';
import './Login.css';

type Mode = 'login' | 'register';

// Admin is intentionally excluded — admin accounts are created internally only
const ROLES = [
  { value: 'farmer',   label: '🐔 Poultry Farmer',    desc: 'Apply for credit, manage farm, access training' },
  { value: 'investor', label: '💼 Investor / Partner', desc: 'Fund farmers, track portfolio, view reports' },
  { value: 'consumer', label: '🛒 Consumer / Buyer',   desc: 'Browse and order quality poultry produce' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [mode, setMode] = useState<Mode>('login');

  // ── Login state ───────────────────────────────────────────────
  const [email,       setEmail]    = useState('');
  const [password,    setPassword] = useState('');
  const [loginError,  setLoginError]  = useState('');
  const [loginBusy,   setLoginBusy]   = useState(false);

  // ── Register state ────────────────────────────────────────────
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');
  const [role,      setRole]      = useState('farmer');
  const [regEmail,  setRegEmail]  = useState('');
  const [regPass,   setRegPass]   = useState('');
  const [regPass2,  setRegPass2]  = useState('');
  const [regError,  setRegError]  = useState('');
  const [regSuccess,setRegSuccess]= useState('');
  const [regBusy,   setRegBusy]   = useState(false);

  const submitting = useRef(false);

  // Reset everything on mount — guards against stale state from HMR or StrictMode
  useState(() => {
    submitting.current = false;
  });

  const switchMode = (m: Mode) => {
    submitting.current = false;
    setLoginBusy(false);
    setRegBusy(false);
    setMode(m);
    setLoginError(''); setRegError(''); setRegSuccess('');
  };

  // ── Login submit ──────────────────────────────────────────────
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setLoginError('');
    setLoginBusy(true);
    try {
      const { user: me } = await login({ email, password });
      navigate(`/${me.role}`);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setLoginError(detail ?? 'Invalid email or password. Please try again.');
      setLoginBusy(false);
      submitting.current = false;
    }
  };

  // ── Register submit ───────────────────────────────────────────
  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;   // hard guard against double-fire
    submitting.current = true;

    setRegError(''); setRegSuccess('');

    if (regPass !== regPass2) {
      setRegError('Passwords do not match.');
      submitting.current = false;
      return;
    }
    if (regPass.length < 8) {
      setRegError('Password must be at least 8 characters.');
      submitting.current = false;
      return;
    }

    setRegBusy(true);
    try {
      await authService.register({
        email: regEmail, first_name: firstName, last_name: lastName,
        phone, role, password: regPass, password2: regPass2,
      });
      setRegSuccess(
        'Account created! It is pending review by a FarmAsyst North administrator. ' +
        'You will be able to log in once approved.'
      );
      setFirstName(''); setLastName(''); setPhone('');
      setRegEmail(''); setRegPass(''); setRegPass2('');
      setRole('farmer');
    } catch (err: unknown) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data;
      if (data) {
        const nfe = data['non_field_errors'];
        if (Array.isArray(nfe) && nfe.length) {
          setRegError(String(nfe[0]));
        } else if (data['detail']) {
          setRegError(String(data['detail']));
        } else {
          const firstVal = Object.values(data)[0];
          setRegError(Array.isArray(firstVal) ? String(firstVal[0]) : String(firstVal ?? 'Registration failed.'));
        }
      } else {
        setRegError('Registration failed. Please try again.');
      }
    } finally {
      setRegBusy(false);
      submitting.current = false;
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__bg" />

      <div className="login-page__container">
        {/* Header */}
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
            onClick={() => switchMode('login')}
            type="button"
          >
            Sign in
          </button>
          <button
            className={`auth-toggle__btn ${mode === 'register' ? 'auth-toggle__btn--active' : ''}`}
            onClick={() => switchMode('register')}
            type="button"
          >
            Create account
          </button>
        </div>

        {/* ── LOGIN FORM ── */}
        {mode === 'login' && (
          <form className="login-form" onSubmit={handleLogin} noValidate>
            <div className="login-form__field">
              <label htmlFor="email">Email address</label>
              <input
                id="email" type="email" autoComplete="email"
                placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)}
                required disabled={loginBusy}
              />
            </div>
            <div className="login-form__field">
              <label htmlFor="password">Password</label>
              <input
                id="password" type="password" autoComplete="current-password"
                placeholder="Enter your password"
                value={password} onChange={e => setPassword(e.target.value)}
                required disabled={loginBusy}
              />
            </div>
            {loginError && <p className="login-form__error">{loginError}</p>}
            <button
              type="submit" className="login-form__submit"
              disabled={loginBusy || !email || !password}
            >
              {loginBusy ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="login-form__switch">
              Don't have an account?{' '}
              <button type="button" onClick={() => switchMode('register')}>Create one</button>
            </p>
          </form>
        )}

        {/* ── REGISTER FORM ── */}
        {mode === 'register' && (
          <form className="login-form" onSubmit={handleRegister} noValidate>

            {/* Role selector */}
            <div className="role-picker">
              {ROLES.map(r => (
                <button
                  key={r.value} type="button"
                  className={`role-card ${role === r.value ? 'role-card--active' : ''}`}
                  onClick={() => setRole(r.value)}
                  disabled={regBusy}
                >
                  <span className="role-card__label">{r.label}</span>
                  <span className="role-card__desc">{r.desc}</span>
                </button>
              ))}
            </div>

            {/* Name row */}
            <div className="login-form__row">
              <div className="login-form__field">
                <label htmlFor="firstName">First name</label>
                <input
                  id="firstName" type="text" placeholder="Kofi"
                  value={firstName} onChange={e => setFirstName(e.target.value)}
                  required disabled={regBusy}
                />
              </div>
              <div className="login-form__field">
                <label htmlFor="lastName">Last name</label>
                <input
                  id="lastName" type="text" placeholder="Mensah"
                  value={lastName} onChange={e => setLastName(e.target.value)}
                  required disabled={regBusy}
                />
              </div>
            </div>

            <div className="login-form__field">
              <label htmlFor="regEmail">Email address</label>
              <input
                id="regEmail" type="email" placeholder="you@example.com"
                value={regEmail} onChange={e => setRegEmail(e.target.value)}
                required disabled={regBusy}
              />
            </div>

            <div className="login-form__field">
              <label htmlFor="phone">Phone number (MoMo)</label>
              <input
                id="phone" type="tel" placeholder="024XXXXXXX"
                value={phone} onChange={e => setPhone(e.target.value)}
                required disabled={regBusy}
              />
            </div>

            <div className="login-form__row">
              <div className="login-form__field">
                <label htmlFor="regPass">Password</label>
                <input
                  id="regPass" type="password" placeholder="Min. 8 characters"
                  value={regPass} onChange={e => setRegPass(e.target.value)}
                  required disabled={regBusy}
                />
              </div>
              <div className="login-form__field">
                <label htmlFor="regPass2">Confirm password</label>
                <input
                  id="regPass2" type="password" placeholder="Repeat password"
                  value={regPass2} onChange={e => setRegPass2(e.target.value)}
                  required disabled={regBusy}
                />
              </div>
            </div>

            {regError   && <p className="login-form__error">{regError}</p>}
            {regSuccess && <p className="login-form__success">{regSuccess}</p>}

            <button
              type="submit" className="login-form__submit"
              disabled={regBusy || !firstName || !lastName || !regEmail || !phone || !regPass || !regPass2}
            >
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
