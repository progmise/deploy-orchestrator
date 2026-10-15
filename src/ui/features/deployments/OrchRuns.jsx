import { RunBadge } from '../../components/Feedback.jsx';

// Each orchestrated run deploys a whole manifest release to one
// environment — the registry join (by run_id) recovers which one.
export default function OrchRuns({ runs, deployments = [] }) {
  const byRun = new Map(deployments.map((d) => [d.run_id, d]));
  return (
    <table>
      <thead>
        <tr><th>Run</th><th>Release</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr>
      </thead>
      <tbody>
        {runs.map((r) => {
          const dep = byRun.get(r.id);
          return (
            <tr key={r.id}>
              <td>{r.display_title || `#${r.run_number}`}</td>
              <td>{dep
                ? <>{dep.release_no} <span className="muted">v{dep.version} → {dep.environment}</span></>
                : <span className="muted">—</span>}</td>
              <td><RunBadge conclusion={r.conclusion} status={r.status} /></td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
              <td><a href={r.html_url} target="_blank" rel="noreferrer">↗</a></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
