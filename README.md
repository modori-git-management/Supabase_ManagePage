# MODORI 관리자 콘솔 배포

## 1. Supabase
SQL Editor에서 `sql/setup.sql`을 실행합니다. (여러 번 실행해도 안전)
- 이전에 적용한 테이블/함수(이메일 기록, 서버 사용량, 랭크, 신고 목록 등)는 이미 DB에 있으므로 다시 만들지 않습니다.
- 이번에 추가되는 함수: `core.am_i_admin()` (콘솔 입장 확인), `core.admin_log_email()` (발송 기록 저장)
- 관리자 판별은 `core.admins` 테이블 하나만 씁니다. (`app_metadata.role` 값은 쓰지 않으므로 설정할 필요 없고, 재로그인도 필요 없음)

관리자 추가/삭제
```sql
insert into core.admins(user_id, scope) select id, '*' from auth.users where lower(email)=lower('이메일');
delete from core.admins where user_id = (select id from auth.users where lower(email)=lower('이메일'));
```
- 관리자 계정은 STU 가입(`stu:active`)이 되어 있어야 STU 관련 화면(이용자/랭크/방/문의/신고/공지)이 열립니다.
- `core`, `stu` 스키마가 Data API에 노출돼 있어야 합니다. (Settings → API → Exposed schemas)

## 2. Cloudflare Pages
1. 이 폴더를 GitHub에 올리고 Pages에 연결합니다. (빌드 명령 없음, 출력 디렉터리 `public`)
2. Settings > Variables and Secrets
   - 일반 변수: `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   - Secret: `RESEND_API_KEY` (절대 공개 금지)
   - 일반 변수: `MAIL_FROM` (예: `MODORI <noreply@인증한도메인>`, Resend에서 도메인 인증 필요)
   - **`SUPABASE_SERVICE_KEY`는 더 이상 필요 없습니다.** 이미 넣었다면 지워도 됩니다.
3. 권장: Cloudflare Access로 이 주소 앞에 이중 보호

## 3. 화면 구성
이용자 / 랭크(오늘·이번 주(월요일 시작)·이번 달·전체) / 방 / 문의(답변) / 신고 / 공지(STU) / 이메일(발송·내역) / 서버 상태

## 4. 메모
- 메일 발송은 Resend 도메인 인증 전에는 실패하고, 실패 기록만 남습니다.
- 서비스(gudoks, book)를 출시하면 `stu`와 같은 모양의 함수를 각 스키마에 만들고 화면 탭을 추가하면 됩니다.
