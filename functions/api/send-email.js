import { requireAdmin, rpc, json } from '../_lib/auth.js';

const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) return json({ error: 'unauthorized' }, 401);

  let b;
  try { b = await request.json(); } catch { return json({ error: '요청 형식이 잘못됐어요' }, 400); }
  const to = String(b.to || '').trim(), subject = String(b.subject || '').trim(), body = String(b.body || '').trim();
  if (!to || !subject || !body) return json({ error: '받는사람/제목/내용을 입력하세요' }, 400);
  if (!EMAIL.test(to) || to.length > 320) return json({ error: '받는 사람 이메일 형식을 확인하세요' }, 400);
  if (subject.length > 200) return json({ error: '제목은 200자 이내로 입력하세요' }, 400);
  if (!env.RESEND_API_KEY || !env.MAIL_FROM) return json({ error: '서버에 RESEND_API_KEY / MAIL_FROM이 설정되지 않았어요' }, 500);

  let ok = false, status = 0, detail = '';
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text: body }),
    });
    ok = r.ok; status = r.status;
    if (!ok) detail = (await r.json().catch(() => ({}))).message || '';
  } catch (e) { detail = String(e.message || e); }

  // 결과를 core.email_logs에 기록 (관리자 토큰으로 core.admin_log_email 호출)
  let logged = true;
  try {
    const r = await rpc(env, admin.token, 'core', 'admin_log_email',
      { p_to: to, p_subject: subject, p_status: ok ? 'sent' : 'failed' });
    logged = r.ok;
  } catch { logged = false; }

  if (!ok) return json({ error: `발송 실패 (${status || '연결 오류'})${detail ? ': ' + detail : ''}` }, 502);
  return json({ ok: true, logged });
}
