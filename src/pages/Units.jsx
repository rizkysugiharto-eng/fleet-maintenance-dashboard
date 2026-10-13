// Halaman khusus Admin: kelola master data unit & reset data demo.

import { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { SITES, UNIT_TYPES } from '../data/catalog.js';
import { formatNumber } from '../lib/format.js';

const EMPTY_UNIT = { code: '', siteId: 'B', type: UNIT_TYPES[0], brand: '', model: '', pmInterval: '250', ewh: '15' };

export default function Units() {
  const { prefs, units, data, addUnit, resetDemo, openUnit } = useData();
  const [form, setForm] = useState(EMPTY_UNIT);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (prefs.role !== 'admin') {
    return (
      <div className="page">
        <h1>Master Unit</h1>
        <p className="alert">Halaman ini hanya untuk Admin. Ganti peran di header (Peran: Admin).</p>
      </div>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z]{2,4}-\d{3}$/.test(code)) return setError('Kode unit berformat huruf-angka, contoh DT-209 atau EXC-105.');
    if (data.units.some((u) => u.code === code)) return setError(`Kode ${code} sudah dipakai.`);
    if (!form.brand.trim() || !form.model.trim()) return setError('Isi merek dan model.');
    if (!(Number(form.pmInterval) > 0) || !(Number(form.ewh) > 0 && Number(form.ewh) <= 24)) return setError('Interval PM > 0 dan EWH antara 0–24 jam.');

    addUnit({ code, siteId: form.siteId, type: form.type, brand: form.brand.trim(), model: form.model.trim(), pmInterval: Number(form.pmInterval), ewh: Number(form.ewh) });
    setForm(EMPTY_UNIT);
    setError('');
    setMessage(`✓ Unit ${code} ditambahkan. Input HM-nya di halaman Hour Meter.`);
  }

  function handleReset() {
    if (window.confirm('Kembalikan semua data ke data dummy awal? Data yang Anda input akan hilang.')) {
      resetDemo();
      setMessage('✓ Data demo dikembalikan ke kondisi awal.');
    }
  }

  const woCount = (code) => data.workOrders.filter((wo) => wo.unitCode === code).length;
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Master Unit</h1>
          <p className="muted">{units.length} unit pada site terpilih</p>
        </div>
      </div>

      {message && (
        <p className="alert alert-good" role="status">
          {message}
        </p>
      )}

      <div className="grid-main-side">
        <section className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Site</th>
                <th>Tipe</th>
                <th>Merek / model</th>
                <th className="num">Interval PM</th>
                <th className="num">EWH</th>
                <th className="num">Jumlah WO</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => (
                <tr key={u.code}>
                  <td>
                    <button type="button" className="link-button" onClick={() => openUnit(u.code)}>
                      {u.code}
                    </button>
                  </td>
                  <td>{u.siteId}</td>
                  <td>{u.type}</td>
                  <td>{[u.brand, u.model].filter(Boolean).join(' ') || <span className="muted">Tidak tercatat</span>}</td>
                  <td className="num">{formatNumber(u.pmInterval)} HM</td>
                  <td className="num">{formatNumber(u.ewh)}</td>
                  <td className="num">{formatNumber(woCount(u.code))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div className="page" style={{ gap: 12 }}>
          <form className="card form" style={{ gridTemplateColumns: '1fr 1fr' }} onSubmit={handleSubmit} noValidate>
            <h2 className="span-2">Tambah unit</h2>
            <label>
              Kode unit
              <input type="text" value={form.code} placeholder="DT-209" onChange={set('code')} />
            </label>
            <label>
              Site
              <select value={form.siteId} onChange={set('siteId')}>
                {SITES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tipe
              <select value={form.type} onChange={set('type')}>
                {UNIT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Merek
              <input type="text" value={form.brand} placeholder="Komatsu" onChange={set('brand')} />
            </label>
            <label>
              Model
              <input type="text" value={form.model} placeholder="HD785-7" onChange={set('model')} />
            </label>
            <label>
              Interval PM (HM)
              <input type="number" min="1" value={form.pmInterval} onChange={set('pmInterval')} />
            </label>
            <label>
              EWH (HM/hari)
              <input type="number" min="1" max="24" value={form.ewh} onChange={set('ewh')} />
            </label>
            {error && <p className="field-error span-2">{error}</p>}
            <div className="form-actions span-2">
              <button type="submit" className="btn-primary">
                Tambah unit
              </button>
            </div>
          </form>

          <section className="card card-pad danger-zone">
            <div>
              <h2>Data demo</h2>
              <p className="muted small">Kembalikan seluruh data ke kondisi awal (Site A + Site B).</p>
            </div>
            <button type="button" className="btn-danger" onClick={handleReset}>
              Reset data demo
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
