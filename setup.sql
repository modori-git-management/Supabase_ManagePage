-- 관리자 콘솔 추가분 (Supabase SQL Editor에서 실행. 여러 번 실행해도 안전)
--
-- 이전에 적용한 것(core.email_logs, core.admin_db_stats, core.admin_list_email_logs,
-- stu.admin_list_ranking, stu.admin_list_reports, 21일 자동 삭제)은 이미 DB에 있으므로 다시 만들지 않습니다.
-- 관리자 판별은 core.admins 테이블 하나만 사용합니다. (app_metadata.role 방식은 쓰지 않음)
-- 관리자 추가:  insert into core.admins(user_id, scope) select id, '*' from auth.users where lower(email)=lower('이메일');
-- 관리자 삭제:  delete from core.admins where user_id = (select id from auth.users where lower(email)=lower('이메일'));

-- 1) 콘솔 입장 확인: 로그인한 사용자가 전체 관리자(scope '*')인지 true/false로 반환
create or replace function core.am_i_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, core
as $$
  select auth.uid() is not null and core_private.is_admin()
$$;

revoke execute on function core.am_i_admin() from public, anon;
grant  execute on function core.am_i_admin() to authenticated;

-- 2) 이메일 발송 기록 저장 (관리자 로그인 토큰으로 호출, service_role 키 불필요)
--    core.email_logs는 직접 접근이 막혀 있으므로 이 함수로만 기록합니다.
create or replace function core.admin_log_email(
  p_to text, p_subject text, p_status text, p_service text default null)
returns void
language plpgsql
security definer
set search_path = pg_catalog, core
as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요해요.' using errcode = '28000'; end if;
  if not core_private.is_admin() then raise exception '운영자만 쓸 수 있어요.'; end if;
  if p_status not in ('sent', 'failed') then raise exception 'status는 sent 또는 failed여야 해요.'; end if;
  insert into core.email_logs (service, to_addr, subject, status)
  values (nullif(p_service, ''), left(coalesce(p_to, ''), 320), left(p_subject, 200), p_status);
end $$;

revoke execute on function core.admin_log_email(text, text, text, text) from public, anon;
grant  execute on function core.admin_log_email(text, text, text, text) to authenticated;
