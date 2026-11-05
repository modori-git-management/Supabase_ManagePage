import { requireAdmin, json } from '../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  if (!(await requireAdmin(request, env))) return json({ error: 'unauthorized' }, 401);
  const { to, subject, body } = await request.json();
  if (!to || !subject || !body) return json({ error: '받는사람/제목/내용을 입력하세요' }, 400);

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [to], subject, text: body }),
  });
  await fetch(env.SUPABASE_URL + '/rest/v1/email_logs', {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ to_addr: to, subject, status: r.ok ? 'sent' : 'failed' }),
  });
  return r.ok ? json({ ok: true }) : json({ error: '발송 실패 (' + r.status + ')' }, 502);
}
