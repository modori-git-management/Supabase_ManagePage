export const json = (d, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json' } });

// 토큰으로 Supabase에 사용자 확인 → app_metadata.role === 'admin' 이어야 통과
export async function requireAdmin(request, env) {
  const t = (request.headers.get('Authorization') || '').replace('Bearer ', '');
  if (!t) return null;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${t}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u.app_metadata?.role === 'admin' ? u : null;
}
