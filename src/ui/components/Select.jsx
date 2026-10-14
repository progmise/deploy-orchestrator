import { useEffect, useRef, useState } from 'react';

// Gluon-style combo: native <select> can't render tags inside options, so
// this renders a button + popover list. Options may carry a `tag` +
// `tagKind` ('draft' | 'pub') shown as a pill next to the label.
export default function Select({ value, options = [], onChange,
  placeholder = 'Seleccionar…', disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

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

  const Tag = ({ t }) =>
    <span className={`sel-tag tag-${t.tagKind || 'plain'}`}>{t.tag}</span>;

  return (
    <div className={`sel${disabled ? ' disabled' : ''}`} ref={ref}>
      <button type="button" className="sel-btn" disabled={disabled}
        onClick={() => setOpen((o) => !o)}>
        <span className={`sel-label${selected ? '' : ' placeholder'}`}>
          {selected ? <>{selected.label}{selected.tag && <Tag t={selected} />}</>
            : placeholder}
        </span>
        <span className="sel-caret">{open ? '⌃' : '⌄'}</span>
      </button>
      {open && (
        <ul className="sel-list">
          {options.map((o) => (
            <li key={o.value}
              className={`sel-opt${o.value === value ? ' selected' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false); }}>
              {o.label}{o.tag && <Tag t={o} />}
            </li>
          ))}
          {!options.length && <li className="sel-opt muted">Sin opciones</li>}
        </ul>
      )}
    </div>
  );
}
