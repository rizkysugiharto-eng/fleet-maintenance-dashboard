// Form input work order oleh User (planner/foreman).
// Data divalidasi dulu sebelum disimpan, supaya data yang salah tidak pernah masuk.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { COMPONENTS, DELAY_REASONS, PM_COMPONENT, STATUSES, WO_TYPES } from '../data/catalog.js';
import { normalizeWorkOrder, validateWorkOrder } from '../lib/validation.js';
import PageHeader from '../components/PageHeader.jsx';

const EMPTY_FORM = {
  unitCode: '',
  type: 'BM',
  status: 'In Progress',
  component: '',
  problem: '',
  start: '',
  end: '',
  delayReason: '',
  delayHours: '0',
  cost: '',
};

export default function InputWorkOrder() {
  const { data, unitByCode, addWorkOrder, openUnit, canWrite } = useData();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [savedId, setSavedId] = useState(null);

  const componentOptions = form.type === 'PM' ? [PM_COMPONENT] : Object.keys(COMPONENTS);
  const problemOptions = COMPONENTS[form.component] ?? [];

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === 'type') {
        next.component = value === 'PM' ? PM_COMPONENT : '';
        next.problem = '';
      }
      if (field === 'component') next.problem = '';
      // Mengisi waktu selesai berarti pekerjaan sudah selesai
      if (field === 'end') next.status = value ? 'Completed' : f.status === 'Completed' ? 'In Progress' : f.status;
      return next;
    });
    setSavedId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const wo = normalizeWorkOrder(form);
    const found = validateWorkOrder(wo, unitByCode);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSaving(true);
    try {
      setSavedId(await addWorkOrder(wo));
      setForm(EMPTY_FORM);
    } catch (e) {
      setErrors({ save: e.message });
    } finally {
      setSaving(false);
    }
  }

  function handleClear() {
    setForm(EMPTY_FORM);
    setErrors({});
  }

  const fieldError = (name) =>
    errors[name] && (
      <span className="field-error" id={`${name}-error`}>
        {errors[name]}
      </span>
    );
  const errorProps = (name) => (errors[name] ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` } : {});

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <PageHeader step={1} title="Input Work Order">
        Catat setiap pekerjaan maintenance. Kosongkan waktu selesai bila unit masih dikerjakan — WO otomatis masuk <b>backlog</b>.
      </PageHeader>

      {!canWrite && (
        <p className="alert alert-info">
          Anda melihat data database sebagai tamu. <Link to="/database">Login</Link> untuk menyimpan work order.
        </p>
      )}
      {errors.save && (
        <p className="alert" role="alert">
          {errors.save}
        </p>
      )}
      {savedId && (
        <p className="alert alert-good" role="status">
          ✓ {savedId} tersimpan. <Link to="/work-orders">Lihat laporan work order →</Link>
        </p>
      )}

      <form className="card form" onSubmit={handleSubmit} noValidate>
        <label>
          Unit
          <select value={form.unitCode} onChange={(e) => update('unitCode', e.target.value)} {...errorProps('unitCode')}>
            <option value="">— Pilih unit —</option>
            {data.units.map((u) => (
              <option key={u.code} value={u.code}>
                {u.code} · {u.type} · Site {u.siteId}
              </option>
            ))}
          </select>
          {fieldError('unitCode')}
          {form.unitCode && (
            <button type="button" className="link-button small" onClick={() => openUnit(form.unitCode)} style={{ alignSelf: 'flex-start' }}>
              Lihat riwayat unit ini
            </button>
          )}
        </label>

        <label>
          Jenis maintenance
          <select value={form.type} onChange={(e) => update('type', e.target.value)}>
            {Object.entries(WO_TYPES).map(([code, t]) => (
              <option key={code} value={code}>
                {code} — {t.label}
              </option>
            ))}
          </select>
          <span className="hint">{WO_TYPES[form.type].hint}</span>
        </label>

        <label>
          Komponen
          <select value={form.component} onChange={(e) => update('component', e.target.value)} {...errorProps('component')}>
            <option value="">— Pilih komponen —</option>
            {componentOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {fieldError('component')}
        </label>

        <label>
          Kerusakan / pekerjaan
          <input
            list="problem-options"
            value={form.problem}
            placeholder="Contoh: Hose bocor"
            onChange={(e) => update('problem', e.target.value)}
          />
          <datalist id="problem-options">
            {problemOptions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>

        <label>
          Waktu mulai (unit down)
          <input type="datetime-local" value={form.start} onChange={(e) => update('start', e.target.value)} {...errorProps('start')} />
          {fieldError('start')}
        </label>

        <label>
          Waktu selesai (unit ready)
          <input type="datetime-local" value={form.end} onChange={(e) => update('end', e.target.value)} {...errorProps('end')} />
          {fieldError('end')}
        </label>

        <label>
          Status
          <select value={form.status} onChange={(e) => update('status', e.target.value)} {...errorProps('status')}>
            {Object.entries(STATUSES).map(([s, info]) => (
              <option key={s} value={s}>
                {s} — {info.hint}
              </option>
            ))}
          </select>
          {fieldError('status')}
        </label>

        <label>
          Biaya (Rp)
          <input
            type="number"
            min="0"
            step="1000"
            inputMode="numeric"
            value={form.cost}
            placeholder="0"
            onChange={(e) => update('cost', e.target.value)}
            {...errorProps('cost')}
          />
          {fieldError('cost')}
        </label>

        <label>
          Alasan delay (bila ada)
          <select value={form.delayReason} onChange={(e) => update('delayReason', e.target.value)}>
            <option value="">Tidak ada delay</option>
            {DELAY_REASONS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>

        <label>
          Lama delay (jam)
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.delayHours}
            disabled={!form.delayReason}
            onChange={(e) => update('delayHours', e.target.value)}
            {...errorProps('delayHours')}
          />
          {fieldError('delayHours')}
        </label>

        <div className="form-actions span-2">
          <button type="submit" className="btn-primary" disabled={saving || !canWrite}>
            {saving ? 'Menyimpan…' : 'Simpan work order'}
          </button>
          <button type="button" className="btn-ghost" onClick={handleClear}>
            Kosongkan form
          </button>
        </div>
      </form>
    </div>
  );
}
