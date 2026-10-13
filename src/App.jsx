// Daftar halaman (route): alamat → komponen halaman.

import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Backlog from './pages/Backlog.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EquipmentHealth from './pages/EquipmentHealth.jsx';
import HourMeter from './pages/HourMeter.jsx';
import ImportCenter from './pages/ImportCenter.jsx';
import InputWorkOrder from './pages/InputWorkOrder.jsx';
import PmPlanning from './pages/PmPlanning.jsx';
import Units from './pages/Units.jsx';
import WorkOrders from './pages/WorkOrders.jsx';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/health" element={<EquipmentHealth />} />
        <Route path="/work-orders" element={<WorkOrders />} />
        <Route path="/input" element={<InputWorkOrder />} />
        <Route path="/hour-meter" element={<HourMeter />} />
        <Route path="/pm" element={<PmPlanning />} />
        <Route path="/backlog" element={<Backlog />} />
        <Route path="/import" element={<ImportCenter />} />
        <Route path="/units" element={<Units />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
