// Hour Meter: input pembacaan HM harian dan pantau unit yang belum di-update.
// HM adalah sumber "jam operasi" untuk menghitung MA, UA, dan MTBF.

import { useMemo, useState } from 'react';
import { LevelBadge } from '../components/Badges.jsx';
import { useData } from '../context/DataContext.jsx';
import { formatDate } from '../data/simulate.js';
import { formatDateMs, formatNumber } from '../lib/format.js';
import { DAY, toMs } from '../lib/kpi.js';
import { unitHmStatus } from '../lib/planning.js';

export default function HourMeter() {
  const { units, data, hmIndex, refTime, addHmReading, openUnit } = useData();
  const [form, setForm] = useState({ unitCode: '', date: formatDate(refTime - DAY), hm: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const rows = useMemo(
    () =>
      units.map((u) => {
        const status = unitHmStatus(hmIndex, u.code, refTime);
        const daysSince = status.lastUpdate == null ? null : Math.floor((refTime - DAY - status.lastUpdate) / DAY);
        return { unit: u, ...status, daysSince };
      }),
    [units, hmIndex, refTime],
  );

  function handleSubmit(event) {
    event.preventDefault();
    const hm = Number(form.hm);
    const logs = data.hmLogs.filter((h) => h.unitCode === form.unitCode);
    const before = logs.filter((h) => h.date < form.date).sort((a, b) => b.date.localeCompare(a.date))[0];
    const after = logs.filter((h) => h.date > form.date).sort((a, b) => a.date.localeCompare(b.date))[0];

    if (!form.unitCode) return setError('Pilih unit.');
    if (!form.date) return setError('Isi tanggal.');
    if (!(hm > 0)) return setError('Isi nilai HM.');
    // HM tidak boleh turun dan tidak boleh naik lebih dari 24 jam per hari
    if (before && hm < before.hm) return setError(`HM tidak boleh lebih kecil dari pembacaan sebelumnya (${formatNumber(before.hm, 1)} pada ${before.date}).`);
    if (before && hm - before.hm > 24 * ((toMs(form.date) - toMs(before.date)) / DAY))
      return setError('Kenaikan HM melebihi 24 jam per hari — periksa kembali angkanya.');
    if (after && hm > after.hm) return setError(`HM tidak boleh lebih besar dari pembacaan sesudahnya (${formatNumber(after.hm, 1)} pada ${after.date}).`);

    addHmReading({ unitCode: form.unitCode, date: form.date, hm });
    setError('');
    setMessage(`✓ HM ${form.unitCode} tanggal ${form.date} tersimpan: ${formatNumber(hm, 1)}.`);
    setForm({ ...form, hm: '' });
  }

  return (
    <div className="page">
      <div className="page-title">
        <div>
          <h1>Hour Meter</h1>
          <p className="muted">Pembacaan HM harian per unit. Unit yang lama tidak di-update membuat perhitungan MA/UA kurang akurat.</p>
        </div>
      </div>

      <div className="grid-main-side">
        <section className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Tipe</th>
                <th className="num">HM terakhir</th>
                <th>Update terakhir</th>
                <th className="num">EWH (HM/hari)</th>
                <th>Status update</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.unit.code}>
                  <td>
                    <button type="button" className="link-button" onClick={() => openUnit(r.unit.code)}>
                      {r.unit.code}
                    </button>
                  </td>
                  <td>{r.unit.type}</td>
                  <td className="num">{formatNumber(r.hm, 1)}</td>
                  <td className="nowrap">{formatDateMs(r.lastUpdate)}</td>
                  <td className="num">{formatNumber(r.ewh, 1)}</td>
                  <td>
                    {r.daysSince == null ? (
                      <LevelBadge level="critical">Belum ada data</LevelBadge>
                    ) : r.daysSince <= 1 ? (
                      <LevelBadge level="good">Terkini</LevelBadge>
                    ) : (
                      <LevelBadge level="warning">{r.daysSince} hari lalu</LevelBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <form className="card form" style={{ gridTemplateColumns: '1fr' }} onSubmit={handleSubmit} noValidate>
          <h2>Input pembacaan HM</h2>
          <label>
            Unit
            <select value={form.unitCode} onChange={(e) => setForm({ ...form, unitCode: e.target.value })}>
              <option value="">— Pilih unit —</option>
              {units.map((u) => (
                <option key={u.code}>{u.code}</option>
              ))}
            </select>
          </label>
          <label>
            Tanggal pembacaan
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label>
            Nilai HM (jam)
            <input type="number" min="0" step="0.1" value={form.hm} onChange={(e) => setForm({ ...form, hm: e.target.value })} placeholder="contoh: 12480.5" />
            <span className="hint">Angka di panel hour meter unit pada akhir shift/hari.</span>
          </label>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          {message && !error && (
            <p className="alert alert-good" role="status">
              {message}
            </p>
          )}
          <div className="form-actions">
            <button type="submit" className="btn-primary">
              Simpan HM
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
