import { useState } from 'react';
import type { Farm, User } from '../../types';
import { PageHeader, Card, Badge, Button, SectionTitle } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import { adminService } from '../../lib/services/admin';
import { toArray } from '../../lib/api';
import { PlusCircle, Search, Info } from 'lucide-react';
import '../farmer/farmer.css';
import './admin.css';

const FLOCK_BADGE: Record<string, 'success' | 'info' | 'neutral' | 'warning'> = {
  broilers:             'success',
  layers:               'info',
  guinea_fowl:          'success',
  turkey:               'success',
  duck:                 'info',
  geese:                'info',
  ostrich:              'neutral',
  local_birds:          'success',
  day_old_chicks:       'warning',
  hatchery:             'warning',
  poultry_and_hatchery: 'warning',
  meat_processing:      'neutral',
  mixed:                'neutral',
};

const REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Upper East', 'Upper West', 'Volta', 'Brong-Ahafo',
  'Oti', 'Savannah', 'North East', 'Ahafo', 'Bono East', 'Western North',
];

type FlockType =
  | 'broilers' | 'layers' | 'guinea_fowl' | 'turkey' | 'duck' | 'geese' | 'ostrich' | 'local_birds'
  | 'day_old_chicks' | 'hatchery' | 'poultry_and_hatchery' | 'meat_processing' | 'mixed';

interface FarmForm {
  owner:              string;
  name:               string;
  flock_type:         FlockType;
  // Poultry / mixed
  flock_size:         string;
  // Hatchery-specific
  incubator_capacity: string;
  incubators_count:   string;
  breeds_hatched:     string;
  // Meat processing-specific
  daily_capacity:     string;
  cold_storage_capacity: string;
  processing_equipment:  string;
  // Common location
  region:             string;
  district:           string;
  community:          string;
  gps_address:        string;
  farm_size_acres:    string;
  has_water_source:   boolean;
  has_electricity:    boolean;
}

const EMPTY_FORM: FarmForm = {
  owner: '', name: '', flock_type: 'broilers',
  flock_size: '',
  incubator_capacity: '', incubators_count: '', breeds_hatched: '',
  daily_capacity: '', cold_storage_capacity: '', processing_equipment: '',
  region: '', district: '', community: '', gps_address: '',
  farm_size_acres: '', has_water_source: false, has_electricity: false,
};

// Category helpers
const isPoultry     = (t: FlockType) => ['broilers','layers','guinea_fowl','turkey','duck','geese','ostrich','local_birds','mixed'].includes(t);
const isHatchery    = (t: FlockType) => ['day_old_chicks','hatchery','poultry_and_hatchery'].includes(t);
const isProcessing  = (t: FlockType) => t === 'meat_processing';
const isCombo       = (t: FlockType) => t === 'poultry_and_hatchery';

function SectionDivider({ label }: { label: string }) {
  return (
    <div style={{ borderTop: '1px solid var(--col-border)', paddingTop: 'var(--sp-md)', marginTop: 'var(--sp-sm)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--col-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-sm)' }}>
        {label}
      </p>
    </div>
  );
}

