// Kerangka aplikasi: header (judul, tanggal data, cari unit, site, sumber data, tema)
// + sidebar menu yang disusun mengikuti alur kerja: catat → pantau → analisis.

import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useData } from '../context/DataContext.jsx';
import { SITES } from '../data/catalog.js';
import { formatDateMs } from '../lib/format.js';
import { DAY } from '../lib/kpi.js';
import Icon from './Icon.jsx';
import Unit360 from './Unit360.jsx';

const NAV = [
  { title: 'Ringkasan', items: [{ to: '/', label: 'Briefing Pagi', icon: 'home' }] },
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
      { to: '/report', label: 'Laporan Mingguan', icon: 'print' },
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

// Pilihan tampilan (site, peran demo, sumber data, tema). Di HP pindah ke dalam menu.
function Preferences({ className }) {
  const { prefs, setPref, source } = useData();
  return (
    <div className={className}>
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
  );
}

export default function Layout({ children }) {
  const { unit360, role, refTime, source } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const headerRef = useRef(null);
  const menuButtonRef = useRef(null);
  const firstRender = useRef(true);

  // Pindah halaman: tutup menu HP, kembali ke atas, dan pindahkan fokus ke judul halaman baru
  // supaya pengguna keyboard/screen reader tahu halamannya sudah berganti.
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const h1 = document.querySelector('main h1');
    if (h1) {
      h1.setAttribute('tabindex', '-1');
      h1.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  // Menu HP bisa ditutup dengan Esc; fokus kembali ke tombol menu
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Tinggi header dipakai sidebar yang menempel (sticky) di bawahnya
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const skipToContent = (e) => {
    e.preventDefault(); // HashRouter: jangan ubah alamat halaman
    document.getElementById('main-content')?.focus();
  };

  return (
    <div className="app">
      <a href="#main-content" className="skip-link" onClick={skipToContent}>
        Lewati ke konten
      </a>
      <header className="app-header" ref={headerRef}>
        <button
          ref={menuButtonRef}
          type="button"
          className="btn-icon menu-button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={menuOpen}
          aria-controls="main-menu"
        >
          <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
        <Link to="/" className="brand" aria-label="Fleet Maintenance, ke Briefing Pagi">
          <span className="brand-mark plate" aria-hidden="true">
            FM
          </span>
          <span>
            <span className="brand-title">Fleet Maintenance</span>
            <br />
            <span className="brand-sub">Papan kerja planner &amp; foreman</span>
          </span>
        </Link>
        <div className="header-tools">
          <span className="data-date">
            {source.mode === 'local' ? 'Data contoh' : 'Data'} s.d. {formatDateMs(refTime - DAY)}
          </span>
          <UnitSearch />
          <Preferences className="header-prefs" />
        </div>
      </header>

      {menuOpen && <button type="button" className="sidebar-backdrop" aria-label="Tutup menu" tabIndex={-1} onClick={() => setMenuOpen(false)} />}
      <nav id="main-menu" className={`sidebar${menuOpen ? ' open' : ''}`} aria-label="Menu utama">
        <Preferences className="sidebar-prefs" />
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
        <div className="sidebar-footer">Dibangun oleh planner, untuk planner. Data fiktif untuk portfolio · open source oleh Rizky Bagus Eka Sugiharto</div>
      </nav>

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      {unit360 && <Unit360 key={unit360} />}
    </div>
  );
}
