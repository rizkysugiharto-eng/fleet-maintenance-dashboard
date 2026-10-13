// Form input work order oleh User (planner/foreman).
// Data divalidasi dulu sebelum disimpan — mirip langkah cleaning di Power Query,
// tapi dilakukan di awal supaya data yang salah tidak pernah masuk.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { COMPONENTS, PM_COMPONENT, WO_TYPES } from '../data/dummy.js';
import { parseTime } from '../lib/kpi.js';

const EMPTY_FORM = {
  unitCode: '',
  type: 'BM',
  component: '',
  description: '',
  start: '',
  end: '',
  cost: '',
};

function validate(form) {
  const errors = {};
  if (!form.unitCode) errors.unitCode = 'Pilih unit.';
  if (!form.component) errors.component = 'Pilih komponen.';
  if (form.description.trim().length < 5) errors.description = 'Deskripsi minimal 5 karakter.';
  if (!form.start) errors.start = 'Isi waktu mulai.';
  if (form.start && form.end && parseTime(form.end) <= parseTime(form.start)) {
    errors.end = 'Waktu selesai harus setelah waktu mulai.';
  }
  if (form.cost === '' || Number(form.cost) < 0) errors.cost = 'Isi biaya (0 atau lebih).';
  return errors;
}

export default function InputWorkOrder() {
  const { units, addWorkOrder } = useData();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [savedId, setSavedId] = useState(null);

  const componentOptions = form.type === 'PM' ? [PM_COMPONENT] : COMPONENTS;

  function update(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Ganti tipe → reset komponen bila tidak cocok lagi
      if (field === 'type') next.component = value === 'PM' ? PM_COMPONENT : '';
      return next;
    });
    setSavedId(null);
  }

  function handleSubmit(event) {
    event.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const id = addWorkOrder({
      unitCode: form.unitCode,
      type: form.type,
      component: form.component,
      description: form.description.trim(),
      start: form.start,
      end: form.end || null,
      cost: Number(form.cost),
    });
    setSavedId(id);
    setForm(EMPTY_FORM);
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
    <div className="page">
      <div className="page-title">
        <h1>Input work order</h1>
        <p className="muted">
          Kosongkan waktu selesai bila pekerjaan belum selesai — WO akan tercatat sebagai <b>Open</b> (backlog).
        </p>
      </div>

      {savedId && (
        <p className="alert alert-good" role="status">
          ✓ {savedId} tersimpan. <Link to="/work-orders">Lihat data work order →</Link>
        </p>
      )}

      <form className="card form" onSubmit={handleSubmit} noValidate>
        <label>
          Unit
          <select value={form.unitCode} onChange={(e) => update('unitCode', e.target.value)} {...errorProps('unitCode')}>
            <option value="">— Pilih unit —</option>
            {units.map((u) => (
              <option key={u.code} value={u.code}>
                {u.code} · {u.brand} {u.model}
              </option>
            ))}
          </select>
          {fieldError('unitCode')}
        </label>

        <label>
          Tipe maintenance
          <select value={form.type} onChange={(e) => update('type', e.target.value)}>
            {Object.entries(WO_TYPES).map(([code, name]) => (
              <option key={code} value={code}>
                {code} — {name}
              </option>
            ))}
          </select>
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

        <label className="span-2">
          Deskripsi pekerjaan
          <input
            type="text"
            value={form.description}
            placeholder="Contoh: Ganti hose hydraulic boom bocor"
            onChange={(e) => update('description', e.target.value)}
            {...errorProps('description')}
          />
          {fieldError('description')}
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

        <div className="form-actions span-2">
          <button type="submit" className="btn-primary">
            Simpan work order
          </button>
          <button type="button" className="btn-ghost" onClick={handleClear}>
            Kosongkan form
          </button>
        </div>
      </form>
    </div>
  );
}
