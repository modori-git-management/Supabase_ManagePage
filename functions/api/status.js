import { requireAdmin, json } from '../_lib/auth.js';
let cache = { t: 0, d: null }; // 5초 캐시: 여러 탭이 봐도 Supabase 호출은 최소화

export async function onRequestGet({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
  if (Date.now() - cache.t < 5000) return json(cache.d);

  const ping = async (name, path) => {
    const s = Date.now();
    try {
      const r = await fetch(env.SUPABASE_URL + path, { headers: { apikey: env.SUPABASE_ANON_KEY } });
      return { service: name, ok: r.status < 500, status: r.status, ms: Date.now() - s };
    } catch { return { service: name, ok: false, status: 0, ms: Date.now() - s }; }
  };
  const [rest, auth] = await Promise.all([ping('REST API', '/rest/v1/'), ping('Auth', '/auth/v1/health')]);

  let db = {};
  try {
    const r = await fetch(env.SUPABASE_URL + '/rest/v1/rpc/admin_db_stats', {
      method: 'POST',
      headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'content-type': 'application/json' },
      body: '{}',
    });
    db = await r.json();
  } catch {}
  cache = { t: Date.now(), d: { services: [rest, auth], db } };
  return json(cache.d);
}
