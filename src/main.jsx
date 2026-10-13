// Titik masuk aplikasi: React "dipasang" ke <div id="root"> di index.html.

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { DataProvider } from './context/DataContext.jsx';
import './styles.css';

// HashRouter (alamat seperti /#/input) dipakai agar aman di GitHub Pages,
// yang tidak bisa mengarahkan alamat halaman ke index.html.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </HashRouter>
  </StrictMode>,
);
