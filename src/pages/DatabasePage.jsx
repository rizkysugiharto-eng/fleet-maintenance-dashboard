// Database & Login: status koneksi Supabase, login User/Admin,
// pilihan sumber data, dan upload data demo ke database (khusus Admin).

import { useState } from 'react';
import { LevelBadge } from '../components/Badges.jsx';
import { useData } from '../context/DataContext.jsx';
import { SUPABASE_URL } from '../lib/database.js';
import { formatNumber, formatPercent } from '../lib/format.js';

const REPO = 'https://github.com/rizkysugiharto-eng/fleet-maintenance-dashboard/blob/main';

export default function DatabasePage() {
  const { data, source, session, dbRole, switchSource, signIn, signOut, seedDatabase } = useData();
  const [login, setLogin] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [seed, setSeed] = useState({ progress: null, message: '' });

  async function handleLogin(event) {
    event.preventDefault();
    setBusy(true);
    setLoginError('');
    try {
      await signIn(login.email.trim(), login.password);
      setLogin({ email: '', password: '' });
    } catch (e) {
      setLoginError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSeed() {
    if (!window.confirm('Upload seluruh data demo (Site A + Site B, ±12.000 baris) ke database?')) return;
    setSeed({ progress: 0, message: '' });
    try {
      await seedDatabase((p, table) => setSeed({ progress: p, message: `Mengunggah ${table}…` }));
      setSeed({ progress: null, message: '✓ Data demo berhasil diunggah. Aplikasi sekarang memakai database.' });
    } catch (e) {
      setSeed({ progress: null, message: `✕ ${e.message}` });
    }
  }

  const statusBadge = {
    checking: <LevelBadge level="neutral">Menghubungkan…</LevelBadge>,
    ready: source.mode === 'database' ? <LevelBadge level="good">Terhubung</LevelBadge> : <LevelBadge level="warning">Mode demo lokal</LevelBadge>,
    empty: <LevelBadge level="warning">Terhubung, database kosong</LevelBadge>,
    error: <LevelBadge level="critical">Gagal terhubung</LevelBadge>,
  }[source.status];

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="page-title">
        <div>
          <h1>Database &amp; Login</h1>
          <p className="muted">
            Mode <b>Database</b>: data bersama di Supabase — semua orang bisa melihat, hanya akun login yang bisa mengubah. Mode{' '}
            <b>Demo lokal</b>: data contoh di browser Anda sendiri, bebas dicoba.
          </p>
        </div>
      </div>

      <div className="grid-2">
        <section className="card card-pad">
          <header className="card-header">
            <div>
              <h2>Sumber data</h2>
              <p className="muted mono small">{SUPABASE_URL.replace('https://', '')}</p>
            </div>
            {statusBadge}
          </header>
          {source.message && <p className="alert alert-info">{source.message}</p>}
          <p className="muted small" style={{ margin: '10px 0' }}>
            Sedang dipakai: <b>{source.mode === 'database' ? 'Database Supabase' : 'Demo lokal (browser ini)'}</b> · {data.units.length} unit ·{' '}
            {formatNumber(data.workOrders.length)} WO · {formatNumber(data.hmLogs.length)} log HM
          </p>
          <div className="form-actions" style={{ flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={() => switchSource('database')} disabled={source.status === 'checking'}>
              {source.mode === 'database' ? 'Muat ulang dari database' : 'Gunakan database'}
            </button>
            <button type="button" className="btn-ghost" onClick={() => switchSource('local')} disabled={source.mode === 'local' && source.status === 'ready'}>
              Gunakan demo lokal
            </button>
          </div>
        </section>

        <section className="card card-pad">
          <header className="card-header">
            <div>
              <h2>Login</h2>
              <p className="muted">Akun dibuat oleh Admin di Supabase (Authentication → Users).</p>
            </div>
            {session && <LevelBadge level="good">{dbRole ?? 'user'}</LevelBadge>}
          </header>
          {session ? (
            <div className="form-actions" style={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <span>
                Masuk sebagai <b>{session.user.email}</b>
              </span>
              <button type="button" className="btn-ghost" onClick={signOut}>
                Keluar
              </button>
            </div>
          ) : (
            <form className="form" style={{ padding: 0 }} onSubmit={handleLogin} noValidate>
              <label>
                Email
                <input type="email" autoComplete="username" value={login.email} onChange={(e) => setLogin({ ...login, email: e.target.value })} />
              </label>
              <label>
                Password
                <input
                  type="password"
                  autoComplete="current-password"
                  value={login.password}
                  onChange={(e) => setLogin({ ...login, password: e.target.value })}
                />
              </label>
              {loginError && <p className="field-error span-2">{loginError}</p>}
              <div className="form-actions span-2">
                <button type="submit" className="btn-primary" disabled={busy || !login.email || !login.password}>
                  {busy ? 'Masuk…' : 'Masuk'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>

      {source.status === 'empty' && (
        <section className="card card-pad">
          <header className="card-header">
            <div>
              <h2>Isi database dengan data demo</h2>
              <p className="muted">Database sudah siap tetapi kosong. Admin bisa mengunggah data Site A + Site B sekali klik.</p>
            </div>
          </header>
          <div className="form-actions" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn-primary" onClick={handleSeed} disabled={seed.progress != null}>
              Upload data demo ke database
            </button>
            {seed.progress != null && (
              <span className="muted">
                {seed.message} {formatPercent(seed.progress * 100)}
              </span>
            )}
          </div>
          {seed.message && seed.progress == null && (
            <p className={`alert ${seed.message.startsWith('✓') ? 'alert-good' : ''}`} style={{ marginTop: 10 }}>
              {seed.message}
            </p>
          )}
        </section>
      )}

      <section className="card card-pad">
        <h2>Langkah menyiapkan database (sekali saja)</h2>
        <ol className="muted" style={{ margin: '10px 0 0', paddingLeft: 20, display: 'grid', gap: 6 }}>
          <li>
            Buka Supabase → <b>SQL Editor</b> → New query, tempel isi file{' '}
            <a href={`${REPO}/supabase/schema.sql`} target="_blank" rel="noreferrer">
              supabase/schema.sql
            </a>
            , lalu klik <b>Run</b>.
          </li>
          <li>
            Buka <b>Authentication → Users → Add user</b>, buat akun Anda (centang <i>Auto Confirm User</i>).
          </li>
          <li>
            Di SQL Editor jalankan: <code className="tag">update public.profiles set role = &apos;admin&apos; where email = &apos;email-anda&apos;;</code>
          </li>
          <li>Kembali ke halaman ini, login, lalu klik <b>Upload data demo ke database</b>.</li>
          <li>Buat akun lain (peran otomatis User) untuk planner/foreman yang menginput data.</li>
        </ol>
      </section>
    </div>
  );
}
