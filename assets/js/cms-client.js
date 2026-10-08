import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';
const SESSION_KEY = 'sanjuan-admin-session';
export const configured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
export function session() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
export function saveSession(value) { localStorage.setItem(SESSION_KEY, JSON.stringify(value)); }
export function clearSession() { localStorage.removeItem(SESSION_KEY); }
export async function api(path, { method='GET', body, token, headers={} }={}) {
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}${path}`, {
    method, headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token || SUPABASE_PUBLISHABLE_KEY}`, ...(body instanceof Blob ? {'Content-Type':body.type || 'application/octet-stream'} : body ? {'Content-Type':'application/json'} : {}), ...headers },
    body: body == null ? undefined : body instanceof Blob ? body : JSON.stringify(body)
  });
  const text = await response.text();
  let data; try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.hint || `Supabase respondió ${response.status}`);
  return data;
}
export async function readContent() {
  if (!configured) return null;
  const rows = await api('/rest/v1/site_content?select=content&id=eq.1');
  return rows?.[0]?.content || null;
}
export async function writeContent(content, user) {
  return api('/rest/v1/site_content?on_conflict=id', {method:'POST', token:user.access_token, body:{id:1, content}, headers:{Prefer:'resolution=merge-duplicates,return=minimal'}});
}
export async function uploadImage(file, user) {
  if (!file.type.startsWith('image/')) throw new Error('Selecciona un archivo de imagen.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 8 MB.');
  const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g,'-');
  const path = `${user.id}/${Date.now()}-${safeName}`;
  await api(`/storage/v1/object/site-images/${path}`, {method:'POST', token:user.access_token, body:file, headers:{'x-upsert':'false'}});
  return `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/site-images/${path}`;
}
