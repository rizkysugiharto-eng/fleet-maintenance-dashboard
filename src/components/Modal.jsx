// Jendela pop-up. Tutup dengan tombol ×, klik di luar, atau tombol Esc.
// Selama terbuka, Tab berputar di dalam jendela; saat ditutup, fokus kembali
// ke tombol/kartu yang membukanya.

import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';

const FOCUSABLE = 'button:not([disabled]), [href], select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Modal({ title, onClose, children, width }) {
  const closeRef = useRef(null);
  const modalRef = useRef(null);
  // Simpan onClose terbaru tanpa menjalankan ulang effect di bawah. Kalau effect ikut
  // jalan ulang setiap render, fokus akan melompat ke tombol Tutup setiap kali isi
  // modal berubah (mis. saat periode diganti).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !modalRef.current) return;
      const items = [...modalRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!modalRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden'; // halaman di belakang tidak ikut ter-scroll
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCloseRef.current()}>
      <div ref={modalRef} className="modal" role="dialog" aria-modal="true" aria-label={title} style={width ? { width } : undefined}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button ref={closeRef} type="button" className="btn-icon" onClick={() => onCloseRef.current()} aria-label="Tutup">
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
