// Halaman khusus Admin: kelola master data unit & reset data demo.

import { useState } from 'react';
import { useData } from '../context/DataContext.jsx';
import { UNIT_TYPES } from '../data/dummy.js';
import { formatNumber } from '../lib/format.js';

const EMPTY_UNIT = { code: '', type: UNIT_TYPES[0], brand: '', model: '' };

export default function Units() {
  const { role, units, workOrders, addUnit, resetDemo } = useData();
  const [form, setForm] = useState(EMPTY_UNIT);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  if (role !== 'admin') {
    return (
      <div className="page">
        <h1>Master unit</h1>
        <p className="alert">Halaman ini hanya untuk Admin. Ganti peran di pojok kanan atas.</p>
      </div>
    );
  }

  function handleSubmit(event) {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z]{2}-\d{3}$/.test(code)) return setError('Kode unit harus berformat XX-000, contoh EX-003.');
    if (units.some((u) => u.code === code)) return setError(`Kode ${code} sudah dipakai.`);
    if (!form.brand.trim() || !form.model.trim()) return setError('Isi merek dan model.');

    addUnit({ code, type: form.type, brand: form.brand.trim(), model: form.model.trim() });
    setForm(EMPTY_UNIT);
    setError('');
    setMessage(`✓ Unit ${code} ditambahkan.`);
  }

  function handleReset() {
    if (window.confirm('Kembalikan semua data ke data dummy awal? Data yang Anda input akan hilang.')) {
      resetDemo();
      setMessage('✓ Data demo dikembalikan ke kondisi awal.');
    }
  }

  const woCount = (code) => workOrders.filter((wo) => wo.unitCode === code).length;

  return (
    <div className="page">
      <div className="page-title">
        <h1>Master unit</h1>
        <p className="muted">{units.length} unit terdaftar</p>
      </div>

      {message && (
        <p className="alert alert-good" role="status">
          {message}
        </p>
      )}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Tipe</th>
              <th>Merek</th>
              <th>Model</th>
              <th className="num">Jumlah WO</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.code}>
                <td>{u.code}</td>
                <td>{u.type}</td>
                <td>{u.brand}</td>
                <td>{u.model}</td>
                <td className="num">{formatNumber(woCount(u.code))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-title">Tambah unit</h2>
      <form className="card form" onSubmit={handleSubmit} noValidate>
        <label>
          Kode unit
          <input
            type="text"
            value={form.code}
            placeholder="EX-003"
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </label>
        <label>
          Tipe
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {UNIT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label>
          Merek
          <input type="text" value={form.brand} placeholder="Komatsu" onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        </label>
        <label>
          Model
          <input type="text" value={form.model} placeholder="PC1250-8" onChange={(e) => setForm({ ...form, model: e.target.value })} />
        </label>
        {error && <p className="field-error span-2">{error}</p>}
        <div className="form-actions span-2">
          <button type="submit" className="btn-primary">
            Tambah unit
          </button>
        </div>
      </form>

      <h2 className="section-title">Data demo</h2>
      <div className="card danger-zone">
        <p>Kembalikan seluruh unit dan work order ke data dummy awal (tahun 2025).</p>
        <button type="button" className="btn-danger" onClick={handleReset}>
          Reset data demo
        </button>
      </div>
    </div>
  );
}
