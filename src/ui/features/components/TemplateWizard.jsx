import { useEffect, useState } from 'react';
import { createTemplate, getPlatformKeys } from '../../../infrastructure/api/catalogApi.js';
import Select from '../../components/Select.jsx';
import { Ico, ICON } from '../../components/Icons.jsx';

const STEPS = ['Identificación', 'Repositorio', 'Personalización', 'Provisioning', 'Resumen'];
const KINDS = [
  { value: 'app', label: 'app — componente desplegable (se registra en el manifest)' },
  { value: 'lib', label: 'lib — librería (publica, no se despliega)' },
  { value: 'cm', label: 'cm — configmap de un componente (env vars → Vercel)' },
  { value: 'secrets', label: 'secrets — secrets de un componente (Vault → Vercel sensitive)' },
];
const FIELD_TYPES = [
  { value: 'select', label: 'select — el usuario elige entre opciones' },
  { value: 'fixed', label: 'fixed — valor fijo, no se pregunta' },
  { value: 'component', label: 'component — elige un componente existente' },
];
const REPO_MODES = [
  { value: 'existing', label: 'Repo existente' },
  { value: 'generate', label: 'Generar desde plantilla base' },
];
// Defaults mirrored from the API's SPECS — the pick prefills the
// provisioning toggles, which stay editable.
const DEFAULT_SPEC = {
  app: {
    manifest: true,
    secrets: ['VERCEL_TOKEN', 'DOCKER_TOKEN', 'ORCHESTRATOR_TOKEN', 'GRAFANA_OTLP_AUTH'],
    vars: ['VERCEL_ORG_ID', 'VERCEL_PROJECT_ID', 'DOCKER_USERNAME', 'DEPLOY_ENVIRONMENTS',
      'GRAFANA_OTLP_ENDPOINT'],
  },
  lib: {
    manifest: false,
    secrets: ['SONATYPE_USERNAME', 'SONATYPE_TOKEN', 'GPG_PRIVATE_KEY', 'GPG_PASSPHRASE',
      'GRAFANA_OTLP_AUTH'],
    vars: ['GRAFANA_OTLP_ENDPOINT'],
  },
  cm: {
    manifest: true,
    secrets: ['VERCEL_TOKEN'],
    vars: ['VERCEL_ORG_ID'],
  },
  secrets: {
    manifest: true,
    secrets: ['VERCEL_TOKEN', 'SUPABASE_SERVICE_ROLE_KEY'],
    vars: ['VERCEL_ORG_ID', 'SUPABASE_URL'],
  },
};