export default function AdminFarms() {
  const farms   = useAsync(() => farmsService.list(), []);
  const farmers = useAsync(() => adminService.listFarmers(), []);

  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState<FarmForm>(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState('');
  const [search,    setSearch]    = useState('');

  const allFarms   = toArray<Farm>(farms.data);
  const allFarmers = toArray<User>(farmers.data);

  const filtered = allFarms.filter(f => {
    const s = search.toLowerCase();
    return !s
      || f.name.toLowerCase().includes(s)
      || (f.owner_name ?? '').toLowerCase().includes(s)
      || f.region.toLowerCase().includes(s)
      || f.district.toLowerCase().includes(s);
  });

  const set = (k: keyof FarmForm, v: string | boolean) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const openModal = () => {
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const ft = form.flock_type;
  const showPoultryFields    = isPoultry(ft) || isCombo(ft);
  const showHatcheryFields   = isHatchery(ft);
  const showProcessingFields = isProcessing(ft);

  // Validation: required fields depend on type
  const isValid = (() => {
    if (!form.owner || !form.name || !form.region || !form.district) return false;
    if (showPoultryFields && !form.flock_size) return false;
    if (showHatcheryFields && !isCombo(ft) && !form.incubator_capacity) return false;
    return true;
  })();

  const handleSubmit = async () => {
    if (!isValid) { setError('Please fill in all required fields.'); return; }
    setSaving(true); setError('');
    try {
      const payload: Record<string, unknown> = {
        owner:            form.owner,
        name:             form.name,
        flock_type:       form.flock_type,
        flock_size:       parseInt(form.flock_size) || 0,
        region:           form.region,
        district:         form.district,
        community:        form.community,
        gps_address:      form.gps_address,
        farm_size_acres:  form.farm_size_acres || null,
        has_water_source: form.has_water_source,
        has_electricity:  form.has_electricity,
      };
      await farmsService.createFarmForFarmer(payload as never);
      setSuccess(`Farm "${form.name}" registered successfully.`);
      setShowModal(false);
      farms.refetch();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string; owner?: string[] } } })
        ?.response?.data;
      setError(msg?.owner?.[0] ?? msg?.detail ?? 'Failed to register farm. Please check the details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Farm Registry"
        subtitle="Register and manage farms on behalf of verified farmers."
      />

      {success && (
        <p className="form-success" style={{ marginBottom: 'var(--sp-md)' }}>{success}</p>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginBottom: 'var(--sp-lg)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--col-muted)' }} />
          <input
            style={{ paddingLeft: 32, width: '100%' }}
            placeholder="Search by farm name, farmer, region…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PlusCircle size={15} /> Register Farm
        </Button>
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid-4" style={{ marginBottom: 'var(--sp-xl)' }}>
        {[
          { label: 'Total Farms',        value: allFarms.length },
          { label: 'Active Farms',       value: allFarms.filter(f => f.is_active).length },
          { label: 'Total Flock',        value: allFarms.reduce((s, f) => s + f.flock_size, 0).toLocaleString() },
          { label: 'Farmers with Farms', value: new Set(allFarms.map(f => f.owner)).size },
        ].map(stat => (
          <div key={stat.label} className="stat-card" style={{ background: '#fff', border: '1px solid var(--col-border)', borderRadius: 8, padding: 'var(--sp-md)' }}>
            <div style={{ fontSize: 12, color: 'var(--col-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Registration Modal ───────────────────────────────────────────── */}
      {showModal && (
        <Card style={{ maxWidth: 640, marginBottom: 'var(--sp-xl)', border: '2px solid var(--col-primary, #5C2D8B)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-md)' }}>
            <h3 style={{ margin: 0 }}>Register New Farm</h3>
            <button
              onClick={() => setShowModal(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--col-muted)' }}
            >✕</button>
          </div>

          {error && <p className="form-error" style={{ marginBottom: 'var(--sp-md)' }}>{error}</p>}

          {/* Farmer selection */}
          <div className="form-field">
            <label>Farmer <span className="required">*</span></label>
            <select value={form.owner} onChange={e => set('owner', e.target.value)}>
              <option value="">— Select a farmer —</option>
              {allFarmers.map(f => (
                <option key={f.id} value={f.id}>
                  {f.full_name || `${f.first_name} ${f.last_name}`} ({f.email})
                </option>
              ))}
            </select>
            {allFarmers.length === 0 && (
              <span style={{ fontSize: 12, color: 'var(--col-muted)' }}>
                No farmer accounts found. Ensure farmers have registered on the platform.
              </span>
            )}
          </div>

          {/* Farm name */}
          <div className="form-field">
            <label>Farm name <span className="required">*</span></label>
            <input type="text" placeholder="e.g. Musah Poultry Farm" value={form.name} onChange={e => set('name', e.target.value)} />
          </div>

          {/* Farm type — drives the rest of the form */}
          <div className="form-field">
            <label>Farm type <span className="required">*</span></label>
            <select value={form.flock_type} onChange={e => set('flock_type', e.target.value as FlockType)}>
              <optgroup label="Poultry">
                <option value="broilers">Broilers</option>
                <option value="layers">Layers</option>
                <option value="guinea_fowl">Guinea Fowl</option>
                <option value="turkey">Turkey</option>
                <option value="duck">Duck</option>
                <option value="geese">Geese</option>
                <option value="ostrich">Ostrich</option>
                <option value="local_birds">Local Birds (Cocks &amp; Hens)</option>
                <option value="mixed">Mixed Poultry</option>
              </optgroup>
              <optgroup label="Hatchery">
                <option value="day_old_chicks">Day-Old Chicks</option>
                <option value="hatchery">Hatchery Only</option>
                <option value="poultry_and_hatchery">Poultry + Hatchery</option>
              </optgroup>
              <optgroup label="Processing">
                <option value="meat_processing">Meat Processing Farm</option>
              </optgroup>
            </select>
          </div>

          {/* ── Poultry-specific fields ────────────────────────────── */}
          {showPoultryFields && (
            <>
              <SectionDivider label="Flock Details" />
              <div className="form-field">
                <label>Current flock size <span className="required">*</span></label>
                <input
                  type="number" min="0" placeholder="e.g. 1000"
                  value={form.flock_size}
                  onChange={e => set('flock_size', e.target.value)}
                />
                <span style={{ fontSize: 11, color: 'var(--col-muted)' }}>
                  {ft === 'layers'      ? 'Total laying hens currently on farm.' :
                   ft === 'mixed'       ? 'Total birds across all species combined.' :
                   ft === 'local_birds' ? 'Total local cocks and hens combined.' :
                   'Total live birds currently on farm.'}
                </span>
              </div>
            </>
          )}

          {/* ── Hatchery-specific fields ───────────────────────────── */}
          {showHatcheryFields && (
            <>
              <SectionDivider label="Hatchery Details" />
              {isCombo(ft) && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#f0f7ff', borderRadius: 8, padding: '8px 12px', marginBottom: 'var(--sp-md)', fontSize: 12, color: '#1A4A6B' }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>This farm has both live birds and a hatchery. Fill in both sections below.</span>
                </div>
              )}
              <div className="form-row">
                <div className="form-field">
                  <label>Incubator capacity (eggs) <span className="required">*</span></label>
                  <input
                    type="number" min="0" placeholder="e.g. 5000"
                    value={form.incubator_capacity}
                    onChange={e => set('incubator_capacity', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Number of incubators</label>
                  <input
                    type="number" min="1" placeholder="e.g. 2"
                    value={form.incubators_count}
                    onChange={e => set('incubators_count', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Breeds/species hatched</label>
                <input
                  type="text" placeholder="e.g. Broilers, Layers, Guinea Fowl"
                  value={form.breeds_hatched}
                  onChange={e => set('breeds_hatched', e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Meat Processing-specific fields ───────────────────── */}
          {showProcessingFields && (
            <>
              <SectionDivider label="Processing Facility Details" />
              <div className="form-row">
                <div className="form-field">
                  <label>Daily processing capacity (birds) <span className="required">*</span></label>
                  <input
                    type="number" min="0" placeholder="e.g. 500"
                    value={form.daily_capacity}
                    onChange={e => set('daily_capacity', e.target.value)}
                  />
                </div>
                <div className="form-field">
                  <label>Cold storage capacity (units)</label>
                  <input
                    type="number" min="0" placeholder="e.g. 1000"
                    value={form.cold_storage_capacity}
                    onChange={e => set('cold_storage_capacity', e.target.value)}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Key processing equipment</label>
                <input
                  type="text" placeholder="e.g. Scalder, plucker, evisceration table, blast freezer"
                  value={form.processing_equipment}
                  onChange={e => set('processing_equipment', e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Location ──────────────────────────────────────────── */}
          <SectionDivider label="Location" />
          <div className="form-row">
            <div className="form-field">
              <label>Region <span className="required">*</span></label>
              <select value={form.region} onChange={e => set('region', e.target.value)}>
                <option value="">— Select region —</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label>District <span className="required">*</span></label>
              <input type="text" placeholder="e.g. Tamale Metro" value={form.district} onChange={e => set('district', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label>Community</label>
              <input type="text" placeholder="e.g. Lamashegu" value={form.community} onChange={e => set('community', e.target.value)} />
            </div>
            <div className="form-field">
              <label>GPS address</label>
              <input type="text" placeholder="e.g. NR-0234-5671" value={form.gps_address} onChange={e => set('gps_address', e.target.value)} />
            </div>
          </div>

          <div className="form-field">
            <label>Farm size (acres)</label>
            <input type="number" min="0" step="0.1" placeholder="e.g. 2.5" value={form.farm_size_acres} onChange={e => set('farm_size_acres', e.target.value)} />
          </div>

          {/* ── Utilities ──────────────────────────────────────────── */}
          <SectionDivider label="Utilities" />
          <div style={{ display: 'flex', gap: 'var(--sp-lg)', marginBottom: 'var(--sp-md)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={form.has_water_source} onChange={e => set('has_water_source', e.target.checked)} />
              Has water source
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
              <input type="checkbox" checked={form.has_electricity} onChange={e => set('has_electricity', e.target.checked)} />
              Has electricity
            </label>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-sm)', marginTop: 'var(--sp-md)' }}>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button disabled={saving || !isValid} onClick={handleSubmit}>
              {saving ? 'Registering…' : 'Register Farm'}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Farms table ─────────────────────────────────────────────────── */}
      <SectionTitle>All Registered Farms</SectionTitle>
      <Card>
        {farms.loading
          ? <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading farms…</p>
          : filtered.length === 0
          ? (
            <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>
              {allFarms.length === 0
                ? 'No farms registered yet. Use the "Register Farm" button above to add one.'
                : 'No farms match your search.'}
            </p>
          )
          : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Farm Name</th>
                  <th>Farmer</th>
                  <th>Location</th>
                  <th>Farm Type</th>
                  <th>Flock Size</th>
                  <th>Utilities</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(farm => (
                  <tr key={farm.id}>
                    <td><strong>{farm.name}</strong></td>
                    <td className="data-table__muted">{(farm as unknown as { owner_name?: string }).owner_name ?? '—'}</td>
                    <td>
                      {farm.district}, {farm.region}
                      {farm.community && <span className="data-table__muted"> · {farm.community}</span>}
                    </td>
                    <td>
                      <Badge variant={FLOCK_BADGE[farm.flock_type] ?? 'neutral'}>
                        {farm.flock_type.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td><strong>{farm.flock_size.toLocaleString()}</strong></td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {farm.has_water_source && <Badge variant="info">💧 Water</Badge>}
                        {farm.has_electricity  && <Badge variant="info">⚡ Power</Badge>}
                        {!farm.has_water_source && !farm.has_electricity && <span className="data-table__muted">—</span>}
                      </div>
                    </td>
                    <td>
                      <Badge variant={farm.is_active ? 'success' : 'neutral'}>
                        {farm.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </Card>
    </div>
  );
}
