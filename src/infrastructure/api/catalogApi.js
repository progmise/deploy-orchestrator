// Component catalog — Supabase-backed, exposed by the API.
import { apiGet, apiSend } from './client.js';

export function getTemplates() {
  return apiGet('/api/templates');
}

export function createTemplate(body) {
  return apiSend('/api/templates', 'POST', body);
}

// Credential key names the template wizard offers as provisioning toggles
// (names only — values never leave the store).
export function getPlatformKeys() {
  return apiGet('/api/platform/keys');
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

// Application secrets registry (Seguridad view) — names only; values are
// write-only via POST. Environment access is role-gated server-side.
export function getSecrets(environment) {
  return apiGet(`/api/secrets?environment=${encodeURIComponent(environment)}`);
}

export function putSecret(body) {
  return apiSend('/api/secrets', 'POST', body);
}
