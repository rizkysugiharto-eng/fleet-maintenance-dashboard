// Kerangka aplikasi: header (judul, tanggal data, cari unit, site, sumber data, tema)
// + sidebar menu yang disusun mengikuti alur kerja: catat → pantau → analisis.

import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { SITES } from '../data/catalog.js';
import { formatDateMs } from '../lib/format.js';
import { DAY } from '../lib/kpi.js';
import Icon from './Icon.jsx';
import Unit360 from './Unit360.jsx';

const NAV = [
  { title: 'Ringkasan', items: [{ to: '/', label: 'Beranda', icon: 'home' }] },
  {
    step: 1,
    title: 'Catat data',
    items: [
      { to: '/input', label: 'Input Work Order', icon: 'plus' },
      { to: '/hour-meter', label: 'Hour Meter', icon: 'gauge' },
      { to: '/import', label: 'Import Data', icon: 'upload' },
    ],
  },
  {
    step: 2,
    title: 'Pantau pekerjaan',
    items: [
      { to: '/work-orders', label: 'Laporan Work Order', icon: 'report' },
      { to: '/backlog', label: 'Backlog', icon: 'backlog' },
      { to: '/health', label: 'Kondisi Unit', icon: 'health' },
    ],
  },
  {
    step: 3,
    title: 'Analisis & rencana',
    items: [
      { to: '/dashboard', label: 'Dashboard KPI', icon: 'dashboard' },
      { to: '/pm', label: 'Perencanaan PM', icon: 'calendar' },
    ],
  },
  {
    title: 'Pengaturan',
    items: [
      { to: '/database', label: 'Database & Login', icon: 'database' },
      { to: '/units', label: 'Master Unit', icon: 'truck', admin: true },
    ],
  },
];

function UnitSearch() {
  const { data, openUnit } = useData();
  const [query, setQuery] = useState('');

  function submit(e) {
    e.preventDefault();
    const code = query.trim().toUpperCase();
    if (!code) return;
    const unit = data.units.find((u) => u.code === code) ?? data.units.find((u) => u.code.includes(code));
    if (unit) {
      openUnit(unit.code);
      setQuery('');
    }
  }

  return (
    <form className="unit-search" onSubmit={submit} role="search">
      <Icon name="search" size={15} />
      <input
        list="unit-codes"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari kode unit…"
        aria-label="Cari kode unit, lalu tekan Enter"
      />
      <datalist id="unit-codes">
        {data.units.map((u) => (
          <option key={u.code} value={u.code}>
            {u.type}
          </option>
        ))}
      </datalist>
    </form>
  );
}

function SourceBadge() {
  const { source, session, role } = useData();
  if (source.status === 'checking') return <span className="badge status-neutral">Menghubungkan…</span>;
  if (source.mode === 'database') {
    return (
      <NavLink to="/database" className="badge status-good" title="Data dari database Supabase">
        ● Database · {session ? role : 'tamu'}
      </NavLink>
    );
  }
  return (
    <NavLink to="/database" className="badge status-warning" title="Data contoh yang tersimpan di browser ini">
      ● Mode demo
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { prefs, setPref, unit360, source, role, refTime } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="app">
      <header className="app-header">
        <button
          type="button"
          className="btn-icon menu-button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Buka menu"
          aria-expanded={menuOpen}
        >
          <Icon name="menu" />
        </button>
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            F
          </span>
          <span>
            <span className="brand-title">Fleet Maintenance</span>
            <br />
            <span className="brand-sub">Monitoring perawatan alat berat</span>
          </span>
        </Link>
        <div className="header-tools">
          <span className="data-date">Data s.d. {formatDateMs(refTime - DAY)}</span>
          <UnitSearch />
          <select value={prefs.site} onChange={(e) => setPref('site', e.target.value)} aria-label="Pilih site">
            <option value="all">Semua site</option>
            {SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.description}
              </option>
            ))}
          </select>
          {source.mode === 'local' && (
            <select value={prefs.role} onChange={(e) => setPref('role', e.target.value)} aria-label="Peran (mode demo)">
              <option value="user">Peran: User</option>
              <option value="admin">Peran: Admin</option>
            </select>
          )}
          <SourceBadge />
          <button
            type="button"
            className="btn-icon"
            onClick={() => setPref('theme', prefs.theme === 'dark' ? 'light' : 'dark')}
            aria-label={prefs.theme === 'dark' ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
            title="Ganti tema"
          >
            <Icon name={prefs.theme === 'dark' ? 'sun' : 'moon'} />
          </button>
        </div>
      </header>

      {menuOpen && <button type="button" className="sidebar-backdrop" aria-label="Tutup menu" onClick={() => setMenuOpen(false)} />}
      <nav className={`sidebar${menuOpen ? ' open' : ''}`} aria-label="Menu utama">
        {NAV.map((group) => {
          const items = group.items.filter((item) => !item.admin || role === 'admin');
          if (items.length === 0) return null;
          return (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">
                {group.step && <span className="step-dot">{group.step}</span>}
                {group.title}
              </div>
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
        <div className="sidebar-footer">Data fiktif untuk portfolio · open source oleh Rizky Bagus Eka Sugiharto</div>
      </nav>

      <main>{children}</main>
      {unit360 && <Unit360 key={unit360} />}
    </div>
  );
}
