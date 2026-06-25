import { createClient } from '@supabase/supabase-js';

// 이유식 도감 클라우드 저장 (Supabase). publishable 키는 공개되어도 안전(RLS로 보호).
const SUPABASE_URL = 'https://mdkizfamvgtaceifysvh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_lA7If1jf1KecJXrOFSPTJw_7ZxbTpRM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 개인용 단일 행 키 (이 앱의 기록을 담는 행)
export const ROW_ID = 'jiyu-baby-main';
