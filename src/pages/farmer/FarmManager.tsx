import { useState } from 'react';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Button, SectionTitle, Badge } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import './farmer.css';

// Which flock categories are relevant per farm type
const SHOWS_BROILERS       = new Set(['broilers', 'mixed', 'hatchery', 'poultry_and_hatchery']);
const SHOWS_LAYERS         = new Set(['layers', 'mixed']);
const SHOWS_GUINEA_FOWL    = new Set(['guinea_fowl', 'mixed']);
const SHOWS_TURKEY         = new Set(['turkey', 'mixed']);
const SHOWS_DUCK           = new Set(['duck', 'mixed']);
const SHOWS_GEESE          = new Set(['geese', 'mixed']);
const SHOWS_OSTRICH        = new Set(['ostrich', 'mixed']);
const SHOWS_DAY_OLD_CHICKS = new Set(['day_old_chicks', 'mixed', 'hatchery', 'poultry_and_hatchery']);

export default function FarmManager() {
  const farms = useAsync(() => farmsService.list(), []);
  const [selectedFarm, setSelectedFarm] = useState('');

  const farmId = selectedFarm || (toArray(farms.data)[0]?.id ?? '');
  const logs = useAsync(
    () => farmId ? farmsService.listLogs(farmId) : Promise.resolve(null),
    [farmId],
  );

  const [date,             setDate]           = useState(new Date().toISOString().split('T')[0]);
  const [broilerCount,     setBroilerCount]     = useState('');
  const [layerCount,       setLayerCount]       = useState('');
  const [guineaFowlCount,  setGuineaFowlCount]  = useState('');
  const [turkeyCount,      setTurkeyCount]      = useState('');
  const [duckCount,        setDuckCount]        = useState('');
  const [geeseCount,       setGeeseCount]       = useState('');
  const [ostrichCount,     setOstrichCount]     = useState('');
  const [dayOldChickCount, setDayOldChickCount] = useState('');
  const [mortality,        setMortality]      = useState('0');
  const [feedKg,           setFeedKg]         = useState('');
  const [eggs,             setEggs]           = useState('0');
  const [meds,             setMeds]           = useState('');
  const [notes,            setNotes]          = useState('');
  const [saving,           setSaving]         = useState(false);
  const [error,            setError]          = useState('');
  const [success,          setSuccess]        = useState('');

  const farmList   = toArray(farms.data);
  const activeFarm = farmList.find(f => f.id === farmId);
  const ft         = activeFarm?.flock_type ?? 'mixed';

  const showBroilers      = SHOWS_BROILERS.has(ft);
  const showLayers        = SHOWS_LAYERS.has(ft);
  const showGuineaFowl    = SHOWS_GUINEA_FOWL.has(ft);
  const showTurkey        = SHOWS_TURKEY.has(ft);
  const showDuck          = SHOWS_DUCK.has(ft);
  const showGeese         = SHOWS_GEESE.has(ft);
  const showOstrich       = SHOWS_OSTRICH.has(ft);
  const showDayOldChicks  = SHOWS_DAY_OLD_CHICKS.has(ft);

  // At least one flock count field must be filled
  const hasAnyCount = (showBroilers     && !!broilerCount)
    || (showLayers        && !!layerCount)
    || (showGuineaFowl    && !!guineaFowlCount)
    || (showTurkey        && !!turkeyCount)
    || (showDuck          && !!duckCount)
    || (showGeese         && !!geeseCount)
    || (showOstrich       && !!ostrichCount)
    || (showDayOldChicks  && !!dayOldChickCount);

  const handleLog = async () => {
    if (!farmId || !hasAnyCount) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await farmsService.createLog(farmId, {
        date,
        broiler_count:       showBroilers     ? (parseInt(broilerCount)     || 0) : 0,
        layer_count:         showLayers       ? (parseInt(layerCount)       || 0) : 0,
        guinea_fowl_count:   showGuineaFowl   ? (parseInt(guineaFowlCount)  || 0) : 0,
        turkey_count:        showTurkey       ? (parseInt(turkeyCount)      || 0) : 0,
        duck_count:          showDuck         ? (parseInt(duckCount)        || 0) : 0,
        geese_count:         showGeese        ? (parseInt(geeseCount)       || 0) : 0,
        ostrich_count:       showOstrich      ? (parseInt(ostrichCount)     || 0) : 0,
        day_old_chick_count: showDayOldChicks ? (parseInt(dayOldChickCount) || 0) : 0,
        mortality:   parseInt(mortality),
        feed_kg:     feedKg,
        eggs_collected: parseInt(eggs),
        medication_given: meds,
        notes,
      });
      setSuccess('Activity logged successfully!');
      setBroilerCount(''); setLayerCount(''); setGuineaFowlCount('');
      setTurkeyCount(''); setDuckCount(''); setGeeseCount('');
      setOstrichCount(''); setDayOldChickCount('');
      setMortality('0'); setFeedKg(''); setEggs('0'); setMeds(''); setNotes('');
      logs.refetch();
    } catch {
      setError('Failed to save log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Farm Manager" subtitle="Log daily farm activity — flock count, feed, mortality, and more." />

      {farmList.length > 1 && (
        <div className="form-field" style={{ maxWidth: 320, marginBottom: 'var(--sp-lg)' }}>
          <label>Select farm</label>
          <select value={selectedFarm} onChange={e => setSelectedFarm(e.target.value)}>
            {farmList.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
      )}

      {farms.loading ? (
        <p style={{ color: 'var(--col-muted)' }}>Loading farms…</p>
      ) : farmList.length === 0 ? (
        <Card><p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>You have no registered farms yet. Please contact FarmAsyst North to register your farm.</p></Card>
      ) : (
        <div className="farmer-grid-main">

          {/* ── Log form ──────────────────────────────────────────────────── */}
          <div>
            <SectionTitle>Log Today's Activity — {activeFarm?.name}</SectionTitle>
            <Card>
              {error   && <p className="form-error">{error}</p>}
              {success && <p className="form-success">{success}</p>}

              <div className="form-field">
                <label>Date</label>
                <input type="date" value={date} max={new Date().toISOString().split('T')[0]} onChange={e => setDate(e.target.value)} />
              </div>

              {/* ── Flock count (split by category) ───────────────────── */}
              <div style={{ marginBottom: 'var(--sp-sm)' }}>
                <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Flock count <span className="required">*</span>
                </label>
                <div className="form-row" style={{ marginBottom: 0 }}>
                  {showBroilers && (
                    <div className="form-field">
                      <label>Broilers</label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={broilerCount}
                        onChange={e => setBroilerCount(e.target.value)}
                      />
                    </div>
                  )}
                  {showLayers && (
                    <div className="form-field">
                      <label>Layers</label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={layerCount}
                        onChange={e => setLayerCount(e.target.value)}
                      />
                    </div>
                  )}
                  {showGuineaFowl && (
                    <div className="form-field">
                      <label>Guinea Fowl</label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={guineaFowlCount}
                        onChange={e => setGuineaFowlCount(e.target.value)}
                      />
                    </div>
                  )}
                  {showTurkey && (
                    <div className="form-field">
                      <label>Turkey</label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={turkeyCount}
                        onChange={e => setTurkeyCount(e.target.value)}
                      />
                    </div>
                  )}
                  {showDuck && (
                    <div className="form-field">
                      <label>Duck</label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={duckCount}
                        onChange={e => setDuckCount(e.target.value)}
                      />
                    </div>
                  )}
                  {showGeese && (
                    <div className="form-field">
                      <label>Geese</label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={geeseCount}
                        onChange={e => setGeeseCount(e.target.value)}
                      />
                    </div>
                  )}
                  {showOstrich && (
                    <div className="form-field">
                      <label>Ostrich</label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={ostrichCount}
                        onChange={e => setOstrichCount(e.target.value)}
                      />
                    </div>
                  )}
                  {showDayOldChicks && (
                    <div className="form-field">
                      <label>Day-Old Chicks</label>
                      <input
                        type="number" min="0" placeholder="0"
                        value={dayOldChickCount}
                        onChange={e => setDayOldChickCount(e.target.value)}
                      />
                    </div>
                  )}
                </div>
                {/* Running total */}
                {(showBroilers || showLayers || showGuineaFowl || showTurkey || showDuck || showGeese || showOstrich || showDayOldChicks) && (
                  <div style={{ fontSize: 12, color: 'var(--col-muted)', marginTop: 4 }}>
                    Total:{' '}
                    <strong>
                      {(
                        (parseInt(broilerCount)     || 0) +
                        (parseInt(layerCount)       || 0) +
                        (parseInt(guineaFowlCount)  || 0) +
                        (parseInt(turkeyCount)      || 0) +
                        (parseInt(duckCount)        || 0) +
                        (parseInt(geeseCount)       || 0) +
                        (parseInt(ostrichCount)     || 0) +
                        (parseInt(dayOldChickCount) || 0)
                      ).toLocaleString()}
                    </strong>{' '}birds
                  </div>
                )}
              </div>

              {/* ── Mortality ──────────────────────────────────────────── */}
              <div className="form-field">
                <label>Mortality</label>
                <input
                  type="number" min="0" placeholder="0"
                  value={mortality}
                  onChange={e => setMortality(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Feed consumed (kg)</label>
                  <input type="number" min="0" step="0.1" placeholder="e.g. 25.5" value={feedKg} onChange={e => setFeedKg(e.target.value)} />
                </div>
                {showLayers && (
                  <div className="form-field">
                    <label>Eggs collected</label>
                    <input type="number" min="0" placeholder="0" value={eggs} onChange={e => setEggs(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="form-field">
                <label>Medication given</label>
                <input type="text" placeholder="e.g. Newcastle vaccine — 0.5ml per bird" value={meds} onChange={e => setMeds(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Additional notes</label>
                <textarea rows={3} placeholder="Anything else to note about today's activity…" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <Button disabled={!hasAnyCount || saving} onClick={handleLog} style={{ width: '100%', marginTop: 'var(--sp-sm)' }}>
                {saving ? 'Saving…' : 'Save Activity Log'}
              </Button>
            </Card>
          </div>

          {/* ── Recent logs ───────────────────────────────────────────────── */}
          <div>
            <SectionTitle>Recent Activity Logs</SectionTitle>
            <Card>
              {logs.loading ? (
                <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>Loading logs…</p>
              ) : toArray(logs.data).length === 0 ? (
                <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No logs yet. Start logging daily activity above.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {showBroilers     && <th>Broilers</th>}
                      {showLayers       && <th>Layers</th>}
                      {showGuineaFowl   && <th>G. Fowl</th>}
                      {showTurkey       && <th>Turkey</th>}
                      {showDuck         && <th>Duck</th>}
                      {showGeese        && <th>Geese</th>}
                      {showOstrich      && <th>Ostrich</th>}
                      {showDayOldChicks && <th>DOC</th>}
                      <th>Total</th>
                      <th>Mortality</th>
                      <th>Feed (kg)</th>
                      {showLayers && <th>Eggs</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {toArray(logs.data).slice(0, 14).map(log => (
                      <tr key={log.id}>
                        <td className="data-table__mono">
                          {new Date(log.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                        </td>
                        {showBroilers     && <td>{log.broiler_count.toLocaleString()}</td>}
                        {showLayers       && <td>{log.layer_count.toLocaleString()}</td>}
                        {showGuineaFowl   && <td>{log.guinea_fowl_count.toLocaleString()}</td>}
                        {showTurkey       && <td>{log.turkey_count.toLocaleString()}</td>}
                        {showDuck         && <td>{log.duck_count.toLocaleString()}</td>}
                        {showGeese        && <td>{log.geese_count.toLocaleString()}</td>}
                        {showOstrich      && <td>{log.ostrich_count.toLocaleString()}</td>}
                        {showDayOldChicks && <td>{log.day_old_chick_count.toLocaleString()}</td>}
                        <td><strong>{log.flock_count.toLocaleString()}</strong></td>
                        <td>
                          <span style={{ color: log.mortality > 0 ? 'var(--col-danger)' : 'inherit' }}>
                            {log.mortality}
                          </span>
                        </td>
                        <td>{log.feed_kg ?? '—'}</td>
                        {showLayers && <td>{log.eggs_collected}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {activeFarm && (
              <>
                <SectionTitle style={{ marginTop: 'var(--sp-lg)' }}>Farm Overview</SectionTitle>
                <Card>
                  <div className="repayment-row"><span>Farm name</span><strong>{activeFarm.name}</strong></div>
                  <div className="repayment-row"><span>Location</span><strong>{activeFarm.district}, {activeFarm.region}</strong></div>
                  <div className="repayment-row">
                    <span>Flock type</span>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {activeFarm.flock_type.replace('_', ' ')}
                    </strong>
                  </div>
                  <div className="repayment-row"><span>Current flock size</span><strong>{activeFarm.flock_size.toLocaleString()}</strong></div>
                  <div className="repayment-row">
                    <span>Status</span>
                    <Badge variant={activeFarm.is_active ? 'success' : 'neutral'}>
                      {activeFarm.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
