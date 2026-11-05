export const json = (d, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

// Supabase RPC 호출 (로그인한 사용자의 토큰으로 호출 → DB의 관리자 확인이 그대로 적용됨)
export function rpc(env, token, schema, fn, args = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Profile': schema,
      'content-type': 'application/json',
    },
    body: JSON.stringify(args),
  });
}

// 토큰으로 DB에 직접 물어봄: core.am_i_admin() (core.admins 테이블 기준)
// 통과하면 { token }, 아니면 null
export async function requireAdmin(request, env) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try {
    const r = await rpc(env, token, 'core', 'am_i_admin');
    if (!r.ok) return null; // 토큰이 잘못됐거나 만료됨
    return (await r.json()) === true ? { token } : null;
  } catch {
    return null;
  }
}
