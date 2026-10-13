// "Context" = tempat menyimpan data yang dipakai bersama oleh semua halaman.
// Halaman cukup memanggil useData() untuk membaca data atau menjalankan aksi
// (tambah WO, tutup WO, tambah unit), tanpa saling mengoper data satu per satu.

import { createContext, useContext, useEffect, useState } from 'react';
import { loadData, resetData, saveData } from '../lib/storage.js';

const DataContext = createContext(null);

// Nomor WO berikutnya untuk tahun tertentu, contoh: WO-2026-0001
function nextWorkOrderId(workOrders, year) {
  const prefix = `WO-${year}-`;
  const lastNumber = workOrders
    .filter((wo) => wo.id.startsWith(prefix))
    .reduce((max, wo) => Math.max(max, Number(wo.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(lastNumber + 1).padStart(4, '0')}`;
}

export function DataProvider({ children }) {
  const [data, setData] = useState(loadData);
  // Peran disimulasikan di sini; di tahap 2 diganti dengan login sungguhan
  const [role, setRole] = useState('user');

  useEffect(() => saveData(data), [data]);

  function addWorkOrder(input) {
    const id = nextWorkOrderId(data.workOrders, input.start.slice(0, 4));
    const workOrder = { ...input, id, status: input.end ? 'Closed' : 'Open' };
    setData((d) => ({ ...d, workOrders: [...d.workOrders, workOrder] }));
    return id;
  }

  function closeWorkOrder(id, end) {
    setData((d) => ({
      ...d,
      workOrders: d.workOrders.map((wo) => (wo.id === id ? { ...wo, end, status: 'Closed' } : wo)),
    }));
  }

  function addUnit(unit) {
    setData((d) => ({ ...d, units: [...d.units, unit] }));
  }

  function resetDemo() {
    setData(resetData());
  }

  const value = { ...data, role, setRole, addWorkOrder, closeWorkOrder, addUnit, resetDemo };
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  return useContext(DataContext);
}
