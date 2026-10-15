import { useState } from 'react';
import { createTemplate } from '../../../infrastructure/api/catalogApi.js';
import Select from '../../components/Select.jsx';

const STEPS = ['Identificación', 'Repositorio', 'Personalización', 'Resumen'];
const KINDS = [
  { value: 'app', label: 'app — componente desplegable (se registra en el manifest)' },
  { value: 'lib', label: 'lib — librería (publica, no se despliega)' },
];
const FIELD_TYPES = [
  { value: 'select', label: 'select — el usuario elige entre opciones' },
  { value: 'fixed', label: 'fixed — valor fijo, no se pregunta' },
];

// "Nueva plantilla" wizard — registers an existing GitHub repo as a
// provisioning template. The API verifies (or flips) is_template and
// validates the Personalización fields schema.
export default function TemplateWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', display_name: '', description: '', kind: '', repo: '',
  });
  const [fields, setFields] = useState([]);
  const [draft, setDraft] = useState({ key: '', label: '', type: 'select', options: '', def: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addField = () => {
    const key = draft.key.trim();
    if (!/^[a-z][a-z0-9_]*$/.test(key) || !draft.label.trim()) return;
    const f = { key, label: draft.label.trim(), type: draft.type };
    if (draft.type === 'select') {
      f.options = draft.options.split(',').map((s) => s.trim()).filter(Boolean)
        .map((v) => ({ value: v, label: v }));
      if (!f.options.length) return;
      if (draft.def.trim()) f.default = draft.def.trim();
    } else {
      f.value = draft.def.trim();
    }
    setFields((fs) => [...fs.filter((x) => x.key !== key), f]);
    setDraft({ key: '', label: '', type: 'select', options: '', def: '' });
  };

  const stepOk = [
    form.name.trim() && form.display_name.trim() && form.kind,
    /^[\w.-]+\/[\w.-]+$/.test(form.repo.trim()),
    true,
    true,
  ];

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createTemplate({ ...form, fields });
      onCreated?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wiz" onClick={(e) => e.stopPropagation()}>
        <div className="wiz-cols">
          <aside className="wiz-side">
            <span className="wiz-kind">Component Management</span>
            <span className="wiz-tpl">Nueva plantilla</span>
            <div className="wiz-steps-v">
              {STEPS.map((label, i) => (
                <div key={label}
                  className={`wiz-stepv${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
                  <span className="wiz-num">{i < step ? '✓' : i + 1}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </aside>
          <div className="wiz-main">
            {error && <div className="alert-error">{error}</div>}

            {step === 0 && (
              <div className="form">
                <label className="field">
                  <span>Nombre técnico *</span>
                  <input value={form.name} placeholder="node-express-api-template"
                    onChange={set('name')} />
                  <small className="muted">kebab-case — es el identificador de la plantilla</small>
                </label>
                <label className="field">
                  <span>Nombre visible *</span>
                  <input value={form.display_name} placeholder="Node API (Express)"
                    onChange={set('display_name')} />
                </label>
                <label className="field">
                  <span>Tipo *</span>
                  <Select value={form.kind} placeholder="Tipo de componente"
                    onChange={(v) => setForm((f) => ({ ...f, kind: v }))}
                    options={KINDS} />
                </label>
                <label className="field">
                  <span>Descripción</span>
                  <textarea rows="3" value={form.description}
                    placeholder="Qué genera esta plantilla" onChange={set('description')} />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="form">
                <label className="field">
                  <span>Repositorio *</span>
                  <input value={form.repo} placeholder="progmise/node-express-api-template"
                    onChange={set('repo')} />
                  <small className="muted">
                    Debe existir en GitHub — si aún no es template repo, el API
                    lo marca automáticamente (is_template).
                  </small>
                </label>
              </div>
            )}

            {step === 2 && (
              <div className="form">
                <small className="muted">
                  Campos que el wizard de componentes pedirá al usar esta
                  plantilla (p. ej. <code>branch_strategy</code>). Podés dejarlo vacío.
                </small>
                {fields.map((f) => (
                  <div key={f.key} className="field-row" style={{ alignItems: 'center' }}>
                    <span className="chip">{f.key}</span>
                    <span className="muted" style={{ flex: 1, fontSize: 12 }}>
                      {f.label} · {f.type}
                      {f.type === 'select'
                        ? ` (${f.options.map((o) => o.value).join(' / ')})`
                        : ` = ${f.value}`}
                    </span>
                    <button type="button" className="btn-text btn-cancel"
                      onClick={() => setFields((fs) => fs.filter((x) => x.key !== f.key))}>✕</button>
                  </div>
                ))}
                <div className="field-row">
                  <label className="field"><span>Clave</span>
                    <input value={draft.key} placeholder="branch_strategy"
                      onChange={(e) => setDraft((d) => ({ ...d, key: e.target.value }))} />
                  </label>
                  <label className="field"><span>Etiqueta</span>
                    <input value={draft.label} placeholder="Estrategia de ramas"
                      onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))} />
                  </label>
                </div>
                <div className="field-row">
                  <label className="field"><span>Tipo</span>
                    <Select value={draft.type}
                      onChange={(v) => setDraft((d) => ({ ...d, type: v }))}
                      options={FIELD_TYPES} />
                  </label>
                  <label className="field">
                    <span>{draft.type === 'select' ? 'Opciones (separadas por coma)' : 'Valor fijo'}</span>
                    <input value={draft.type === 'select' ? draft.options : draft.def}
                      placeholder={draft.type === 'select' ? 'gitflow, trunk' : 'gitflow'}
                      onChange={(e) => setDraft((d) => draft.type === 'select'
                        ? { ...d, options: e.target.value } : { ...d, def: e.target.value })} />
                  </label>
                </div>
                {draft.type === 'select' && (
                  <label className="field"><span>Valor por defecto</span>
                    <input value={draft.def} placeholder="gitflow"
                      onChange={(e) => setDraft((d) => ({ ...d, def: e.target.value }))} />
                  </label>
                )}
                <button type="button" className="btn btn-outline" onClick={addField}
                  disabled={!draft.key.trim() || !draft.label.trim()}>
                  Agregar campo
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="summary">
                <table className="summary-table">
                  <tbody>
                    <tr><td>Nombre:</td><td><code>{form.name}</code></td></tr>
                    <tr><td>Visible:</td><td>{form.display_name}</td></tr>
                    <tr><td>Tipo:</td><td>{form.kind}</td></tr>
                    <tr><td>Repo:</td><td><code>{form.repo}</code></td></tr>
                    <tr><td>Descripción:</td><td>{form.description || '—'}</td></tr>
                    <tr><td>Campos:</td>
                      <td>{fields.length
                        ? fields.map((f) => f.key).join(', ') : '—'}</td></tr>
                  </tbody>
                </table>
                <p className="muted">
                  Al registrar, el API verifica el repo y lo marca como
                  template si todavía no lo es.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="wiz-foot">
          {step > 0
            ? <button className="btn-text btn-cancel" onClick={() => setStep(step - 1)}>Atrás</button>
            : <button className="btn-text btn-cancel" onClick={onClose}>Cancelar</button>}
          {step < 3
            ? <button className="btn-text btn-next" disabled={!stepOk[step]}
                onClick={() => setStep(step + 1)}>Siguiente</button>
            : <button className="btn-text btn-next" disabled={busy} onClick={submit}>
                {busy ? 'Registrando…' : 'Registrar plantilla'}
              </button>}
        </div>
      </div>
    </div>
  );
}
