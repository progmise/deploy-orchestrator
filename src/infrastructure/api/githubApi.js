// GitHub reads proxied by the backend (/api/gh/*) + the rendered manifest.
import * as yaml from 'js-yaml';
import { apiGet } from './client.js';

const MANIFEST_REPO = 'progmise/deploy-manifest';

export function getRepo(repo = MANIFEST_REPO) {
  return apiGet(`/api/gh/repos/${repo}`);
}

export async function getManifest() {
  const text = await (await fetch('/api/manifest')).text();
  return yaml.load(text);
}

export function getOrchRuns() {
  return apiGet(
    `/api/gh/repos/${MANIFEST_REPO}/actions/workflows/deploy.yml/runs?per_page=10`,
  ).then((d) => d.workflow_runs);
}

export function getComponentRuns(repo, workflow = 'deploy.yml') {
  return apiGet(
    `/api/gh/repos/${repo}/actions/workflows/${workflow}/runs?per_page=5`,
  ).then((d) => d.workflow_runs);
}
