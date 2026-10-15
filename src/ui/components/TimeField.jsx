import { useEffect, useRef, useState } from 'react';
import { useDropUp } from './useDropUp.js';

// Time combo — same button+popover pattern as Select, listing times in
// 5-minute steps. `minTime` is a static lower bound ('HH:MM'); `onDate` +
// `minNow` add a dynamic bound: when onDate is today, only times at least
// `minNow` minutes from now are offered. Date reads live in the open
// handler to keep render pure.
const pad = (n) => String(n).padStart(2, '0');
const toMin = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function TimeField({ value, onChange, minTime = '00:00',
  onDate, minNow = 0, placeholder = '00:00', disabled }) {
  const [open, setOpen] = useState(false);
  const [nowBound, setNowBound] = useState('00:00');
  const ref = useRef(null);
  const up = useDropUp(ref, open);

  useEffect(() => {
    if (!open) return;
    const off = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', off);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', off);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const toggle = () => {
    if (!open && onDate && minNow) {
      const n = new Date();
      const bound = Math.ceil((n.getHours() * 60 + n.getMinutes() + minNow) / 5) * 5;
      setNowBound(onDate === iso(n) ? fromMin(bound) : '00:00');
    }
    setOpen((o) => !o);
  };

  const bound = toMin(minTime) > toMin(nowBound) ? minTime : nowBound;
  const options = [];
  for (let m = toMin(bound); m < 24 * 60; m += 5) options.push(fromMin(m));

  return (
    <div className={`sel${disabled ? ' disabled' : ''}`} ref={ref}>
      <button type="button" className="sel-btn" disabled={disabled}
        onClick={toggle}>
        <span className={`sel-label${value ? '' : ' placeholder'}`}>
          {value || placeholder}
        </span>
        <span className="sel-caret">{open ? '⌃' : '⌄'}</span>
      </button>
      {open && (
        <ul className={`sel-list${up ? ' up' : ''}`}>
          {options.map((t) => (
            <li key={t}
              className={`sel-opt${t === value ? ' selected' : ''}`}
              onMouseDown={(e) => { e.preventDefault(); onChange(t); setOpen(false); }}>
              {t}
            </li>
          ))}
          {!options.length &&
            <li className="sel-opt muted">Sin horarios disponibles hoy</li>}
        </ul>
      )}
    </div>
  );
}
