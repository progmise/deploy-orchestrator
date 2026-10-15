import { useState } from 'react';
import { useSession } from '../application/useSession.js';
import { useDashboardData } from '../application/useDashboardData.js';
import { filter } from '../domain/component.js';
import { CenterCard, SearchRow } from '../ui/components/Feedback.jsx';
import { Ico, ICON } from '../ui/components/Icons.jsx';
import { Login, Unauthorized, UserMenu } from '../ui/features/session/Gate.jsx';
import ReleasesView from '../ui/features/releases/ReleasesView.jsx';
import ReleaseDetail from '../ui/features/releases/ReleaseDetail.jsx';
import { useReleases } from '../application/useReleases.js';
import ComponentsTable from '../ui/features/components/ComponentsTable.jsx';
import ComponentDetail from '../ui/features/components/ComponentDetail.jsx';
import ApplicationView from '../ui/features/app/ApplicationView.jsx';
import FiltersMenu from '../ui/features/components/FiltersMenu.jsx';
import DependencyGraph from '../ui/features/components/DependencyGraph.jsx';
import ComponentWizard from '../ui/features/components/ComponentWizard.jsx';
import TemplateGallery from '../ui/features/components/TemplateGallery.jsx';
import OrchRuns from '../ui/features/deployments/OrchRuns.jsx';
import MembersView from '../ui/features/team/MembersView.jsx';
import { useMembers } from '../application/useMembers.js';

const NAV = [
  { id: 'aplicacion', label: 'Aplicación', icon: ICON.logo },
  { id: 'componentes', label: 'Componentes', icon: ICON.componentes },
  { id: 'equipo', label: 'Equipo', icon: ICON.equipo },
  { id: 'despliegues', label: 'Despliegues', icon: ICON.despliegues },
  { id: 'releases', label: 'Releases', icon: ICON.releases },
];

export default function App() {
  const me = useSession();
  const { manifest, runs, deployments, catalog, templates, error,
    reloadCatalog, reloadTemplates } = useDashboardData(me);
  const [wizardTemplate, setWizardTemplate] = useState(null);
  const [view, setView] = useState('aplicacion');
  const [releaseNo, setReleaseNo] = useState(null);
  const [componentName, setComponentName] = useState(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState({ plantilla: '', estado: '' });
  const [collapsed, setCollapsed] = useState(false);
  const { members, reload: reloadMembers } = useMembers(view === 'equipo');
  const { releases, reload: reloadReleases } = useReleases(view === 'releases');

  if (me === undefined) return <CenterCard title="Deploy Orchestrator" sub="Cargando…" />;
  if (me?.forbidden) return <Unauthorized />;
  if (!me) return <Login />;
  if (error) return <CenterCard title="Deploy Orchestrator" sub={error} />;
  if (!manifest) return <CenterCard title="Deploy Orchestrator" sub="Cargando…" />;

  const viewLabel = view === 'nuevo-componente'
    ? 'Componentes / Nuevo componente'
    : view === 'release-detail'
      ? 'Releases / Detalle'
      : view === 'component-detail'
        ? 'Componentes / Detalles del componente'
      : NAV.find((n) => n.id === view)?.label || '';
  const lower = q.toLowerCase();

  return (
    <>
      <div className="topbar">
        <span className="logo">
          <Ico d={ICON.logo} />
          ORCHESTRATOR
        </span>
        <span className="title">{viewLabel}</span>
        <UserMenu user={me} />
      </div>
      <div className="crumbs">
        <a href="/">⌂</a><span className="sep">/</span>
        <a href="/">progmise</a><span className="sep">/</span>
        <a href="https://github.com/progmise/deploy-manifest" target="_blank" rel="noreferrer">deploy-manifest</a>
        <span className="sep">/</span>
        {view === 'release-detail' ? (
          <>
            <a onClick={() => { setView('releases'); reloadReleases(); }}>Releases</a>
            <span className="sep">/</span><span>Detalle</span>
          </>
        ) : view === 'component-detail' ? (
          <>
            <a onClick={() => { setView('componentes'); setQ(''); }}>Componentes</a>
            <span className="sep">/</span><span>{componentName}</span>
          </>
        ) : (
          <span>{viewLabel}</span>
        )}
        <span className="muted" style={{ marginLeft: 'auto' }}>
          release <code>v{manifest.version}</code>
        </span>
      </div>
      <div className="layout">
        <nav className={`sidebar${collapsed ? ' collapsed' : ''}`}>
          {NAV.map((n) => (
            <a key={n.id} className={view === n.id ? 'active' : ''} title={n.label}
               onClick={() => { setView(n.id); setQ(''); }}>
              <Ico d={n.icon} />{!collapsed && n.label}
            </a>
          ))}
          <button className="sidebar-toggle" onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}>{collapsed ? '›' : '‹'}</button>
        </nav>
        <div className="content">

          {view === 'releases' && (
            <ReleasesView releases={releases} me={me} onChanged={reloadReleases}
              onOpen={(n) => { setReleaseNo(n); setView('release-detail'); }} />
          )}

          {view === 'release-detail' && (
            <ReleaseDetail number={releaseNo} />
          )}

          {view === 'component-detail' && (
            <ComponentDetail name={componentName} templates={templates}
              manifest={manifest} onChanged={reloadCatalog} />
          )}

          {view === 'aplicacion' && (
            <ApplicationView manifest={manifest} />
          )}

          {view === 'componentes' && (
            <>
              <div className="card">
                <h2>Buscar componente</h2>
                <SearchRow q={q} setQ={setQ} placeholder="Mi componente favorito"
                  action={
                    <>
                      <FiltersMenu templates={templates} filters={filters} setFilters={setFilters} />
                      <button className="btn btn-primary" style={{ marginLeft: 'auto' }}
                        onClick={() => { setView('nuevo-componente'); setQ(''); }}>Nuevo componente +</button>
                    </>
                  } />
                <p className="muted" style={{ fontSize: 12, margin: '-8px 0 14px' }}>
                  Buscar por nombre, nombre corto o plantilla</p>
                <ComponentsTable manifest={manifest} catalog={catalog} templates={templates}
                  q={lower} filters={filters} onChanged={reloadCatalog}
                  onOpen={(n) => { setComponentName(n); setView('component-detail'); setQ(''); }} />
              </div>
              <div className="card">
                <h2>Grafo de dependencias</h2>
                <DependencyGraph components={manifest.components} />
              </div>
            </>
          )}

          {view === 'equipo' && (
            <MembersView members={members} onChanged={reloadMembers} />
          )}

          {view === 'nuevo-componente' && (
            <TemplateGallery templates={templates} onPick={setWizardTemplate}
              onChanged={reloadTemplates} />
          )}

          {view === 'despliegues' && (
            <div className="card">
              <h2>Despliegues orquestados</h2>
              <SearchRow q={q} setQ={setQ} placeholder="Buscar run…" />
              <OrchRuns runs={filter(runs, lower, ['display_title'])}
                deployments={deployments} />
            </div>
          )}

        </div>
      </div>
      {wizardTemplate && (
        <ComponentWizard template={wizardTemplate}
          onClose={() => setWizardTemplate(null)}
          onBack={() => setWizardTemplate(null)}
          onCreated={reloadCatalog} />
      )}
    </>
  );
}
