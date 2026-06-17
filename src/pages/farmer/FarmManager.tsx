import { useState } from 'react';
import { toArray } from '../../lib/api';
import { PageHeader, Card, Button, SectionTitle, Badge } from '../../components/ui';
import { useAsync } from '../../lib/hooks/useAsync';
import { farmsService } from '../../lib/services/farms';
import type { Farm, FarmActivityLog } from '../../types';
import './farmer.css';

// Which flock categories are relevant per farm type
const SHOWS_BROILERS       = new Set(['broilers', 'mixed', 'poultry_and_hatchery']);
const SHOWS_LAYERS         = new Set(['layers', 'mixed']);
const SHOWS_GUINEA_FOWL    = new Set(['guinea_fowl', 'mixed']);
const SHOWS_TURKEY         = new Set(['turkey', 'mixed']);
const SHOWS_DUCK           = new Set(['duck', 'mixed']);
const SHOWS_GEESE          = new Set(['geese', 'mixed']);
const SHOWS_OSTRICH        = new Set(['ostrich', 'mixed']);
const SHOWS_LOCAL_BIRDS    = new Set(['local_birds', 'mixed']);
const SHOWS_DAY_OLD_CHICKS = new Set(['day_old_chicks', 'mixed', 'hatchery', 'poultry_and_hatchery']);

// Farm category helpers
const isPoultryType    = (t: string) => ['broilers','layers','guinea_fowl','turkey','duck','geese','ostrich','local_birds','mixed','poultry_and_hatchery'].includes(t);
const isHatcheryType   = (t: string) => ['day_old_chicks','hatchery','poultry_and_hatchery'].includes(t);
const isProcessingType = (t: string) => t === 'meat_processing';

