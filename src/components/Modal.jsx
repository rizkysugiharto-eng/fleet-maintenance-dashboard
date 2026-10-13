// Jendela pop-up. Tutup dengan tombol ×, klik di luar, atau tombol Esc.

import { useEffect, useRef } from 'react';
import Icon from './Icon.jsx';

export default function Modal({ title, onClose, children, width }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={width ? { width } : undefined}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button ref={closeRef} type="button" className="btn-icon" onClick={onClose} aria-label="Tutup">
            <Icon name="close" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