// "Nueva plantilla" wizard — registers a provisioning template: verifies
// (or generates) the GitHub repo, declares the Personalización fields,
// and writes a self-describing provisioning spec (secrets/vars/manifest).
export default function TemplateWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: '', display_name: '', description: '', kind: '',
    repo: '', repo_mode: 'existing', generate_from: '',
  });
  const [fields, setFields] = useState([]);
  const [spec, setSpec] = useState(null);
  const [keys, setKeys] = useState({ vars: [], secrets: [] });
  const [draft, setDraft] = useState({ key: '', label: '', type: 'select', options: '', def: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getPlatformKeys().then(setKeys).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pickKind = (v) => {
    setForm((f) => ({ ...f, kind: v }));
    if (!spec) setSpec(DEFAULT_SPEC[v]);
  };
  const toggleKey = (list, k) => setSpec((s) => ({
    ...s,
    [list]: s[list].includes(k) ? s[list].filter((x) => x !== k) : [...s[list], k],
  }));

  const addField = () => {
    const key = draft.key.trim();
    if (!/^[a-z][a-z0-9_]*$/.test(key) || !draft.label.trim()) return;
    const f = { key, label: draft.label.trim(), type: draft.type };
    if (draft.type === 'select') {
      f.options = draft.options.split(',').map((s) => s.trim()).filter(Boolean)
        .map((v) => ({ value: v, label: v }));
      if (!f.options.length) return;
      if (draft.def.trim()) f.default = draft.def.trim();
    } else if (draft.type === 'fixed') {
      f.value = draft.def.trim();
    }
    setFields((fs) => [...fs.filter((x) => x.key !== key), f]);
    setDraft({ key: '', label: '', type: 'select', options: '', def: '' });
  };

  const stepOk = [
    form.name.trim() && form.display_name.trim() && form.kind,
    /^[\w.-]+\/[\w.-]+$/.test(form.repo.trim())
      && (form.repo_mode === 'existing' || /^[\w.-]+\/[\w.-]+$/.test(form.generate_from.trim())),
    true,
    true,
    true,
  ];

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createTemplate({
        ...form, fields, spec,
        generate_from: form.repo_mode === 'generate' ? form.generate_from : undefined,
      });
      onCreated?.();
      onClose();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  const toggleGroup = (label, list, names) => (
    <div className="field">
      <span>{label}</span>
      <span className="chips">
        {names.map((k) => (
          <button key={k} type="button"
            className={`chip role-toggle${spec?.[list]?.includes(k) ? ' role-developer on' : ''}`}
            onClick={() => toggleKey(list, k)}>{k}</button>
        ))}
        {!names.length && <span className="muted">Sin claves registradas</span>}
      </span>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wiz" onClick={(e) => e.stopPropagation()}>
        <div className="wiz-cols">
          <aside className="wiz-side">
            <span className="wiz-kind">Component Management</span>
            <div className="wiz-tpl">Nueva plantilla</div>
            <a className="chip tpl-doc"
              href="https://github.com/progmise/deploy-orchestrator-api#readme"
              target="_blank" rel="noreferrer">
              <Ico d={ICON.doc} />Documentación ↗</a>
            <div className="wiz-steps-v">
              {STEPS.map((label, i) => (
                <span key={label}
                  className={`wiz-stepv${i === step ? ' active' : ''}${i < step ? ' done' : ''}`}>
                  <span className="n">{i < step ? '✓' : i + 1}</span>{label}
                </span>
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
                    onChange={pickKind} options={KINDS} />
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
                  <span>Origen del repo *</span>
                  <Select value={form.repo_mode}
                    onChange={(v) => setForm((f) => ({ ...f, repo_mode: v }))}
                    options={REPO_MODES} />
                </label>
                <label className="field">
                  <span>Repositorio *</span>
                  <input value={form.repo} placeholder="progmise/node-express-api-template"
                    onChange={set('repo')} />
                  <small className="muted">
                    {form.repo_mode === 'existing'
                      ? 'Debe existir en GitHub — si aún no es template repo, el API lo marca automáticamente (is_template).'
                      : 'Nombre del repo a crear — se genera desde la base y queda template-enabled.'}
                  </small>
                </label>
                {form.repo_mode === 'generate' && (
                  <label className="field">
                    <span>Plantilla base *</span>
                    <input value={form.generate_from} placeholder="progmise/template-skeleton"
                      onChange={set('generate_from')} />
                    <small className="muted">
                      Repo con is_template del que se genera la estructura inicial.
                    </small>
                  </label>
                )}
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
                        : f.type === 'fixed'
                          ? ` = ${f.value}`
                          : ' (del catálogo)'}
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
                  {draft.type !== 'component' && (
                    <label className="field">
                      <span>{draft.type === 'select' ? 'Opciones (separadas por coma)' : 'Valor fijo'}</span>
                      <input value={draft.type === 'select' ? draft.options : draft.def}
                        placeholder={draft.type === 'select' ? 'gitflow, trunk' : 'gitflow'}
                        onChange={(e) => setDraft((d) => draft.type === 'select'
                          ? { ...d, options: e.target.value } : { ...d, def: e.target.value })} />
                    </label>
                  )}
                </div>
                {draft.type === 'component' && (
                  <small className="muted">
                    El wizard de componentes lo renderiza como un selector de
                    componentes del catálogo (p. ej. <code>configures</code> —
                    el componente que configura este ConfigMap).
                  </small>
                )}
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
              <div className="form">
                <small className="muted">
                  Qué escribe el provisioner en cada repo generado con esta
                  plantilla. Los nombres salen del credential store de la
                  plataforma — los valores nunca se muestran.
                </small>
                <div className="field">
                  <span>Registro en el manifest</span>
                  <span className="chips">
                    <button type="button"
                      className={`chip role-toggle${spec?.manifest ? ' role-developer on' : ''}`}
                      onClick={() => setSpec((s) => ({ ...s, manifest: !s?.manifest }))}>
                      Registrar en deploy-manifest
                    </button>
                  </span>
                  <small className="muted">
                    Componentes desplegables sí; librerías publicables no.
                  </small>
                </div>
                {toggleGroup('Secrets a escribir', 'secrets', keys.secrets)}
                {toggleGroup('Variables a escribir', 'vars', keys.vars)}
              </div>
            )}

            {step === 4 && (
              <div className="summary">
                <table className="summary-table">
                  <tbody>
                    <tr><td>Nombre:</td><td><code>{form.name}</code></td></tr>
                    <tr><td>Visible:</td><td>{form.display_name}</td></tr>
                    <tr><td>Tipo:</td><td>{form.kind}</td></tr>
                    <tr><td>Repo:</td><td><code>{form.repo}</code></td></tr>
                    {form.repo_mode === 'generate' && (
                      <tr><td>Generado desde:</td><td><code>{form.generate_from}</code></td></tr>
                    )}
                    <tr><td>Descripción:</td><td>{form.description || '—'}</td></tr>
                    <tr><td>Campos:</td>
                      <td>{fields.length ? fields.map((f) => f.key).join(', ') : '—'}</td></tr>
                    <tr><td>Manifest:</td><td>{spec?.manifest ? 'sí' : 'no'}</td></tr>
                    <tr><td>Secrets:</td><td>{spec?.secrets?.join(', ') || '—'}</td></tr>
                    <tr><td>Variables:</td><td>{spec?.vars?.join(', ') || '—'}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="wiz-foot">
          {step > 0
            ? <button className="btn-text btn-cancel" onClick={() => setStep(step - 1)}>Atrás</button>
            : <button className="btn-text btn-cancel" onClick={onClose}>Cancelar</button>}
          {step < 4
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
