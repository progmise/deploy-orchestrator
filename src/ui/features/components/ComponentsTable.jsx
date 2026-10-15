import { useEffect, useState } from 'react';
import { mergeCatalog } from '../../../domain/component.js';
import { retryProvision } from '../../../infrastructure/api/catalogApi.js';
import { StatusPill } from '../../components/Feedback.jsx';
import { GhIcon, PrIcon } from '../../components/Icons.jsx';

const dateOnly = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');

// Sortable columns — keys map to a value extractor (missing values last).
const COLUMNS = [
  { key: 'name', label: 'Nombre', value: (c) => c.name },
  { key: 'shortname', label: 'Nombre corto', value: (c) => c.db?.shortname },
  { key: 'plantilla', label: 'Plantilla', value: (c) => c._tpl },
  { key: 'creado', label: 'Creado', value: (c) => c.db?.created_at },
  { key: 'herramientas', label: 'Herramientas' },           // icons — not sortable
  { key: 'estado', label: 'Estado', value: (c) => c.db?.status },
];

export default function ComponentsTable({ manifest, catalog, templates = [], q, filters, onChanged, onOpen }) {
  const [sort, setSort] = useState({ key: 'name', dir: 1 });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const tplName = (t) => templates.find((x) => x.name === t)?.display_name || t;
  const kindOf = (name) => templates.find((t) => t.name === name)?.kind;

  const rows = mergeCatalog(manifest.components, catalog)
    .map((c) => ({ ...c, _tpl: c.db ? tplName(c.db.template) : '' }))
    .filter((c) => (!q
      || c.name.toLowerCase().includes(q)
      || c.repo.toLowerCase().includes(q)
      || (c.db?.shortname || '').toLowerCase().includes(q)
      || (c.db?.template || '').toLowerCase().includes(q))
      && (!filters.plantilla || c.db?.template === filters.plantilla)
      && (!filters.estado || c.db?.status === filters.estado));

  if (sort.key && COLUMNS.find((c) => c.key === sort.key)?.value) {
    const value = COLUMNS.find((c) => c.key === sort.key).value;
    rows.sort((a, b) => {
      const va = value(a), vb = value(b);
      if (!va) return 1;
      if (!vb) return -1;
      return String(va).localeCompare(String(vb)) * sort.dir;
    });
  }

  const cycle = (key) => setSort((s) =>
    s.key !== key ? { key, dir: 1 } : s.dir === 1 ? { key, dir: -1 } : { key: null, dir: 1 });
  const arrow = (key) =>
    sort.key !== key ? ' ⇅' : sort.dir === 1 ? ' ↑' : ' ↓';

  // Reset to page 1 whenever the visible set changes (search/filters/size).
  // oxlint-disable-next-line react-hooks/set-state-in-effect — deliberate reset
  useEffect(() => setPage(1), [q, filters, pageSize]);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pages);
  const visible = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const from = rows.length ? (safePage - 1) * pageSize + 1 : 0;
  const to = (safePage - 1) * pageSize + visible.length;

  return (
    <>
      <p className="tbl-legend">Visualización de los componentes</p>
      <table>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th key={c.key}
                className={c.value ? 'th-sort' : ''}
                onClick={c.value ? () => cycle(c.key) : undefined}>
                {c.label}{c.value && <span className="sort-arrow">{arrow(c.key)}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((c) => {
            const kind = c.db ? kindOf(c.db.template) : 'app';
            return (
              <tr key={c.name}>
                <td><button className="linklike" onClick={() => onOpen(c.name)}><strong>{c.name}</strong></button></td>
                <td><code>{c.db?.shortname || '—'}</code></td>
                <td>{c.db
                  ? <>{c._tpl}{' '}
                      <span className={`chip${kind === 'lib' ? '' : ' chip-teal'}`}>{kind || '?'}</span></>
                  : <span className="muted">—</span>}</td>
                <td><span className="muted">{dateOnly(c.db?.created_at)}</span></td>
                <td><span className="tools">
                  <a href={`https://github.com/${c.repo}`} target="_blank" rel="noreferrer"
                     title={c.repo}>{GhIcon}</a>
                  {c.db?.manifest_pr &&
                    <a href={`https://github.com/progmise/deploy-manifest/pull/${c.db.manifest_pr}`}
                       target="_blank" rel="noreferrer"
                       title={`PR de registro #${c.db.manifest_pr}`}>{PrIcon}</a>}
                </span></td>
                <td>{c.db
                  ? <>
                      <StatusPill status={c.db.status} />
                      {c.db.status === 'failed' &&
                        <button className="btn btn-outline" style={{ padding: '2px 10px', marginLeft: 8 }}
                          title="Reintentar provisioning"
                          onClick={() => retryProvision(c.name).then(onChanged).catch(onChanged)}>↻</button>}
                    </>
                  : <span className="muted">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length && <p className="muted">Sin componentes para ese filtro.</p>}
      <div className="tbl-foot">
        <select className="page-size" value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}>
          {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="pager">
          <span className="muted">{from} a {to} de {rows.length} Elementos</span>
          <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>‹ Ant</button>
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={p === safePage ? 'active' : ''}
              onClick={() => setPage(p)}>{p}</button>
          ))}
          <button disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>Sig ›</button>
        </span>
      </div>
    </>
  );
}
