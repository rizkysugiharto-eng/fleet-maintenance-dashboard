// Kerangka aplikasi: header + navigasi + halaman sesuai alamat (route).

import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useData } from './context/DataContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import InputWorkOrder from './pages/InputWorkOrder.jsx';
import Units from './pages/Units.jsx';
import WorkOrders from './pages/WorkOrders.jsx';

export default function App() {
  const { role, setRole } = useData();

  return (
    <>
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">⚙</span>
          <span>Fleet Maintenance Dashboard</span>
        </div>
        <nav aria-label="Menu utama">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/input">Input WO</NavLink>
          <NavLink to="/work-orders">Data WO</NavLink>
          {role === 'admin' && <NavLink to="/units">Master unit</NavLink>}
        </nav>
        <label className="role-switch">
          Peran
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/input" element={<InputWorkOrder />} />
          <Route path="/work-orders" element={<WorkOrders />} />
          <Route path="/units" element={<Units />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <footer className="app-footer muted">
        Data demo fiktif, tersimpan hanya di browser Anda. Proyek open source oleh Rizky Bagus Eka Sugiharto.
      </footer>
    </>
  );
}
