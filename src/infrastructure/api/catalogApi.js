// Component catalog — Supabase-backed, exposed by the API.
import { apiGet, apiSend } from './client.js';

export function getTemplates() {
  return apiGet('/api/templates');
}

export function getComponents() {
  return apiGet('/api/components');
}

export function getComponent(name) {
  return apiGet(`/api/components/${encodeURIComponent(name)}`);
}

export function createComponent(body) {
  return apiSend('/api/components', 'POST', body);
}

export function retryProvision(name) {
  return apiSend(`/api/components/${encodeURIComponent(name)}/provision`, 'POST');
}

export function getMembers() {
  return apiGet('/api/members');
}

export function createMember(body) {
  return apiSend('/api/members', 'POST', body);
}

// Release registry — RLSE records backed by the API; publish/deploy run
// server-side (the browser never touches GitHub for them).
export function getReleases() {
  return apiGet('/api/releases');
}

export function getReleaseOptions() {
  return apiGet('/api/releases/options');
}

export function createRelease(body) {
  return apiSend('/api/releases', 'POST', body);
}

export function getRelease(number) {
  return apiGet(`/api/releases/${number}`);
}

export function publishRelease(number) {
  return apiSend(`/api/releases/${number}/publish`, 'POST');
}

export function deployRelease(number, environment) {
  return apiSend(`/api/releases/${number}/deploy`, 'POST', { environment });
}

// Per-environment deployment records — joined to GitHub runs by run_id.
export function getDeployments() {
  return apiGet('/api/deployments');
}
