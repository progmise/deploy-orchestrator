import { useState } from 'react';
import { SearchRow } from '../../components/Feedback.jsx';
import { Ico, ICON } from '../../components/Icons.jsx';
import TemplateWizard from './TemplateWizard.jsx';

// Template catalog page — the "Nuevo componente" destination. Picking a
// card opens the stepped wizard (Información → Personalización → Resumen).
export default function TemplateGallery({ templates, onPick, onChanged }) {
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [mode, setMode] = useState('grid');
  const [showWizard, setShowWizard] = useState(false);
  const shown = (templates || []).filter((t) =>
    (kind === 'all' || t.kind === kind)
    && (!q || [t.name, t.display_name, t.description].join(' ').toLowerCase().includes(q)));

  const docLink = (t) => (
    <a className="chip tpl-doc" href={`https://github.com/${t.repo}#readme`}
      target="_blank" rel="noreferrer" title="Documentación"
      onClick={(e) => e.stopPropagation()}><Ico d={ICON.doc} />Doc</a>
  );

  return (
    <div className="card tpl-page">
      <div className="tpl-head">
        <h2 className="tpl-title">Crear un nuevo componente</h2>
        <p className="muted tpl-sub">Crear un nuevo componente utilizando plantillas</p>
        <SearchRow q={q} setQ={setQ} placeholder="Buscar plantilla por nombre…"
        action={
          <>
            <span className="chips" style={{ marginLeft: 'auto' }}>
              {[['all', 'Todas'], ['app', 'Apps'], ['lib', 'Libs']].map(([v, l]) => (
                <button key={v}
                  className={`chip${kind === v ? ' chip-teal' : ''}`}
                  style={{ cursor: 'pointer', border: 'none' }}
                  onClick={() => setKind(v)}>{l}</button>
              ))}
            </span>
            <span className="view-toggle">
              <button className={mode === 'grid' ? 'active' : ''} title="Grilla"
                onClick={() => setMode('grid')}><Ico d={ICON.grid} /></button>
              <button className={mode === 'list' ? 'active' : ''} title="Lista"
                onClick={() => setMode('list')}><Ico d={ICON.list} /></button>
            </span>
            <button className="btn btn-primary"
              onClick={() => setShowWizard(true)}>Nueva plantilla +</button>
          </>
        } />
      </div>
      <div className="tpl-body">
      {!templates && <p className="muted">Cargando plantillas…</p>}
      {mode === 'grid' ? (
        <div className="tpl-grid">
          {shown.map((t) => (
            <div key={t.name} className="tpl-card" role="button" tabIndex={0}
              onClick={() => onPick(t)} onKeyDown={(e) => e.key === 'Enter' && onPick(t)}>
              <div className="tpl-card-head">
                <span className="tpl-meta">
                  {t.kind === 'lib' ? 'Lib' : 'App'}
                  <span className={`chip${t.kind === 'lib' ? '' : ' chip-teal'}`}>{t.kind}</span>
                </span>
                <strong>{t.display_name || t.name}</strong>
                {docLink(t)}
              </div>
              <div className="tpl-card-body">
                <span className="muted tpl-desc">{t.description || '—'}</span>
                <span className="chip">{t.name}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <table>
          <tbody>
            {shown.map((t) => (
              <tr key={t.name} className="tpl-row" onClick={() => onPick(t)}>
                <td><strong>{t.display_name || t.name}</strong>{' '}{docLink(t)}<br />
                  <span className="muted" style={{ fontSize: 12 }}>{t.name}</span></td>
                <td><span className={`chip${t.kind === 'lib' ? '' : ' chip-teal'}`}>{t.kind}</span></td>
                <td><span className="muted">{t.description || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {templates && !shown.length && <p className="muted">Sin plantillas para ese filtro.</p>}
      </div>
      {showWizard && (
        <TemplateWizard onClose={() => setShowWizard(false)} onCreated={onChanged} />
      )}
    </div>
  );
}
