// Pembungkus tabel yang bisa digeser (ke samping di layar sempit, atau ke bawah bila tingginya dibatasi).
// Bila isinya memang lebih besar dari kotaknya, kotak ini bisa difokus (Tab) lalu
// digeser dengan tombol panah — pengguna keyboard tidak terjebak di bagian awal tabel.

import { useEffect, useRef, useState } from 'react';

export default function TableWrap({ label, style, children }) {
  const ref = useRef(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const check = () => setScrollable(el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="table-wrap"
      tabIndex={scrollable ? 0 : undefined}
      role={scrollable ? 'region' : undefined}
      aria-label={scrollable ? `${label} (bisa digeser)` : undefined}
      style={style}
    >
      {children}
    </div>
  );
}
