import { requireAdmin, rpc, json } from '../_lib/auth.js';
let cache = { t: 0, d: null }; // 5초 캐시: 여러 탭이 봐도 Supabase 호출은 최소화 (관리자만 도달)

export async function onRequestGet({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: 'unauthorized' }, 401);
  if (cache.d && Date.now() - cache.t < 5000) return json(cache.d);

  const ping = async (name, path) => {
    const s = Date.now();
    try {
      const r = await fetch(env.SUPABASE_URL + path, { headers: { apikey: env.SUPABASE_ANON_KEY } });
      return { service: name, ok: r.status < 500, status: r.status, ms: Date.now() - s };
    } catch { return { service: name, ok: false, status: 0, ms: Date.now() - s }; }
  };
  const [rest, auth] = await Promise.all([ping('REST API', '/rest/v1/'), ping('Auth', '/auth/v1/health')]);

  // 서버 사용량: 관리자 토큰으로 core.admin_db_stats() 호출 (service_role 키 불필요)
  let db = {};
  try {
    const r = await rpc(env, admin.token, 'core', 'admin_db_stats');
    const d = await r.json();
    db = r.ok ? d : { error: d.message || r.status };
  } catch (e) { db = { error: String(e.message || e) }; }

  cache = { t: Date.now(), d: { services: [rest, auth], db } };
  return json(cache.d);
}
