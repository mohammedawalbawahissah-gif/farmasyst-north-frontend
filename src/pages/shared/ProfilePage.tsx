import { useState, useEffect, useRef } from 'react';
import { Camera, Save, Lock, Eye, EyeOff, User, CheckCircle } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { authService } from '../../lib/services/auth';
import { vetService } from '../../lib/services/vet';
import { inputDealerService } from '../../lib/services/inputDealer';
import { PageHeader, Button } from '../../components/ui';

// ── helpers ──────────────────────────────────────────────────────────────────
const GHANA_REGIONS = [
  'Ahafo','Ashanti','Bono','Bono East','Central','Eastern','Greater Accra',
  'North East','Northern','Oti','Savannah','Upper East','Upper West',
  'Volta','Western','Western North',
];

function Field({
  label, children, hint,
}: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="form-field">
      <label>{label}</label>
      {children}
      {hint && <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>{hint}</span>}
    </div>
  );
}

// ── main component ─────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();

  // ── base user state ───────────────────────────────────────────────────────
  const [firstName,    setFirstName]    = useState(user?.first_name ?? '');
  const [lastName,     setLastName]     = useState(user?.last_name  ?? '');
  const [phone,        setPhone]        = useState(user?.phone       ?? '');
  const [language,     setLanguage]     = useState<'en'|'dag'>(user?.language ?? 'en');
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.profile_photo ?? null);
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);

  // ── role-specific profile state ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roleProfile, setRoleProfile]   = useState<Record<string, any>>({});
  const [roleLoading, setRoleLoading]   = useState(false);

  // ── ui state ─────────────────────────────────────────────────────────────
  const [saving,      setSaving]        = useState(false);
  const [saved,       setSaved]         = useState(false);
  const [err,         setErr]           = useState('');

  // password change
  const [pwSection,   setPwSection]     = useState(false);
  const [oldPw,       setOldPw]         = useState('');
  const [newPw,       setNewPw]         = useState('');
  const [newPw2,      setNewPw2]        = useState('');
  const [showOld,     setShowOld]       = useState(false);
  const [showNew,     setShowNew]       = useState(false);
  const [pwSaving,    setPwSaving]      = useState(false);
  const [pwMsg,       setPwMsg]         = useState('');
  const [pwErr,       setPwErr]         = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load role-specific profile on mount
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setRoleLoading(true);
      try {
        if (user.role === 'farmer') {
          const p = await authService.getFarmerProfile();
          setRoleProfile(p);
        } else if (user.role === 'investor') {
          const p = await authService.getInvestorProfile();
          setRoleProfile(p);
        } else if (user.role === 'vet') {
          const p = await vetService.getMyProfile();
          setRoleProfile(p as unknown as Record<string, unknown>);
        } else if (user.role === 'input_dealer') {
          const p = await inputDealerService.getMyProfile();
          setRoleProfile(p as unknown as Record<string, unknown>);
        }
      } catch { /* profile row may not exist yet — starts empty */ }
      finally { setRoleLoading(false); }
    };
    load();
  }, [user]);

  if (!user) return null;

  // ── photo pick ────────────────────────────────────────────────────────────
  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  // ── save base profile ─────────────────────────────────────────────────────
  const handleSave = async () => {
    setErr(''); setSaving(true); setSaved(false);
    try {
      // 1. Update base user fields (always FormData so photo works)
      const fd = new FormData();
      fd.append('first_name', firstName);
      fd.append('last_name',  lastName);
      fd.append('phone',      phone);
      fd.append('language',   language);
      if (photoFile) fd.append('profile_photo', photoFile);
      await authService.updateMe(fd);

      // 2. Update role-specific extended profile
      if (user.role === 'farmer') {
        await authService.updateFarmerProfile({
          ghana_card_number: roleProfile.ghana_card_number ?? '',
          district:          roleProfile.district          ?? '',
          region:            roleProfile.region            ?? '',
          community:         roleProfile.community         ?? '',
          gps_address:       roleProfile.gps_address       ?? '',
          years_of_farming:  roleProfile.years_of_farming  ?? 0,
        });
      } else if (user.role === 'investor') {
        await authService.updateInvestorProfile({
          organisation:           roleProfile.organisation            ?? '',
          investor_type:          roleProfile.investor_type           ?? '',
          registration_number:    roleProfile.registration_number     ?? '',
          max_investment_amount:  roleProfile.max_investment_amount   ?? 0,
          preferred_credit_types: roleProfile.preferred_credit_types  ?? [],
          preferred_regions:      roleProfile.preferred_regions       ?? [],
        });
      } else if (user.role === 'vet') {
        await vetService.updateMyProfile({
          license_number:   roleProfile.license_number   ?? '',
          specialisation:   roleProfile.specialisation   ?? '',
          clinic_name:      roleProfile.clinic_name      ?? '',
          region:           roleProfile.region           ?? '',
          district:         roleProfile.district         ?? '',
          phone:            roleProfile.phone            ?? '',
          is_available:     roleProfile.is_available     ?? true,
          consultation_fee: roleProfile.consultation_fee ?? 0,
          services_offered: roleProfile.services_offered ?? '',
        });
      } else if (user.role === 'input_dealer') {
        await inputDealerService.updateMyProfile({
          business_name:       roleProfile.business_name       ?? '',
          registration_number: roleProfile.registration_number ?? '',
          region:              roleProfile.region              ?? '',
          district:            roleProfile.district            ?? '',
          address:             roleProfile.address             ?? '',
          phone:               roleProfile.phone               ?? '',
          product_categories:  roleProfile.product_categories  ?? [],
        } as never);
      }

      await refreshUser();
      setSaved(true);
      setPhotoFile(null);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErr(msg ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── save password ─────────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    setPwErr(''); setPwMsg('');
    if (newPw !== newPw2) { setPwErr('New passwords do not match.'); return; }
    if (newPw.length < 8)  { setPwErr('Password must be at least 8 characters.'); return; }
    setPwSaving(true);
    try {
      await authService.changePassword(oldPw, newPw);
      setPwMsg('Password updated successfully.');
      setOldPw(''); setNewPw(''); setNewPw2('');
    } catch {
      setPwErr('Old password is incorrect or new password is too weak.');
    } finally {
      setPwSaving(false);
    }
  };

  const rp = roleProfile;
  const setRp = (k: string, v: unknown) => setRoleProfile(r => ({ ...r, [k]: v }));

  const ROLE_LABEL: Record<string, string> = {
    farmer: 'Farmer', investor: 'Investor', consumer: 'Consumer',
    vet: 'Veterinarian', input_dealer: 'Input Dealer',
    monitoring_officer: 'Monitoring Officer', admin: 'Administrator',
  };

  return (
    <div style={{ maxWidth: 680 }}>
      <PageHeader
        title="My Profile"
        subtitle="Update your personal information and account settings."
      />

      {/* ── Photo + identity ───────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: 'var(--sp-xl)',
        border: '1px solid var(--col-border)', marginBottom: 'var(--sp-lg)',
      }}>
        <h3 style={{ margin: '0 0 var(--sp-lg)', fontSize: 15, fontWeight: 700 }}>
          <User size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Personal Information
        </h3>

        {/* Photo upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-lg)', marginBottom: 'var(--sp-lg)' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--col-primary)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 32, color: '#fff', fontWeight: 700,
              border: '3px solid var(--col-border)',
            }}>
              {photoPreview
                ? <img src={photoPreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setPhotoPreview(null)} />
                : (user.full_name || user.first_name || '?').charAt(0).toUpperCase()
              }
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--col-primary)', border: '2px solid #fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#fff',
              }}
              title="Change photo"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileInputRef} type="file" accept="image/*"
              style={{ display: 'none' }} onChange={handlePhotoPick}
            />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>{user.full_name || `${user.first_name} ${user.last_name}`}</div>
            <div style={{ fontSize: 13, color: 'var(--col-muted)', marginTop: 2 }}>{user.email}</div>
            <div style={{
              display: 'inline-block', marginTop: 6, fontSize: 11, fontWeight: 600,
              padding: '2px 10px', borderRadius: 99, textTransform: 'uppercase',
              background: 'var(--col-primary)', color: '#fff', letterSpacing: '0.05em',
            }}>{ROLE_LABEL[user.role] ?? user.role}</div>
          </div>
        </div>

        {photoFile && (
          <p style={{ fontSize: 12, color: 'var(--col-primary)', marginBottom: 'var(--sp-md)' }}>
            📷 New photo selected — click Save to apply.
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
          <Field label="First name">
            <input value={firstName} onChange={e => setFirstName(e.target.value)} />
          </Field>
          <Field label="Last name">
            <input value={lastName} onChange={e => setLastName(e.target.value)} />
          </Field>
        </div>

        <Field label="Email" hint="Email cannot be changed. Contact admin if needed.">
          <input value={user.email} readOnly style={{ background: 'var(--col-surface)', cursor: 'not-allowed' }} />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
          <Field label="Phone number">
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="024XXXXXXX" />
          </Field>
          <Field label="Preferred language">
            <select value={language} onChange={e => setLanguage(e.target.value as 'en'|'dag')}>
              <option value="en">English</option>
              <option value="dag">Dagbani</option>
            </select>
          </Field>
        </div>
      </div>

      {/* ── Role-specific profile ─────────────────────────────────────────── */}
      {!roleLoading && (
        <>
          {user.role === 'farmer' && (
            <div style={{
              background: '#fff', borderRadius: 12, padding: 'var(--sp-xl)',
              border: '1px solid var(--col-border)', marginBottom: 'var(--sp-lg)',
            }}>
              <h3 style={{ margin: '0 0 var(--sp-lg)', fontSize: 15, fontWeight: 700 }}>🌾 Farmer Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
                <Field label="Ghana Card number">
                  <input value={rp.ghana_card_number ?? ''} onChange={e => setRp('ghana_card_number', e.target.value)} placeholder="GHA-XXXXXXXXX-X" />
                </Field>
                <Field label="Years of farming experience">
                  <input type="number" min="0" value={rp.years_of_farming ?? 0} onChange={e => setRp('years_of_farming', parseInt(e.target.value) || 0)} />
                </Field>
                <Field label="Region">
                  <select value={rp.region ?? ''} onChange={e => setRp('region', e.target.value)}>
                    <option value="">— select region —</option>
                    {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="District">
                  <input value={rp.district ?? ''} onChange={e => setRp('district', e.target.value)} />
                </Field>
                <Field label="Community / Town">
                  <input value={rp.community ?? ''} onChange={e => setRp('community', e.target.value)} />
                </Field>
                <Field label="GPS address">
                  <input value={rp.gps_address ?? ''} onChange={e => setRp('gps_address', e.target.value)} placeholder="e.g. NR-2345-6789" />
                </Field>
              </div>
              {rp.verification_status && (
                <div style={{ marginTop: 'var(--sp-md)', fontSize: 13, color: 'var(--col-muted)' }}>
                  Verification status: <strong style={{ textTransform: 'capitalize' }}>{rp.verification_status}</strong>
                  {rp.credit_score && <> · Credit score: <strong>{rp.credit_score}</strong></>}
                </div>
              )}
            </div>
          )}

          {user.role === 'investor' && (
            <div style={{
              background: '#fff', borderRadius: 12, padding: 'var(--sp-xl)',
              border: '1px solid var(--col-border)', marginBottom: 'var(--sp-lg)',
            }}>
              <h3 style={{ margin: '0 0 var(--sp-lg)', fontSize: 15, fontWeight: 700 }}>💼 Investor Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
                <Field label="Organisation name">
                  <input value={rp.organisation ?? ''} onChange={e => setRp('organisation', e.target.value)} />
                </Field>
                <Field label="Investor type">
                  <select value={rp.investor_type ?? ''} onChange={e => setRp('investor_type', e.target.value)}>
                    <option value="">— select type —</option>
                    <option value="bank">Bank / MFI</option>
                    <option value="off_taker">Off-taker</option>
                    <option value="restaurant">Restaurant</option>
                    <option value="aggregator">Aggregator</option>
                    <option value="ngo">NGO / Development Partner</option>
                  </select>
                </Field>
                <Field label="Registration number">
                  <input value={rp.registration_number ?? ''} onChange={e => setRp('registration_number', e.target.value)} />
                </Field>
                <Field label="Max investment amount (GHS)">
                  <input type="number" min="0" value={rp.max_investment_amount ?? 0}
                    onChange={e => setRp('max_investment_amount', e.target.value)} />
                </Field>
              </div>
              <Field label="Preferred credit types">
                <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap', marginTop: 4 }}>
                  {(['funding','inputs','training'] as const).map(t => {
                    const selected = (rp.preferred_credit_types ?? []).includes(t);
                    return (
                      <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '4px 12px', borderRadius: 99,
                        border: `1px solid ${selected ? 'var(--col-primary)' : 'var(--col-border)'}`,
                        background: selected ? '#f0f7f0' : '#fff', fontSize: 13 }}>
                        <input type="checkbox" checked={selected} style={{ accentColor: 'var(--col-primary)' }}
                          onChange={() => {
                            const cur: string[] = rp.preferred_credit_types ?? [];
                            setRp('preferred_credit_types', selected ? cur.filter(x => x !== t) : [...cur, t]);
                          }} />
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </label>
                    );
                  })}
                </div>
              </Field>
              <Field label="Preferred regions">
                <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap', marginTop: 4 }}>
                  {GHANA_REGIONS.map(r => {
                    const selected = (rp.preferred_regions ?? []).includes(r);
                    return (
                      <label key={r} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                        padding: '3px 10px', borderRadius: 99, fontSize: 12,
                        border: `1px solid ${selected ? 'var(--col-primary)' : 'var(--col-border)'}`,
                        background: selected ? '#f0f7f0' : '#fff' }}>
                        <input type="checkbox" checked={selected} style={{ accentColor: 'var(--col-primary)' }}
                          onChange={() => {
                            const cur: string[] = rp.preferred_regions ?? [];
                            setRp('preferred_regions', selected ? cur.filter(x => x !== r) : [...cur, r]);
                          }} />
                        {r}
                      </label>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}

          {user.role === 'vet' && (
            <div style={{
              background: '#fff', borderRadius: 12, padding: 'var(--sp-xl)',
              border: '1px solid var(--col-border)', marginBottom: 'var(--sp-lg)',
            }}>
              <h3 style={{ margin: '0 0 var(--sp-lg)', fontSize: 15, fontWeight: 700 }}>🩺 Vet Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
                <Field label="License number">
                  <input value={rp.license_number ?? ''} onChange={e => setRp('license_number', e.target.value)} />
                </Field>
                <Field label="Clinic / practice name">
                  <input value={rp.clinic_name ?? ''} onChange={e => setRp('clinic_name', e.target.value)} />
                </Field>
                <Field label="Specialisation">
                  <input value={rp.specialisation ?? ''} onChange={e => setRp('specialisation', e.target.value)} placeholder="e.g. Poultry diseases, Avian health" />
                </Field>
                <Field label="Consultation fee (GHS)">
                  <input type="number" min="0" value={rp.consultation_fee ?? 0} onChange={e => setRp('consultation_fee', e.target.value)} />
                </Field>
                <Field label="Region">
                  <select value={rp.region ?? ''} onChange={e => setRp('region', e.target.value)}>
                    <option value="">— select region —</option>
                    {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="District">
                  <input value={rp.district ?? ''} onChange={e => setRp('district', e.target.value)} />
                </Field>
                <Field label="Contact phone">
                  <input type="tel" value={rp.phone ?? ''} onChange={e => setRp('phone', e.target.value)} placeholder="024XXXXXXX" />
                </Field>
                <Field label="Availability">
                  <select value={rp.is_available ? 'yes' : 'no'} onChange={e => setRp('is_available', e.target.value === 'yes')}>
                    <option value="yes">Available for bookings</option>
                    <option value="no">Not available</option>
                  </select>
                </Field>
              </div>
              <Field label="Services offered" hint="Describe the services you provide to poultry farmers.">
                <textarea rows={3} value={rp.services_offered ?? ''} onChange={e => setRp('services_offered', e.target.value)}
                  placeholder="e.g. Vaccination, disease diagnosis, farm visits across Northern Region…" />
              </Field>
              {rp.approval_status && (
                <div style={{ marginTop: 'var(--sp-md)', fontSize: 13, color: 'var(--col-muted)' }}>
                  Approval status: <strong style={{ textTransform: 'capitalize' }}>{rp.approval_status}</strong>
                </div>
              )}
            </div>
          )}

          {user.role === 'input_dealer' && (
            <div style={{
              background: '#fff', borderRadius: 12, padding: 'var(--sp-xl)',
              border: '1px solid var(--col-border)', marginBottom: 'var(--sp-lg)',
            }}>
              <h3 style={{ margin: '0 0 var(--sp-lg)', fontSize: 15, fontWeight: 700 }}>🏪 Dealer Profile</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
                <Field label="Business name">
                  <input value={rp.business_name ?? ''} onChange={e => setRp('business_name', e.target.value)} />
                </Field>
                <Field label="Registration number">
                  <input value={rp.registration_number ?? ''} onChange={e => setRp('registration_number', e.target.value)} />
                </Field>
                <Field label="Region">
                  <select value={rp.region ?? ''} onChange={e => setRp('region', e.target.value)}>
                    <option value="">— select region —</option>
                    {GHANA_REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </Field>
                <Field label="District">
                  <input value={rp.district ?? ''} onChange={e => setRp('district', e.target.value)} />
                </Field>
                <Field label="Business phone">
                  <input type="tel" value={rp.phone ?? ''} onChange={e => setRp('phone', e.target.value)} placeholder="024XXXXXXX" />
                </Field>
              </div>
              <Field label="Business address">
                <textarea rows={2} value={rp.address ?? ''} onChange={e => setRp('address', e.target.value)}
                  placeholder="Full address of your business location" />
              </Field>
              <Field label="Product categories">
                <div style={{ display: 'flex', gap: 'var(--sp-sm)', flexWrap: 'wrap', marginTop: 4 }}>
                  {(['feed','vaccine','medication','equipment','supplement','disinfectant','other'] as const).map(cat => {
                    const selected = (rp.product_categories ?? []).includes(cat);
                    return (
                      <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                        padding: '4px 12px', borderRadius: 99, fontSize: 13,
                        border: `1px solid ${selected ? 'var(--col-primary)' : 'var(--col-border)'}`,
                        background: selected ? '#f0f7f0' : '#fff' }}>
                        <input type="checkbox" checked={selected} style={{ accentColor: 'var(--col-primary)' }}
                          onChange={() => {
                            const cur: string[] = rp.product_categories ?? [];
                            setRp('product_categories', selected ? cur.filter(x => x !== cat) : [...cur, cat]);
                          }} />
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </label>
                    );
                  })}
                </div>
              </Field>
              {rp.approval_status && (
                <div style={{ marginTop: 'var(--sp-md)', fontSize: 13, color: 'var(--col-muted)' }}>
                  Approval status: <strong style={{ textTransform: 'capitalize' }}>{rp.approval_status}</strong>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Save button ───────────────────────────────────────────────────── */}
      {err && (
        <p style={{ color: 'var(--col-danger,#c0392b)', fontSize: 13, marginBottom: 'var(--sp-md)' }}>{err}</p>
      )}
      {saved && (
        <p style={{ color: 'var(--col-success,#27ae60)', fontSize: 13, marginBottom: 'var(--sp-md)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={14} /> Profile saved successfully.
        </p>
      )}
      <Button onClick={handleSave} disabled={saving} style={{ marginBottom: 'var(--sp-xl)' }}>
        <Save size={15} style={{ marginRight: 6 }} />
        {saving ? 'Saving…' : 'Save Profile'}
      </Button>

      {/* ── Change password ───────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: 'var(--sp-xl)',
        border: '1px solid var(--col-border)',
      }}>
        <button
          onClick={() => { setPwSection(s => !s); setPwErr(''); setPwMsg(''); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 15, fontWeight: 700, color: 'inherit',
          }}
        >
          <Lock size={16} />
          Change Password
          <span style={{ fontSize: 12, color: 'var(--col-muted)', fontWeight: 400 }}>
            {pwSection ? '▲ Hide' : '▼ Show'}
          </span>
        </button>

        {pwSection && (
          <div style={{ marginTop: 'var(--sp-lg)' }}>
            <Field label="Current password">
              <div style={{ position: 'relative' }}>
                <input type={showOld ? 'text' : 'password'} value={oldPw} onChange={e => setOldPw(e.target.value)}
                  style={{ paddingRight: 40 }} />
                <button onClick={() => setShowOld(s => !s)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)', padding: 0 }}>
                  {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-md)' }}>
              <Field label="New password">
                <div style={{ position: 'relative' }}>
                  <input type={showNew ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                    style={{ paddingRight: 40 }} />
                  <button onClick={() => setShowNew(s => !s)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--col-muted)', padding: 0 }}>
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
              <Field label="Confirm new password">
                <input type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} />
              </Field>
            </div>
            {pwErr && <p style={{ color: 'var(--col-danger,#c0392b)', fontSize: 13, marginBottom: 'var(--sp-sm)' }}>{pwErr}</p>}
            {pwMsg && <p style={{ color: 'var(--col-success,#27ae60)', fontSize: 13, marginBottom: 'var(--sp-sm)', display:'flex',alignItems:'center',gap:6 }}><CheckCircle size={14}/> {pwMsg}</p>}
            <Button onClick={handleChangePassword} disabled={pwSaving || !oldPw || !newPw || !newPw2} variant="secondary">
              {pwSaving ? 'Updating…' : 'Update Password'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
