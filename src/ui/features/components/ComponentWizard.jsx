import { useState } from 'react';
import { NAME_RE, REPO_RE, SHORTNAME_RE, STATUS_LABEL, shortnameFor,
  defaultConfig, configLabel } from '../../../domain/component.js';
import { createComponent, retryProvision } from '../../../infrastructure/api/catalogApi.js';
import { StatusPill } from '../../components/Feedback.jsx';
import { Ico, ICON } from '../../components/Icons.jsx';

const STEPS = [
  'Información del componente',
  'Personalización del componente',
  'Resumen de confirmación',
];

const KIND_BADGE = { lib: 'LIB', cm: 'CM' };

export default function ComponentWizard({ template, components = [], onClose, onBack, onCreated }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', shortname: '', repo: '', description: '' });
  const [config, setConfig] = useState(() => defaultConfig(template.fields));
  const [repoTouched, setRepoTouched] = useState(false);
  const [shortTouched, setShortTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const repoName = repoTouched ? form.repo : form.name;
  const shortname = shortTouched ? form.shortname : shortnameFor(form.name);
  const nameOk = NAME_RE.test(form.name);
  const repoOk = REPO_RE.test(repoName);
  const shortOk = SHORTNAME_RE.test(shortname);
  const descOk = form.description.trim().length > 0;
  const fieldsOk = (template.fields || [])
    .every((f) => f.type !== 'component' || config[f.key]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const c = await createComponent({
        ...form, shortname, repo: repoName, template: template.name, config,
      });
      setResult(c);
      onCreated?.(c);
    } catch (e) {
      setResult(e.component || null);
      setError(e.message);
      onCreated?.(e.component);
    }
    setBusy(false);
  };

  const retry = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await retryProvision(result.name));
      onCreated?.(result);
    } catch (e) {
      setError(e.message);
      if (e.component) setResult(e.component);
    }
    setBusy(false);
  };

  const stepOf = (i) =>
    `wiz-stepv${result || step > i ? ' done' : step === i ? ' active' : ''}`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wiz" onClick={(e) => e.stopPropagation()}>
        <div className="wiz-cols">
          <aside className="wiz-side">
            <span className="wiz-kind">{KIND_BADGE[template.kind] || 'API'}</span>
            <div className="wiz-tpl">{template.display_name || template.name}</div>
            <a className="chip tpl-doc" href={`https://github.com/${template.repo}#readme`}
              target="_blank" rel="noreferrer">
              <Ico d={ICON.doc} />Documentación ↗</a>
            <div className="wiz-steps-v">
              {STEPS.map((l, i) => (
                <span key={l} className={stepOf(i)}>
                  <span className="n">{result || step > i ? '✓' : i + 1}</span>{l}
                </span>
              ))}
            </div>
          </aside>

          <div className="wiz-main">
            {error && <div className="alert-error">{error}</div>}

            {!result && step === 0 && (
              <div className="form">
                <label className="field">
                  <span>Nombre del componente *</span>
                  <input value={form.name} placeholder="ejemplo: awesome-component"
                    onChange={(e) => setField('name', e.target.value.toLowerCase())} />
                  <small className="muted">Nombre único del componente</small>
                </label>
                <label className="field">
                  <span>Introduzca un nombre corto para el componente *</span>
                  <input value={shortname} placeholder="EJEMPLO: AWSMCOM1"
                    onChange={(e) => { setShortTouched(true); setField('shortname', e.target.value.toUpperCase()); }} />
                  <small className="muted">Los nombres cortos sólo pueden contener letras mayúsculas y dígitos</small>
                </label>
                <label className="field">
                  <span>Descripción *</span>
                  <textarea rows="3" value={form.description}
                    onChange={(e) => setField('description', e.target.value)} />
                  <small className="muted">Descripción funcional del componente</small>
                </label>
                <label className="field">
                  <span>Nombre del repositorio *</span>
                  <input value={repoName} placeholder="ejemplo: mi-repositorio"
                    onChange={(e) => { setRepoTouched(true); setField('repo', e.target.value); }} />
                  <small className="muted">progmise/{repoName || '…'} — nombre único del repositorio</small>
                </label>
              </div>
            )}

            {!result && step === 1 && (
              <div className="form">
                {(template.fields || []).map((f) => (
                  <label key={f.key} className="field">
                    <span>{f.label}{f.required === false ? '' : ''}</span>
                    {f.type === 'component'
                      ? <select value={config[f.key] ?? ''}
                          onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}>
                          <option value="" disabled>Seleccionar componente…</option>
                          {components.map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      : f.type === 'select'
                        ? <select value={config[f.key] ?? f.default}
                            onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}>
                            {(f.options || []).map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        : <input value={f.value} readOnly disabled />}
                    {f.key === 'branch_strategy' && (
                      <small className="muted">
                        {config[f.key] === 'trunk'
                          ? 'Se crea solo main protegida'
                          : 'Se crean main y development protegidas (development = default)'}
                      </small>
                    )}
                  </label>
                ))}
              </div>
            )}

            {!result && step === 2 && (
              <div className="summary">
                <table className="summary-table">
                  <tbody>
                    <tr><td>Nombre de componente:</td><td><strong>{form.name}</strong></td></tr>
                    <tr><td>Introduzca un nombre corto para el componente:</td><td><code>{shortname}</code></td></tr>
                    <tr><td>Descripción:</td><td>{form.description}</td></tr>
                    <tr><td>Nombre del repositorio:</td><td>progmise/{repoName}</td></tr>
                    {(template.fields || []).map((f) => (
                      <tr key={f.key}>
                        <td>{f.label}:</td>
                        <td>{f.type === 'select' ? configLabel(template.fields, f.key, config[f.key])
                          : f.type === 'fixed' ? f.value : config[f.key] || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="muted">
                  Se generará el repositorio desde la plantilla
                  {config.branch_strategy === 'trunk'
                    ? ' con main protegida'
                    : ' con main y development protegidas'}
                  , se configurarán secrets/variables
                  {(template.spec?.manifest ?? template.kind === 'app')
                    && ' y se abrirá un PR de registro en deploy-manifest'}.
                </p>
              </div>
            )}

            {result && (
              <div className="result">
                <p><StatusPill status={result.status} /></p>
                <p>
                  <a href={`https://github.com/${result.repo}`} target="_blank" rel="noreferrer">
                    {result.repo} ↗
                  </a>
                  {result.manifest_pr
                    ? <> · <a href={`https://github.com/progmise/deploy-manifest/pull/${result.manifest_pr}`}
                          target="_blank" rel="noreferrer">PR #{result.manifest_pr} ↗</a></>
                    : null}
                </p>
                <ol className="prov-log">
                  {(result.provision_log || []).map((e, i) => (
                    <li key={i} className={e.ok ? '' : 'log-fail'}>
                      {STATUS_LABEL[e.step] || e.step} {!e.ok && `— ${e.error}`}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </div>

        <div className="wiz-foot">
          {!result && (step > 0
            ? <button className="btn-text btn-cancel" onClick={() => setStep(step - 1)}>Atrás</button>
            : <button className="btn-text btn-cancel" onClick={onBack}>Cancelar</button>)}
          {result && <span />}
          {result
            ? result.status === 'failed'
              ? <button className="btn-text btn-next" disabled={busy} onClick={retry}>
                  {busy ? 'Reintentando…' : 'Reintentar'}
                </button>
              : <button className="btn-text btn-next" onClick={onClose}>Listo</button>
            : step < 2
              ? <button className="btn-text btn-next"
                  disabled={(step === 0 && (!nameOk || !repoOk || !shortOk || !descOk))
                    || (step === 1 && !fieldsOk)}
                  onClick={() => setStep(step + 1)}>Siguiente</button>
              : <button className="btn-text btn-next" disabled={busy} onClick={submit}>
                  {busy ? 'Creando…' : 'Crear componente'}
                </button>}
        </div>
      </div>
    </div>
  );
}
