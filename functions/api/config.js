import { json } from '../_lib/auth.js';
// 공개 가능한 값만 반환 (URL, anon key)
export const onRequestGet = ({ env }) => json({ url: env.SUPABASE_URL, anon: env.SUPABASE_ANON_KEY });
