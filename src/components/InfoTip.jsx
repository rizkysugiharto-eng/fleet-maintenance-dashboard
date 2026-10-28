// Tombol "?" kecil yang menjelaskan satu istilah (PA, MTBF, …) untuk pengunjung awam.
// Bisa dipakai dengan mouse, sentuhan, dan keyboard; Esc atau klik di luar menutupnya.

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { GLOSSARY } from '../data/catalog.js';

export default function InfoTip({ id: key }) {
  const entry = GLOSSARY[key];
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const popRef = useRef(null);
  const popId = useId();

  // Geser keterangan supaya tidak keluar dari layar (penting di HP)
  useLayoutEffect(() => {
    const pop = popRef.current;
    if (!open || !pop) return;
    pop.style.transform = '';
    const r = pop.getBoundingClientRect();
    const margin = 8;
    let shift = 0;
    if (r.left < margin) shift = margin - r.left;
    else if (r.right > window.innerWidth - margin) shift = window.innerWidth - margin - r.right;
    if (shift) pop.style.transform = `translateX(${shift}px)`;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open]);

  if (!entry) return null;
  return (
    <span className="infotip" ref={ref}>
      <button
        type="button"
        className="infotip-btn"
        aria-label={`Apa itu ${entry.term}?`}
        aria-expanded={open}
        aria-controls={popId}
        onClick={() => setOpen((v) => !v)}
      >
        ?
      </button>
      <span ref={popRef} id={popId} role="note" className="infotip-pop" hidden={!open}>
        <b>{entry.term}</b> — {entry.text}
      </span>
    </span>
  );
}