export default function FarmManager() {
  const farms = useAsync(() => farmsService.list(), []);
  const [selectedFarm, setSelectedFarm] = useState('');

  const farmId = selectedFarm || (toArray<Farm>(farms.data)[0]?.id ?? '');
  const logs = useAsync(
    () => farmId ? farmsService.listLogs(farmId) : Promise.resolve(null),
    [farmId],
  );

  const [date,             setDate]           = useState(new Date().toISOString().split('T')[0]);
  // Poultry flock counts
  const [broilerCount,     setBroilerCount]     = useState('');
  const [layerCount,       setLayerCount]       = useState('');
  const [guineaFowlCount,  setGuineaFowlCount]  = useState('');
  const [turkeyCount,      setTurkeyCount]      = useState('');
  const [duckCount,        setDuckCount]        = useState('');
  const [geeseCount,       setGeeseCount]       = useState('');
  const [ostrichCount,     setOstrichCount]     = useState('');
  const [localCockCount,   setLocalCockCount]   = useState('');
  const [localHenCount,    setLocalHenCount]    = useState('');
  const [dayOldChickCount, setDayOldChickCount] = useState('');
  // Common
  const [mortality,  setMortality]  = useState('0');
  const [feedKg,     setFeedKg]     = useState('');
  const [eggs,       setEggs]       = useState('0');
  const [meds,       setMeds]       = useState('');
  const [notes,      setNotes]      = useState('');
  // Hatchery-specific
  const [eggsInIncubation, setEggsInIncubation] = useState('');
  const [eggsSetToday,     setEggsSetToday]     = useState('');
  const [chicksHatched,    setChicksHatched]    = useState('');
  const [hatchRejects,     setHatchRejects]     = useState('');
  const [chicksSold,       setChicksSold]       = useState('');
  // Meat processing-specific
  const [birdsReceived,       setBirdsReceived]       = useState('');
  const [birdsProcessed,      setBirdsProcessed]      = useState('');
  const [carcassWeightKg,     setCarcassWeightKg]     = useState('');
  const [unitsPackaged,       setUnitsPackaged]       = useState('');
  const [coldStorageUnits,    setColdStorageUnits]    = useState('');

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');

  const farmList   = toArray<Farm>(farms.data);
  const activeFarm = farmList.find(f => f.id === farmId);
  const ft         = activeFarm?.flock_type ?? 'mixed';

  const showPoultrySection   = isPoultryType(ft);
  const showHatcherySection  = isHatcheryType(ft);
  const showProcessingSection = isProcessingType(ft);

  const showBroilers      = SHOWS_BROILERS.has(ft);
  const showLayers        = SHOWS_LAYERS.has(ft);
  const showGuineaFowl    = SHOWS_GUINEA_FOWL.has(ft);
  const showTurkey        = SHOWS_TURKEY.has(ft);
  const showDuck          = SHOWS_DUCK.has(ft);
  const showGeese         = SHOWS_GEESE.has(ft);
  const showOstrich       = SHOWS_OSTRICH.has(ft);
  const showLocalBirds    = SHOWS_LOCAL_BIRDS.has(ft);
  const showDayOldChicks  = SHOWS_DAY_OLD_CHICKS.has(ft);

  const hasAnyPoultryCount = (showBroilers     && !!broilerCount)
    || (showLayers        && !!layerCount)
    || (showGuineaFowl    && !!guineaFowlCount)
    || (showTurkey        && !!turkeyCount)
    || (showDuck          && !!duckCount)
    || (showGeese         && !!geeseCount)
    || (showOstrich       && !!ostrichCount)
    || (showLocalBirds    && (!!localCockCount || !!localHenCount))
    || (showDayOldChicks  && !!dayOldChickCount);

  const hasAnyHatcheryEntry = !!eggsInIncubation || !!eggsSetToday || !!chicksHatched;
  const hasAnyProcessingEntry = !!birdsReceived || !!birdsProcessed;

  // At least one relevant entry is required
  const canSave = (showPoultrySection && hasAnyPoultryCount)
    || (showHatcherySection  && hasAnyHatcheryEntry)
    || (showProcessingSection && hasAnyProcessingEntry);

  const handleLog = async () => {
    if (!farmId || !canSave) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await farmsService.createLog(farmId, {
        date,
        // Poultry counts
        broiler_count:       showBroilers     ? (parseInt(broilerCount)     || 0) : 0,
        layer_count:         showLayers       ? (parseInt(layerCount)       || 0) : 0,
        guinea_fowl_count:   showGuineaFowl   ? (parseInt(guineaFowlCount)  || 0) : 0,
        turkey_count:        showTurkey       ? (parseInt(turkeyCount)      || 0) : 0,
        duck_count:          showDuck         ? (parseInt(duckCount)        || 0) : 0,
        geese_count:         showGeese        ? (parseInt(geeseCount)       || 0) : 0,
        ostrich_count:       showOstrich      ? (parseInt(ostrichCount)     || 0) : 0,
        local_cock_count:    showLocalBirds   ? (parseInt(localCockCount)   || 0) : 0,
        local_hen_count:     showLocalBirds   ? (parseInt(localHenCount)    || 0) : 0,
        day_old_chick_count: showDayOldChicks ? (parseInt(dayOldChickCount) || 0) : 0,
        // Common
        mortality:           parseInt(mortality),
        feed_kg:             feedKg,
        eggs_collected:      parseInt(eggs),
        medication_given:    meds,
        notes,
        // Hatchery
        eggs_in_incubation:  showHatcherySection  ? (parseInt(eggsInIncubation) || 0) : 0,
        eggs_set_today:      showHatcherySection  ? (parseInt(eggsSetToday)     || 0) : 0,
        chicks_hatched:      showHatcherySection  ? (parseInt(chicksHatched)    || 0) : 0,
        hatch_rejects:       showHatcherySection  ? (parseInt(hatchRejects)     || 0) : 0,
        chicks_sold:         showHatcherySection  ? (parseInt(chicksSold)       || 0) : 0,
        // Meat processing
        birds_received:      showProcessingSection ? (parseInt(birdsReceived)       || 0) : 0,
        birds_processed:     showProcessingSection ? (parseInt(birdsProcessed)      || 0) : 0,
        carcass_weight_kg:   showProcessingSection ? (parseFloat(carcassWeightKg)   || 0) : 0,
        units_packaged:      showProcessingSection ? (parseInt(unitsPackaged)       || 0) : 0,
        cold_storage_units:  showProcessingSection ? (parseInt(coldStorageUnits)    || 0) : 0,
      });
      setSuccess('Activity logged successfully!');
      setBroilerCount(''); setLayerCount(''); setGuineaFowlCount('');
      setTurkeyCount(''); setDuckCount(''); setGeeseCount('');
      setOstrichCount(''); setLocalCockCount(''); setLocalHenCount(''); setDayOldChickCount('');
      setMortality('0'); setFeedKg(''); setEggs('0'); setMeds(''); setNotes('');
      setEggsInIncubation(''); setEggsSetToday(''); setChicksHatched(''); setHatchRejects(''); setChicksSold('');
      setBirdsReceived(''); setBirdsProcessed(''); setCarcassWeightKg(''); setUnitsPackaged(''); setColdStorageUnits('');
      logs.refetch();
    } catch {
      setError('Failed to save log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const SectionDivider = ({ label }: { label: string }) => (
    <div style={{ borderTop: '1px solid var(--col-border)', paddingTop: 'var(--sp-md)', marginTop: 'var(--sp-sm)', marginBottom: 'var(--sp-sm)' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--col-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
        {label}
      </p>
    </div>
  );

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

              {/* ── Poultry flock counts ──────────────────────────────────── */}
              {showPoultrySection && (
                <>
                  <SectionDivider label="Flock Count" />
                  <div className="form-row" style={{ marginBottom: 0 }}>
                    {showBroilers && (
                      <div className="form-field">
                        <label>Broilers <span className="required">*</span></label>
                        <input type="number" min="0" placeholder="0" value={broilerCount} onChange={e => setBroilerCount(e.target.value)} />
                      </div>
                    )}
                    {showLayers && (
                      <div className="form-field">
                        <label>Layers <span className="required">*</span></label>
                        <input type="number" min="0" placeholder="0" value={layerCount} onChange={e => setLayerCount(e.target.value)} />
                      </div>
                    )}
                    {showGuineaFowl && (
                      <div className="form-field">
                        <label>Guinea Fowl <span className="required">*</span></label>
                        <input type="number" min="0" placeholder="0" value={guineaFowlCount} onChange={e => setGuineaFowlCount(e.target.value)} />
                      </div>
                    )}
                    {showTurkey && (
                      <div className="form-field">
                        <label>Turkey <span className="required">*</span></label>
                        <input type="number" min="0" placeholder="0" value={turkeyCount} onChange={e => setTurkeyCount(e.target.value)} />
                      </div>
                    )}
                    {showDuck && (
                      <div className="form-field">
                        <label>Duck <span className="required">*</span></label>
                        <input type="number" min="0" placeholder="0" value={duckCount} onChange={e => setDuckCount(e.target.value)} />
                      </div>
                    )}
                    {showGeese && (
                      <div className="form-field">
                        <label>Geese <span className="required">*</span></label>
                        <input type="number" min="0" placeholder="0" value={geeseCount} onChange={e => setGeeseCount(e.target.value)} />
                      </div>
                    )}
                    {showOstrich && (
                      <div className="form-field">
                        <label>Ostrich <span className="required">*</span></label>
                        <input type="number" min="0" placeholder="0" value={ostrichCount} onChange={e => setOstrichCount(e.target.value)} />
                      </div>
                    )}
                    {showLocalBirds && (
                      <div className="form-field">
                        <label>Local Cocks <span className="required">*</span></label>
                        <input type="number" min="0" placeholder="0" value={localCockCount} onChange={e => setLocalCockCount(e.target.value)} />
                      </div>
                    )}
                    {showLocalBirds && (
                      <div className="form-field">
                        <label>Local Hens <span className="required">*</span></label>
                        <input type="number" min="0" placeholder="0" value={localHenCount} onChange={e => setLocalHenCount(e.target.value)} />
                      </div>
                    )}
                    {showDayOldChicks && (
                      <div className="form-field">
                        <label>Day-Old Chicks</label>
                        <input type="number" min="0" placeholder="0" value={dayOldChickCount} onChange={e => setDayOldChickCount(e.target.value)} />
                      </div>
                    )}
                  </div>
                  {/* Running total */}
                  <div style={{ fontSize: 12, color: 'var(--col-muted)', marginTop: 4, marginBottom: 'var(--sp-sm)' }}>
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
                        (parseInt(localCockCount)   || 0) +
                        (parseInt(localHenCount)    || 0) +
                        (parseInt(dayOldChickCount) || 0)
                      ).toLocaleString()}
                    </strong>{' '}birds
                  </div>

                  <div className="form-field">
                    <label>Mortality</label>
                    <input type="number" min="0" placeholder="0" value={mortality} onChange={e => setMortality(e.target.value)} />
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
                </>
              )}

              {/* ── Hatchery section ──────────────────────────────────────── */}
              {showHatcherySection && (
                <>
                  <SectionDivider label="Hatchery Activity" />
                  <div className="form-row">
                    <div className="form-field">
                      <label>Eggs in incubation</label>
                      <input type="number" min="0" placeholder="0" value={eggsInIncubation} onChange={e => setEggsInIncubation(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Eggs set today</label>
                      <input type="number" min="0" placeholder="0" value={eggsSetToday} onChange={e => setEggsSetToday(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Chicks hatched</label>
                      <input type="number" min="0" placeholder="0" value={chicksHatched} onChange={e => setChicksHatched(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Hatch rejects</label>
                      <input type="number" min="0" placeholder="0" value={hatchRejects} onChange={e => setHatchRejects(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Chicks sold/dispatched</label>
                      <input type="number" min="0" placeholder="0" value={chicksSold} onChange={e => setChicksSold(e.target.value)} />
                    </div>
                  </div>
                  {/* Hatch rate hint */}
                  {parseInt(eggsInIncubation) > 0 && parseInt(chicksHatched) > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--col-muted)', marginBottom: 'var(--sp-sm)' }}>
                      Hatch rate: <strong>{((parseInt(chicksHatched) / parseInt(eggsInIncubation)) * 100).toFixed(1)}%</strong>
                    </div>
                  )}
                </>
              )}

              {/* ── Meat processing section ───────────────────────────────── */}
              {showProcessingSection && (
                <>
                  <SectionDivider label="Processing Activity" />
                  <div className="form-row">
                    <div className="form-field">
                      <label>Birds received</label>
                      <input type="number" min="0" placeholder="0" value={birdsReceived} onChange={e => setBirdsReceived(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Birds processed</label>
                      <input type="number" min="0" placeholder="0" value={birdsProcessed} onChange={e => setBirdsProcessed(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-field">
                      <label>Carcass weight (kg)</label>
                      <input type="number" min="0" step="0.1" placeholder="0.0" value={carcassWeightKg} onChange={e => setCarcassWeightKg(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Units packaged</label>
                      <input type="number" min="0" placeholder="0" value={unitsPackaged} onChange={e => setUnitsPackaged(e.target.value)} />
                    </div>
                    <div className="form-field">
                      <label>Units to cold storage</label>
                      <input type="number" min="0" placeholder="0" value={coldStorageUnits} onChange={e => setColdStorageUnits(e.target.value)} />
                    </div>
                  </div>
                  <div className="form-field">
                    <label>Mortality (birds lost in handling)</label>
                    <input type="number" min="0" placeholder="0" value={mortality} onChange={e => setMortality(e.target.value)} />
                  </div>
                </>
              )}

              {/* ── Common fields ─────────────────────────────────────────── */}
              <div className="form-field" style={{ marginTop: 'var(--sp-sm)' }}>
                <label>Medication / treatments given</label>
                <input type="text" placeholder="e.g. Newcastle vaccine — 0.5ml per bird" value={meds} onChange={e => setMeds(e.target.value)} />
              </div>
              <div className="form-field">
                <label>Additional notes</label>
                <textarea rows={3} placeholder="Anything else to note about today's activity…" value={notes} onChange={e => setNotes(e.target.value)} />
              </div>

              <Button disabled={!canSave || saving} onClick={handleLog} style={{ width: '100%', marginTop: 'var(--sp-sm)' }}>
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
              ) : toArray<FarmActivityLog>(logs.data).length === 0 ? (
                <p style={{ padding: 'var(--sp-md)', color: 'var(--col-muted)' }}>No logs yet. Start logging daily activity above.</p>
              ) : showProcessingSection ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Received</th>
                      <th>Processed</th>
                      <th>Carcass (kg)</th>
                      <th>Packaged</th>
                      <th>Cold Storage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toArray<FarmActivityLog>(logs.data).slice(0, 14).map(log => (
                      <tr key={log.id}>
                        <td className="data-table__mono">{new Date(log.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}</td>
                        <td>{(log as any).birds_received ?? 0}</td>
                        <td>{(log as any).birds_processed ?? 0}</td>
                        <td>{(log as any).carcass_weight_kg ?? '—'}</td>
                        <td>{(log as any).units_packaged ?? 0}</td>
                        <td>{(log as any).cold_storage_units ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : showHatcherySection && !showPoultrySection ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>In Incubator</th>
                      <th>Set Today</th>
                      <th>Hatched</th>
                      <th>Rejects</th>
                      <th>Sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toArray<FarmActivityLog>(logs.data).slice(0, 14).map(log => (
                      <tr key={log.id}>
                        <td className="data-table__mono">{new Date(log.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}</td>
                        <td>{(log as any).eggs_in_incubation ?? 0}</td>
                        <td>{(log as any).eggs_set_today ?? 0}</td>
                        <td><strong>{(log as any).chicks_hatched ?? 0}</strong></td>
                        <td style={{ color: (log as any).hatch_rejects > 0 ? 'var(--col-danger)' : 'inherit' }}>{(log as any).hatch_rejects ?? 0}</td>
                        <td>{(log as any).chicks_sold ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                      {showLocalBirds   && <th>Cocks</th>}
                      {showLocalBirds   && <th>Hens</th>}
                      {showDayOldChicks && <th>DOC</th>}
                      <th>Total</th>
                      <th>Mortality</th>
                      <th>Feed (kg)</th>
                      {showLayers && <th>Eggs</th>}
                      {showHatcherySection && <th>Hatched</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {toArray<FarmActivityLog>(logs.data).slice(0, 14).map(log => (
                      <tr key={log.id}>
                        <td className="data-table__mono">
                          {new Date(log.date).toLocaleDateString('en-GH', { day: 'numeric', month: 'short' })}
                        </td>
                        {showBroilers     && <td>{(log.broiler_count ?? 0).toLocaleString()}</td>}
                        {showLayers       && <td>{(log.layer_count ?? 0).toLocaleString()}</td>}
                        {showGuineaFowl   && <td>{(log.guinea_fowl_count ?? 0).toLocaleString()}</td>}
                        {showTurkey       && <td>{(log.turkey_count ?? 0).toLocaleString()}</td>}
                        {showDuck         && <td>{(log.duck_count ?? 0).toLocaleString()}</td>}
                        {showGeese        && <td>{(log.geese_count ?? 0).toLocaleString()}</td>}
                        {showOstrich      && <td>{(log.ostrich_count ?? 0).toLocaleString()}</td>}
                        {showLocalBirds   && <td>{(log.local_cock_count ?? 0).toLocaleString()}</td>}
                        {showLocalBirds   && <td>{(log.local_hen_count ?? 0).toLocaleString()}</td>}
                        {showDayOldChicks && <td>{(log.day_old_chick_count ?? 0).toLocaleString()}</td>}
                        <td><strong>{log.flock_count.toLocaleString()}</strong></td>
                        <td>
                          <span style={{ color: log.mortality > 0 ? 'var(--col-danger)' : 'inherit' }}>
                            {log.mortality}
                          </span>
                        </td>
                        <td>{log.feed_kg ?? '—'}</td>
                        {showLayers && <td>{log.eggs_collected}</td>}
                        {showHatcherySection && <td>{(log as any).chicks_hatched ?? 0}</td>}
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
                    <span>Farm type</span>
                    <strong style={{ textTransform: 'capitalize' }}>
                      {activeFarm.flock_type.replace(/_/g, ' ')}
                    </strong>
                  </div>
                  {showPoultrySection && (
                    <div className="repayment-row"><span>Current flock size</span><strong>{activeFarm.flock_size.toLocaleString()}</strong></div>
                  )}
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
