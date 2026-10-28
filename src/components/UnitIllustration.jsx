// Ilustrasi siluet samping per tipe unit (satu gaya: bodi kuning, garis arang).
// Sengaja per TIPE, bukan per merek/model: di ukuran kecil beda model tidak terlihat,
// dan meniru bentuk produk asli berisiko menjiplak desain pabrikan.
// Selalu dekoratif (aria-hidden) karena tipe unit sudah ditulis sebagai teks di sebelahnya.

const INK = '#1e2124';
const BODY = '#f2b705';
const GLASS = '#bfd3de';
const STEEL = '#4a4f57';
const HUB = '#8a8f97';

const stroke = { stroke: INK, strokeWidth: 2, strokeLinejoin: 'round' };

function Hubs({ points, r = 3 }) {
  return points.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={HUB} />);
}

const SHAPES = {
  'Dump Truck': (
    <>
      <g {...stroke}>
        <polygon points="6,12 58,8 60,32 12,32" fill={BODY} />
        <polygon points="58,8 88,10 88,14 60,14" fill={BODY} />
        <rect x="64" y="15" width="18" height="16" fill={BODY} />
        <rect x="68" y="18" width="10" height="7" fill={GLASS} />
        <rect x="82" y="20" width="6" height="11" fill={BODY} />
        <rect x="10" y="31" width="80" height="5" fill={INK} />
        <circle cx="26" cy="42" r="11" fill={INK} />
        <circle cx="74" cy="42" r="11" fill={INK} />
      </g>
      <Hubs points={[[26, 42], [74, 42]]} r={4} />
    </>
  ),
  Excavator: (
    <>
      <g {...stroke}>
        <rect x="4" y="40" width="54" height="13" rx="6.5" fill={INK} />
        <rect x="2" y="27" width="12" height="12" rx="3" fill={BODY} />
        <rect x="8" y="26" width="42" height="14" fill={BODY} />
        <rect x="36" y="13" width="14" height="14" fill={BODY} />
        <rect x="39" y="16" width="8" height="7" fill={GLASS} />
        <polygon points="44,30 62,7 69,9 52,32" fill={BODY} />
        <polygon points="62,7 69,7 89,33 83,37" fill={BODY} />
        <polygon points="80,33 93,33 91,47 80,45" fill={STEEL} />
      </g>
      <Hubs points={[[11, 46.5], [51, 46.5]]} />
      <circle cx="31" cy="46.5" r="2" fill={HUB} />
    </>
  ),
  Grader: (
    <>
      <g {...stroke}>
        <polygon points="34,30 86,22 88,27 36,37" fill={BODY} />
        <rect x="4" y="26" width="32" height="14" fill={BODY} />
        <rect x="20" y="10" width="16" height="17" fill={BODY} />
        <rect x="23" y="13" width="10" height="8" fill={GLASS} />
        <rect x="81" y="24" width="7" height="15" fill={BODY} />
        <path d="M84 34 L60 43" fill="none" />
        <path d="M44 44 Q55 50 68 44 L68 48 Q55 54 44 48 Z" fill={STEEL} />
        <circle cx="12" cy="46" r="8" fill={INK} />
        <circle cx="30" cy="46" r="8" fill={INK} />
        <circle cx="85" cy="46" r="8" fill={INK} />
      </g>
      <Hubs points={[[12, 46], [30, 46], [85, 46]]} />
    </>
  ),
  Bulldozer: (
    <>
      <g {...stroke}>
        <rect x="8" y="40" width="58" height="13" rx="6.5" fill={INK} />
        <rect x="14" y="26" width="48" height="14" fill={BODY} />
        <rect x="18" y="10" width="18" height="17" fill={BODY} />
        <rect x="21" y="13" width="12" height="8" fill={GLASS} />
        <path d="M48 26 L48 16" fill="none" strokeWidth="3" />
        <path d="M60 43 L74 46" fill="none" strokeWidth="3" />
        <path d="M72 14 Q83 32 75 53 L82 53 Q91 32 79 14 Z" fill={BODY} />
        <path d="M12 34 L5 49 L9 51" fill="none" strokeWidth="3" />
      </g>
      <Hubs points={[[15, 46.5], [59, 46.5]]} />
      <circle cx="37" cy="46.5" r="2" fill={HUB} />
    </>
  ),
  'Wheel Loader': (
    <>
      <g {...stroke}>
        <rect x="2" y="26" width="10" height="12" rx="3" fill={BODY} />
        <rect x="6" y="24" width="38" height="16" fill={BODY} />
        <rect x="28" y="8" width="16" height="17" fill={BODY} />
        <rect x="31" y="11" width="10" height="8" fill={GLASS} />
        <rect x="44" y="28" width="16" height="10" fill={BODY} />
        <polygon points="56,30 78,20 82,24 60,36" fill={BODY} />
        <path d="M76 16 L92 18 L94 38 L80 40 Q74 30 76 16 Z" fill={STEEL} />
        <circle cx="20" cy="44" r="10" fill={INK} />
        <circle cx="62" cy="44" r="10" fill={INK} />
      </g>
      <Hubs points={[[20, 44], [62, 44]]} r={4} />
    </>
  ),
  'Fuel Truck': (
    <>
      <g {...stroke}>
        <rect x="6" y="14" width="58" height="22" rx="11" fill="#fffdf8" />
        <path d="M66 14 L83 14 L90 26 L90 36 L66 36 Z" fill={BODY} />
        <path d="M70 17 L81 17 L86 25 L70 25 Z" fill={GLASS} />
        <rect x="6" y="36" width="84" height="5" fill={INK} />
        <circle cx="20" cy="45" r="8" fill={INK} />
        <circle cx="37" cy="45" r="8" fill={INK} />
        <circle cx="78" cy="45" r="8" fill={INK} />
      </g>
      {/* tanda bahan mudah terbakar */}
      <rect x="30" y="20" width="10" height="10" fill="#b42318" transform="rotate(45 35 25)" />
      <Hubs points={[[20, 45], [37, 45], [78, 45]]} />
    </>
  ),
  'Water Truck': (
    <>
      <g {...stroke}>
        <rect x="10" y="16" width="54" height="20" rx="3" fill={GLASS} />
        <path d="M24 16 V36 M38 16 V36 M52 16 V36" fill="none" strokeWidth="1.5" />
        <path d="M66 14 L83 14 L90 26 L90 36 L66 36 Z" fill={BODY} />
        <path d="M70 17 L81 17 L86 25 L70 25 Z" fill={GLASS} />
        <rect x="6" y="36" width="84" height="5" fill={INK} />
        <rect x="3" y="37" width="6" height="3" fill={INK} />
        <circle cx="20" cy="45" r="8" fill={INK} />
        <circle cx="37" cy="45" r="8" fill={INK} />
        <circle cx="78" cy="45" r="8" fill={INK} />
      </g>
      {/* semprotan penyiram jalan tambang */}
      <path d="M5 42 L1 52 M8 43 L6 54 M11 43 L11 54" fill="none" stroke="#1e4f8a" strokeWidth="1.5" strokeDasharray="2 2" strokeLinecap="round" />
      <Hubs points={[[20, 45], [37, 45], [78, 45]]} />
    </>
  ),
  // Pickup double cabin: model LV yang paling umum di tambang
  'Light Vehicle': (
    <>
      {/* bendera buggy whip, wajib untuk LV di area tambang */}
      <path d="M9 30 L9 4" fill="none" stroke={INK} strokeWidth="1.5" />
      <path d="M9 4 L20 7 L9 10 Z" fill="#b42318" />
      <g {...stroke}>
        {/* bak belakang + kabin 4 pintu + kap mesin */}
        <path d="M5 42 L5 30 L33 30 L33 18 Q33 16 35 16 L63 16 L72 29 L88 31 Q91 32 91 35 L91 42 Z" fill="#fffdf8" />
        <path d="M33 30 L33 41" fill="none" strokeWidth="1.5" />
        <path d="M36 19 L48 19 L48 28 L36 28 Z" fill={GLASS} />
        <path d="M51 19 L62 19 L68 28 L51 28 Z" fill={GLASS} />
        <path d="M49.5 28 L49.5 41" fill="none" strokeWidth="1.5" />
        {/* light bar di atap */}
        <rect x="42" y="12" width="14" height="4" fill={BODY} />
        {/* bull bar depan */}
        <rect x="90" y="32" width="4" height="9" fill={INK} />
        <rect x="6" y="35" width="84" height="2.5" fill={BODY} stroke="none" />
        <circle cx="20" cy="44" r="8" fill={INK} />
        <circle cx="76" cy="44" r="8" fill={INK} />
      </g>
      <Hubs points={[[20, 44], [76, 44]]} />
    </>
  ),
};

export const ILLUSTRATED_TYPES = Object.keys(SHAPES);

export default function UnitIllustration({ type, width = 64, className = '' }) {
  const shape = SHAPES[type];
  if (!shape) return null;
  return (
    <svg
      className={`unit-illus ${className}`}
      viewBox="0 0 96 56"
      width={width}
      height={Math.round((width * 56) / 96)}
      aria-hidden="true"
      focusable="false"
    >
      {shape}
    </svg>
  );
}
