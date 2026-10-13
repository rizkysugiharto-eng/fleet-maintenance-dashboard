// Kerangka aplikasi: header (judul, jam, cari unit, site, tema, peran) + sidebar menu.

import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { SITES } from '../data/catalog.js';
import Icon from './Icon.jsx';
import Unit360 from './Unit360.jsx';

const NAV = [
  {
    title: 'Analitik',
    items: [
      { to: '/', label: 'Dashboard', icon: 'dashboard' },
      { to: '/health', label: 'Kesehatan Unit', icon: 'health' },
    ],
  },
  {
    title: 'Operasional',
    items: [
      { to: '/work-orders', label: 'Laporan Work Order', icon: 'report' },
      { to: '/input', label: 'Input Work Order', icon: 'plus' },
    ],
  },
  {
    title: 'Maintenance',
    items: [
      { to: '/hour-meter', label: 'Hour Meter', icon: 'gauge' },
      { to: '/pm', label: 'Perencanaan PM', icon: 'calendar' },
      { to: '/backlog', label: 'Backlog', icon: 'backlog' },
    ],
  },
  {
    title: 'Pusat Data',
    items: [
      { to: '/import', label: 'Import & Sumber Data', icon: 'upload' },
      { to: '/database', label: 'Database & Login', icon: 'database' },
      { to: '/units', label: 'Master Unit', icon: 'truck', admin: true },
    ],
  },
];

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="clock" aria-label="Jam saat ini">
      {now.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
      <small>{now.toLocaleTimeString('id-ID')}</small>
    </div>
  );
}

function UnitSearch() {
  const { data, openUnit } = useData();
  const [query, setQuery] = useState('');

  function submit(e) {
    e.preventDefault();
    const code = query.trim().toUpperCase();
    const unit = data.units.find((u) => u.code === code) ?? data.units.find((u) => u.code.includes(code));
    if (unit) {
      openUnit(unit.code);
      setQuery('');
    }
  }

  return (
    <form className="unit-search" onSubmit={submit} role="search">
      <Icon name="search" size={14} />
      <input
        list="unit-codes"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari unit → Enter"
        aria-label="Cari kode unit"
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
    <NavLink to="/database" className="badge status-warning" title="Data demo di browser ini">
      ● Demo lokal
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { prefs, setPref, unit360, source, role } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="app">
      <header className="app-header">
        <button type="button" className="btn-icon menu-button" onClick={() => setMenuOpen((v) => !v)} aria-label="Buka menu" aria-expanded={menuOpen}>
          <Icon name="menu" />
        </button>
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            F
          </span>
          <div>
            <div className="brand-title">Fleet Maintenance &amp; Reliability</div>
            <div className="brand-sub">Monitoring KPI armada alat berat · data dummy</div>
          </div>
        </div>
        <div className="header-tools">
          <LiveClock />
          <UnitSearch />
          <select value={prefs.site} onChange={(e) => setPref('site', e.target.value)} aria-label="Pilih site">
            <option value="all">Semua site</option>
            {SITES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.description}
              </option>
            ))}
          </select>
          <SourceBadge />
          {source.mode === 'local' && (
            <select value={prefs.role} onChange={(e) => setPref('role', e.target.value)} aria-label="Peran">
              <option value="user">Peran: User</option>
              <option value="admin">Peran: Admin</option>
            </select>
          )}
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
        {NAV.map((group) => (
          <div className="nav-group" key={group.title}>
            <div className="nav-group-title">{group.title.toUpperCase()}</div>
            {group.items
              .filter((item) => !item.admin || role === 'admin')
              .map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                  <Icon name={item.icon} />
                  {item.label}
                </NavLink>
              ))}
          </div>
        ))}
        <div className="sidebar-footer">
          Data fiktif untuk portfolio. Open source oleh Rizky Bagus Eka Sugiharto.
        </div>
      </nav>

      <main>{children}</main>
      {unit360 && <Unit360 key={unit360} />}
    </div>
  );
}
