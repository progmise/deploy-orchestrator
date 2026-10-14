import { useEffect, useRef, useState } from 'react';
import { Ico, ICON } from './Icons.jsx';

// Calendar popover — same button+popover pattern as Select. `value` is
// 'YYYY-MM-DD'; displays dd/mm/aaaa like the reference's pickers.
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WDAYS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const pad = (n) => String(n).padStart(2, '0');
const fmt = (v) => v ? `${v.slice(8, 10)}/${v.slice(5, 7)}/${v.slice(0, 4)}` : '';

export default function DateField({ value, onChange,
  placeholder = 'dd/mm/aaaa', disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [today, setToday] = useState('');
  const [view, setView] = useState(null);

  // Date reads live in the event handler — render stays pure.
  const toggle = () => {
    if (!open) {
      const n = new Date();
      setToday(`${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`);
      setView((v) => v ?? (value
        ? { y: +value.slice(0, 4), m: +value.slice(5, 7) - 1 }
        : { y: n.getFullYear(), m: n.getMonth() }));
    }
    setOpen((o) => !o);
  };

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

  const first = view ? new Date(view.y, view.m, 1).getDay() : 0;
  const days = view ? new Date(view.y, view.m + 1, 0).getDate() : 0;
  const move = (d) => setView(({ y, m }) => {
    const t = new Date(y, m + d, 1);
    return { y: t.getFullYear(), m: t.getMonth() };
  });
  const pick = (d) => {
    onChange(`${view.y}-${pad(view.m + 1)}-${pad(d)}`);
    setOpen(false);
  };

  return (
    <div className={`sel cal${disabled ? ' disabled' : ''}`} ref={ref}>
      <button type="button" className="sel-btn" disabled={disabled}
        onClick={toggle}>
        <span className={`sel-label${value ? '' : ' placeholder'}`}>
          {fmt(value) || placeholder}
        </span>
        <span className="sel-caret cal-ico"><Ico d={ICON.calendar} /></span>
      </button>
      {open && view && (
        <div className="cal-pop">
          <div className="cal-head">
            <button type="button" onClick={() => move(-1)}>‹</button>
            <span>{MONTHS[view.m]} {view.y}</span>
            <button type="button" onClick={() => move(1)}>›</button>
          </div>
          <div className="cal-grid">
            {WDAYS.map((w, i) => <span key={i} className="cal-wd">{w}</span>)}
            {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: days }, (_, i) => {
              const d = i + 1;
              const iso = `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
              return (
                <button key={d} type="button"
                  className={`cal-d${iso === value ? ' selected' : ''}${iso === today ? ' today' : ''}`}
                  onMouseDown={(e) => { e.preventDefault(); pick(d); }}>{d}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
