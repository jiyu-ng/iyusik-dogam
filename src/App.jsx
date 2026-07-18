import { useState, useEffect, useMemo } from "react";
import { supabase, ROW_ID } from "./supabase";

// ── 상태 정의 ──────────────────────────────────────────────
const STATUS = {
  none:   { label: "안 먹어봄", emoji: "🍽️", bg: "#F3F1EC", fg: "#A9A296", ring: "#E6E2D8" },
  trying: { label: "테스트 중", emoji: "👀", bg: "#FFF3D6", fg: "#C9982E", ring: "#F2D98C" },
  safe:   { label: "통과!",     emoji: "💚", bg: "#E4F2E1", fg: "#5C9A6B", ring: "#BFE0BC" },
  react:  { label: "반응 있음", emoji: "🚨", bg: "#FBE3E0", fg: "#D06A60", ring: "#F2BDB6" },
};
const ORDER = ["none", "trying", "safe", "react"];

// ── 재료 시드 (★ = 대표 알러지 유발 식품) ──────────────────
const SEED = [
  ["곡물 Grains", [
    ["쌀", "🍚", 0], ["현미", "🌾", 0], ["찹쌀", "🍙", 0], ["오트밀", "🥣", 0], ["차조", "🌾", 0],
    ["퀴노아", "🌾", 0], ["보리", "🌾", 0], ["메밀", "🌾", 1], ["참깨", "◦", 1], ["밀", "🍞", 1], ["빵", "🥖", 1],
  ]],
  ["단백질 Protein", [
    ["파스타", "🍝", 1], ["소고기", "🥩", 0], ["닭고기", "🍗", 0], ["대두", "🫘", 1], ["돼지고기", "🐷", 0],
    ["오리고기", "🦆", 0], ["양고기", "🐑", 0], ["두부", "⬜", 1], ["강낭콩", "🫘", 0], ["완두콩", "🟢", 0],
    ["달걀", "🥚", 1], ["메추리알", "🥚", 1],
  ]],
  ["해산물 Seafoods", [
    ["흰살생선", "🐟", 1], ["등푸른생선", "🐠", 1], ["연어", "🍣", 1], ["새우", "🦐", 1], ["게", "🦀", 1],
    ["가리비", "🐚", 1], ["전복", "🐚", 1], ["바지락", "🦪", 1], ["굴", "🦪", 1], ["오징어", "🦑", 1],
    ["낙지", "🐙", 1], ["김", "🟩", 0],
  ]],
  ["견과 Nuts", [
    ["아마씨", "🌱", 0], ["땅콩", "🥜", 1], ["잣", "🌰", 1], ["호두", "🌰", 1], ["아몬드", "🌰", 1],
  ]],
  ["채소 Vegetables", [
    ["가지", "🍆", 0], ["감자", "🥔", 0], ["고구마", "🍠", 0], ["고사리", "🌿", 0], ["근대", "🥬", 0],
    ["느타리버섯", "🍄", 0], ["단호박", "🎃", 0], ["당근", "🥕", 0], ["마늘", "🧄", 0], ["무", "⚪", 0],
    ["배추", "🥬", 0], ["부추", "🌿", 0], ["브로콜리", "🥦", 0], ["비트", "🟣", 0], ["새송이버섯", "🍄", 0],
    ["새싹채소", "🌱", 0], ["숙주", "🌱", 0], ["시금치", "🥬", 0], ["아스파라거스", "🌿", 0], ["셀러리", "🌿", 1],
    ["애호박", "🥒", 0], ["양배추", "🥬", 0], ["방울양배추", "🥬", 0], ["양상추", "🥬", 0], ["양파", "🧅", 0],
    ["오이", "🥒", 0], ["옥수수", "🌽", 0], ["죽순", "🎋", 0], ["적채", "🟣", 0], ["청경채", "🥬", 0],
    ["콜라비", "🟢", 0], ["콜리플라워", "🥦", 0], ["콩나물", "🌱", 0], ["토마토", "🍅", 1], ["파", "🌿", 0],
    ["파프리카", "🫑", 0], ["팽이버섯", "🍄", 0], ["표고버섯", "🍄", 0],
  ]],
  ["과일 Fruits", [
    ["감", "🟠", 0], ["귤", "🍊", 0], ["대추", "🟤", 0], ["딸기", "🍓", 1], ["망고", "🥭", 1],
    ["멜론", "🍈", 0], ["무화과", "🟣", 0], ["바나나", "🍌", 0], ["배", "🍐", 0], ["오렌지", "🍊", 0],
    ["자두", "🟣", 0], ["참외", "🟡", 0], ["키위", "🥝", 1], ["파인애플", "🍍", 0], ["포도", "🍇", 0], ["사과", "🍎", 0],
  ]],
  ["유제품·오일 Dairy&oil", [
    ["우유", "🥛", 1], ["플레인요거트", "🥄", 1], ["치즈", "🧀", 1], ["버터", "🧈", 1],
    ["참기름", "🫗", 0], ["들기름", "🫗", 0], ["올리브유", "🫒", 0], ["아보카도오일", "🥑", 0],
  ]],
];

// ── 예방접종 표준일정 (NIP, 국가무료) ─────────────────────────
// 출처: 질병관리청 예방접종도우미 — 2026 기준. 실제 접종은 소아과/보건소 확인.
const VACCINE_SEED = [
  ["출생 직후", [["bcg", "BCG (결핵, 피내)"], ["hepb1", "B형간염 1차"]]],
  ["1개월", [["hepb2", "B형간염 2차"]]],
  ["2개월", [["dtap1", "DTaP 1차"], ["ipv1", "폴리오(IPV) 1차"], ["hib1", "Hib 1차"], ["pcv1", "폐렴구균(PCV) 1차"], ["rota1", "로타 1차"]]],
  ["4개월", [["dtap2", "DTaP 2차"], ["ipv2", "폴리오 2차"], ["hib2", "Hib 2차"], ["pcv2", "폐렴구균 2차"], ["rota2", "로타 2차"]]],
  ["6개월", [["dtap3", "DTaP 3차"], ["ipv3", "폴리오 3차"], ["hib3", "Hib 3차"], ["pcv3", "폐렴구균 3차"], ["rota3", "로타 3차 (로타텍만)"], ["hepb3", "B형간염 3차"]]],
  ["6개월~매년", [["flu", "인플루엔자(독감) · 첫 해 4주 간격 2회, 이후 매년 1회"]]],
  ["12~15개월", [["hib4", "Hib 4차"], ["pcv4", "폐렴구균 4차"], ["mmr1", "MMR 1차"], ["var1", "수두 1차"]]],
  ["12~23개월", [["hepa1", "A형간염 1차 (6~12개월 뒤 2차)"], ["je", "일본뇌염 시작"]]],
  ["15~18개월", [["dtap4", "DTaP 4차"]]],
  ["만 4~6세", [["dtap5", "DTaP 5차"], ["ipv4", "폴리오 4차"], ["mmr2", "MMR 2차"], ["je_boost", "일본뇌염 추가"]]],
];

// ── 월령별 발달 체크포인트 (상세: K-DST 6개 영역별) ──────────────
// 출처: 모이 발달 로드맵 상세판 (K-DST 6개 영역 + 대한소아청소년과 이정표).
// 발달은 아이마다 ±2~3개월 편차 정상. 구조: [시기, [[영역, [[key, 항목], ...]], ...]]
const DEV_SEED = [
  ["4개월 무렵", [
    ["대근육", [["m4_g1", "엎드려 고개 45~90도 들기"], ["m4_g2", "목 가누기"], ["m4_g3", "받쳐 안으면 머리 안정"]]],
    ["소근육", [["m4_f1", "두 손 모으기"], ["m4_f2", "딸랑이 쥐여주면 쥐기"], ["m4_f3", "손을 입으로 가져가기"]]],
    ["인지", [["m4_c1", "소리 나는 쪽 쳐다보기"], ["m4_c2", "움직이는 물건 눈으로 따라가기"]]],
    ["언어", [["m4_l1", "소리 내어 웃기"], ["m4_l2", "옹알이(\"아\",\"우\") 시작"]]],
    ["사회성", [["m4_s1", "사람 보고 방긋(사회적 미소)"], ["m4_s2", "눈맞춤"]]],
  ]],
  ["6개월 무렵", [
    ["대근육", [["m6_g1", "뒤집기(엎↔바로)"], ["m6_g2", "지지하면 앉기"], ["m6_g3", "엎드려 팔로 상체 들기"]]],
    ["소근육", [["m6_f1", "손으로 물건 잡기"], ["m6_f2", "손에서 손으로 옮기기"], ["m6_f3", "물건에 손 뻗기"]]],
    ["인지", [["m6_c1", "떨어뜨린 물건 눈으로 찾기"], ["m6_c2", "거울 보고 반응"]]],
    ["언어", [["m6_l1", "옹알이 다양해짐(자음)"], ["m6_l2", "소리 흉내"]]],
    ["사회성", [["m6_s1", "낯익은 얼굴 알아보기"], ["m6_s2", "이름 부르면 반응 시작"]]],
  ]],
  ["9개월 무렵", [
    ["대근육", [["m9_g1", "혼자 안정적으로 앉기"], ["m9_g2", "배밀이/네발기기"], ["m9_g3", "잡고 서기"]]],
    ["소근육", [["m9_f1", "두 손에 물건 하나씩"], ["m9_f2", "손가락으로 작은 것 집기 시도"], ["m9_f3", "물건 부딪히기"]]],
    ["인지", [["m9_c1", "까꿍 놀이 반응"], ["m9_c2", "숨긴 물건 찾기(대상영속성)"], ["m9_c3", "컵·숟가락 용도 관심"]]],
    ["언어", [["m9_l1", "\"마마·바바·다다\" 반복 옹알이"], ["m9_l2", "이름 부르면 돌아보기"], ["m9_l3", "\"안 돼\" 톤 인지 시작"]]],
    ["사회성", [["m9_s1", "낯가림"], ["m9_s2", "짝짜꿍·빠이빠이 따라하기"], ["m9_s3", "엄마 표정 살피기"], ["m9_s4", "엄마 선호"]]],
  ]],
  ["12개월 무렵", [
    ["대근육", [["m12_g1", "잡고 걷기(크루징)"], ["m12_g2", "혼자 서기"], ["m12_g3", "첫걸음 시도"]]],
    ["소근육", [["m12_f1", "엄지+검지로 집기(집게잡기 완성)"], ["m12_f2", "물건 담고 꺼내기"], ["m12_f3", "크레용 쥐기"]]],
    ["인지", [["m12_c1", "원하는 물건 손가락으로 가리키기"], ["m12_c2", "간단한 지시 이해(\"주세요\")"], ["m12_c3", "물건 용도에 맞게 쓰기"]]],
    ["언어", [["m12_l1", "\"엄마·아빠\" 의미 있게 말하기"], ["m12_l2", "의미 있는 첫 단어 1~2개"]]],
    ["사회성", [["m12_s1", "손 흔들어 인사"], ["m12_s2", "관심 공유(가리키며 쳐다보기)"]]],
    ["자조", [["m12_z1", "컵으로 마시기 시도"], ["m12_z2", "손가락으로 집어먹기"]]],
  ]],
  ["15개월 무렵", [
    ["대근육", [["m15_g1", "혼자 걷기"], ["m15_g2", "서서 쭈그려 앉기"]]],
    ["소근육", [["m15_f1", "두 개 블록 쌓기"], ["m15_f2", "통에 물건 넣기"]]],
    ["인지", [["m15_c1", "신체 부위 1~2곳 가리키기"], ["m15_c2", "간단한 심부름"]]],
    ["언어", [["m15_l1", "단어 3~5개"], ["m15_l2", "원하는 것 몸짓+소리로 표현"]]],
    ["사회성", [["m15_s1", "애정 표현"], ["m15_s2", "다른 아이 관심"]]],
    ["자조", [["m15_z1", "숟가락 쥐고 시도"], ["m15_z2", "옷 입을 때 팔 뻗기"]]],
  ]],
  ["18개월 무렵", [
    ["대근육", [["m18_g1", "안정적으로 걷기"], ["m18_g2", "계단 기어오르기"], ["m18_g3", "공 차기"]]],
    ["소근육", [["m18_f1", "블록 3~4개 쌓기"], ["m18_f2", "끄적이기(낙서)"]]],
    ["인지", [["m18_c1", "신체 부위 여러 곳"], ["m18_c2", "그림책 속 사물 가리키기"]]],
    ["언어", [["m18_l1", "단어 10개 이상"], ["m18_l2", "익숙한 물건 이름 대기"]]],
    ["사회성", [["m18_s1", "흉내내기 놀이(전화기 등)"], ["m18_s2", "어른 행동 모방"]]],
    ["자조", [["m18_z1", "혼자 숟가락질"], ["m18_z2", "컵으로 마시기"]]],
  ]],
  ["24개월 무렵", [
    ["대근육", [["m24_g1", "뛰기"], ["m24_g2", "계단 오르내리기(난간 잡고)"], ["m24_g3", "공 던지기"]]],
    ["소근육", [["m24_f1", "블록 6개 쌓기"], ["m24_f2", "문 손잡이 돌리기"], ["m24_f3", "책장 한 장씩 넘기기"]]],
    ["인지", [["m24_c1", "두 단계 지시 이해"], ["m24_c2", "모양·색 구분 시작"]]],
    ["언어", [["m24_l1", "두 단어 문장(\"엄마 물\")"], ["m24_l2", "단어 50개 이상"]]],
    ["사회성", [["m24_s1", "또래 옆에서 놀기"], ["m24_s2", "감정 표현 다양"]]],
    ["자조", [["m24_z1", "옷 벗기"], ["m24_z2", "손 씻기 시도"], ["m24_z3", "배변 신호 시작"]]],
  ]],
  ["30~36개월 무렵", [
    ["대근육", [["m36_g1", "두 발 모아 뛰기"], ["m36_g2", "세발자전거 페달"], ["m36_g3", "한 발 서기"]]],
    ["소근육", [["m36_f1", "원·선 따라 그리기"], ["m36_f2", "가위질 시도"]]],
    ["인지", [["m36_c1", "크다/작다 이해"], ["m36_c2", "색 이름"], ["m36_c3", "간단한 퍼즐"]]],
    ["언어", [["m36_l1", "세 단어 문장"], ["m36_l2", "이름·나이 말하기"], ["m36_l3", "대화 주고받기"]]],
    ["사회성", [["m36_s1", "또래와 함께 놀기"], ["m36_s2", "차례 지키기 시작"]]],
    ["자조", [["m36_z1", "대소변 가리기"], ["m36_z2", "혼자 옷 입기 시도"], ["m36_z3", "양치 도움받아"]]],
  ]],
];
// 전체 발달 항목 flatten (진행률·일괄체크·마이그레이션용)
const DEV_ALL = DEV_SEED.flatMap(([, domains]) => domains.flatMap(([, items]) => items));

const STORAGE_KEY = "babyFoodTracker_v1";

// ── 화면 잠금(PIN) ─────────────────────────────────────────
// 주의: 이건 '화면 가림막'이다. 앱 화면을 못 보게 막을 뿐,
// Supabase 데이터 자체 잠금(RLS)은 아니다. 캐주얼 차단용.
const PIN = "0211";
const PIN_KEY = "iyusik_unlocked_v1";

// ── 이유식 단계 ────────────────────────────────────────────
const STAGES = [
  { key: "early",  label: "초기", age: "만 4~6개월",  desc: "초기 이유식. 10배죽/미음, 재료는 곱게 갈아 묽게." },
  { key: "mid",    label: "중기", age: "만 7~8개월",  desc: "중기 이유식. 5~7배죽, 재료는 으깨거나 잘게." },
  { key: "late",   label: "후기", age: "만 9~11개월", desc: "후기 이유식. 무른밥/진밥, 재료는 잘게 다져 손가락 크기 핑거푸드도 가능." },
  { key: "fin",    label: "완료기", age: "만 12개월~", desc: "완료기. 진밥/유아식, 재료는 작게 썰어 다양한 식감." },
];

const DOW = ["일", "월", "화", "수", "목", "금", "토"];
function fmtDay(d) {
  const dt = new Date(d + "T00:00:00");
  if (isNaN(dt.getTime())) return d;
  return `${dt.getMonth() + 1}월 ${dt.getDate()}일 (${DOW[dt.getDay()]})`;
}

// 생일(YYYY-MM-DD) → 월령/일수 + 추정 단계
function computeAge(birthStr) {
  if (!birthStr) return null;
  const b = new Date(birthStr);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  const totalDays = Math.floor((now - b) / 86400000);
  if (totalDays < 0) return null;
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months--;
  let stage = "late";
  if (months < 6) stage = "early";
  else if (months < 9) stage = "mid";
  else if (months < 12) stage = "late";
  else stage = "fin";
  return { months, totalDays, text: `생후 ${months}개월 (${totalDays}일)`, stage };
}

// ── 끼니(식사 시간대) ──────────────────────────────────────
const SLOTS = [
  { key: "아침", emoji: "🌅" },
  { key: "점심", emoji: "☀️" },
  { key: "저녁", emoji: "🌙" },
  { key: "간식", emoji: "🍪" },
];
const SLOT_ORDER = { 아침: 0, 점심: 1, 저녁: 2, 간식: 3 };
const SLOT_EMOJI = { 아침: "🌅", 점심: "☀️", 저녁: "🌙", 간식: "🍪" };
function inferSlot(hour) {
  if (hour < 11) return "아침";
  if (hour < 15) return "점심";
  if (hour < 21) return "저녁";
  return "간식";
}
// 기존(끼니 없던) 기록도 안전하게 읽기
function mealSlot(m) {
  if (m.slot) return m.slot;
  const h = parseInt((m.ts || "").slice(11, 13), 10);
  return inferSlot(isNaN(h) ? 12 : h);
}
function mealTime(m) {
  if (m.time !== undefined) return m.time;
  return m.ts ? m.ts.slice(11, 16) : "";
}
function mealDate(m) {
  return m.date || (m.ts ? m.ts.slice(0, 10) : "");
}

export default function App() {
  const [view, setView] = useState("tracker"); // tracker | recipes
  const [records, setRecords] = useState({});
  const [custom, setCustom] = useState([]);
  const [meals, setMeals] = useState([]);       // 식사 기록 [{id, ts, items:[names], memo}]
  const [vaccines, setVaccines] = useState({}); // 예방접종 { [key]: { done, date } }
  const [dev, setDev] = useState({});           // 발달 체크 { [key]: { done, date } }
  const [feeds, setFeeds] = useState([]);       // 수유 기록 [{id, date, time, kind, amount}]
  const [feedForm, setFeedForm] = useState(null); // 수유 기록 추가 폼
  const [statDate, setStatDate] = useState(() => { const d = new Date(); const p = (x) => String(x).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; });
  const [loaded, setLoaded] = useState(false);
  const [unlocked, setUnlocked] = useState(() => {
    try { return localStorage.getItem(PIN_KEY) === "1"; } catch (e) { return false; }
  });
  const [active, setActive] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [mealForm, setMealForm] = useState(null); // 식사 기록 추가 폼 상태

  // 레시피/조합 상태
  const [stage, setStage] = useState("late");
  const [recipes, setRecipes] = useState([]);   // 통과 재료 조합
  const [nextTry, setNextTry] = useState([]);   // 새로 도전할 재료
  const [babyAge, setBabyAge] = useState("");   // 생일 기준 월령 (예: "생후 9개월 (282일)")
  const [cooking, setCooking] = useState(false);
  const [recipeErr, setRecipeErr] = useState("");

  // 데이터 로드: 1) localStorage 즉시 표시  2) 클라우드(Supabase)와 동기화
  useEffect(() => {
    (async () => {
      // 1) 로컬 캐시 먼저 (오프라인에서도 즉시 보이게)
      let local = null;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) local = JSON.parse(raw);
      } catch (e) {}
      if (local) {
        setRecords(local.records || {});
        setCustom(local.custom || []);
        setMeals(local.meals || []);
        setVaccines(local.vaccines || {});
        setDev(local.dev || {});
        setFeeds(local.feeds || []);
      }

      // 2) 클라우드 조회
      try {
        const { data, error } = await supabase
          .from("tracker_state")
          .select("data")
          .eq("id", ROW_ID)
          .maybeSingle();

        const cloud = !error && data ? data.data : null;
        const cloudHasData =
          cloud && (Object.keys(cloud.records || {}).length || (cloud.custom || []).length || (cloud.meals || []).length || Object.keys(cloud.vaccines || {}).length || Object.keys(cloud.dev || {}).length || (cloud.feeds || []).length);

        if (cloudHasData) {
          // 클라우드 데이터로 갱신 + 로컬 캐시 업데이트
          setRecords(cloud.records || {});
          setCustom(cloud.custom || []);
          setMeals(cloud.meals || []);
          setVaccines(cloud.vaccines || {});
          setDev(cloud.dev || {});
          setFeeds(cloud.feeds || []);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud)); } catch (e) {}
        } else if (local) {
          // 클라우드는 비었는데 로컬에 기록이 있으면 → 클라우드로 올림(최초 백업)
          await supabase
            .from("tracker_state")
            .upsert({ id: ROW_ID, data: local, updated_at: new Date().toISOString() });
        }
      } catch (e) {
        // 네트워크 실패 시 로컬 데이터로 계속 동작
        console.error("cloud load failed", e);
      }

      // 아기 생일 → 월령 계산 (생일은 공개 소스에 안 박고 클라우드 _settings 행에 보관)
      try {
        const { data: setg } = await supabase
          .from("tracker_state").select("data").eq("id", "_settings").maybeSingle();
        const age = computeAge(setg?.data?.baby_birth);
        if (age) { setBabyAge(age.text); setStage(age.stage); }
      } catch (e) {}

      setLoaded(true);
    })();
  }, []);

  const persist = (nr = records, nc = custom, nm = meals, nv = vaccines, nd = dev, nfd = feeds) => {
    const payload = { records: nr, custom: nc, meals: nm, vaccines: nv, dev: nd, feeds: nfd };
    // 1) 로컬 즉시 저장
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); }
    catch (e) { console.error(e); }
    // 2) 클라우드 저장 (fire-and-forget)
    supabase
      .from("tracker_state")
      .upsert({ id: ROW_ID, data: payload, updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error("cloud save failed", error); });
  };

  const allItems = useMemo(() => {
    const base = SEED.flatMap(([cat, list]) =>
      list.map(([name, emoji, allergen]) => ({ id: name, name, emoji, allergen: !!allergen, cat }))
    );
    return [...base, ...custom.map((c) => ({ ...c, cat: c.cat || "직접 추가" }))];
  }, [custom]);

  const grouped = useMemo(() => {
    const cats = [...SEED.map(([c]) => c)];
    if (custom.some((c) => !c.cat || c.cat === "직접 추가")) cats.push("직접 추가");
    return cats.map((cat) => ({ cat, items: allItems.filter((i) => i.cat === cat) }));
  }, [allItems, custom]);

  const counts = useMemo(() => {
    const c = { safe: 0, trying: 0, react: 0, total: allItems.length };
    allItems.forEach((i) => { const s = records[i.id]?.status; if (s && c[s] !== undefined) c[s]++; });
    return c;
  }, [records, allItems]);

  const safeNames = useMemo(
    () => allItems.filter((i) => records[i.id]?.status === "safe").map((i) => i.name),
    [allItems, records]
  );

  const setStatus = (id, status) => { const n = { ...records, [id]: { ...records[id], status } }; setRecords(n); persist(n, custom); };
  const setMemo = (id, memo) => { const n = { ...records, [id]: { ...records[id], memo } }; setRecords(n); persist(n, custom); };
  const addCustom = () => {
    const name = newName.trim(); if (!name) return;
    const nc = [...custom, { id: "c_" + Date.now(), name, emoji: "🥄", allergen: false }];
    setCustom(nc); persist(records, nc); setNewName(""); setAdding(false);
  };
  const removeCustom = (id) => {
    const nc = custom.filter((c) => c.id !== id);
    const nr = { ...records }; delete nr[id];
    setCustom(nc); setRecords(nr); persist(nr, nc); setActive(null);
  };
  const moveCustom = (id, cat) => {
    const nc = custom.map((c) => (c.id === id ? { ...c, cat } : c));
    setCustom(nc); persist(records, nc);
    setActive((a) => (a && a.id === id ? { ...a, cat } : a));
  };

  // ── 예방접종 ──
  const toggleVaccine = (key) => {
    const cur = vaccines[key];
    const nv = { ...vaccines };
    if (cur?.done) delete nv[key];                        // 체크 해제 → 기록 삭제
    else nv[key] = { done: true, date: cur?.date || "" }; // 체크 → 날짜는 비워둠(선택 입력)
    setVaccines(nv); persist(records, custom, meals, nv);
  };
  const setVaccineDate = (key, date) => {
    const nv = { ...vaccines, [key]: { done: true, date } };
    setVaccines(nv); persist(records, custom, meals, nv);
  };
  const setPeriodVaccines = (list, done) => {            // 시기 전체 완료/해제
    const nv = { ...vaccines };
    list.forEach(([key]) => {
      if (done) nv[key] = { done: true, date: nv[key]?.date || "" };
      else delete nv[key];
    });
    setVaccines(nv); persist(records, custom, meals, nv);
  };
  const vaxTotal = VACCINE_SEED.reduce((n, [, list]) => n + list.length, 0);
  const vaxDone = Object.values(vaccines).filter((v) => v?.done).length;

  // ── 발달 체크 ──
  const toggleDev = (key) => {
    const cur = dev[key];
    const nd = { ...dev };
    if (cur?.done) delete nd[key];
    else nd[key] = { done: true, date: cur?.date || "" };
    setDev(nd); persist(records, custom, meals, vaccines, nd);
  };
  const setDevDate = (key, date) => {
    const nd = { ...dev, [key]: { done: true, date } };
    setDev(nd); persist(records, custom, meals, vaccines, nd);
  };
  const setPeriodDev = (list, done) => {
    const nd = { ...dev };
    list.forEach(([key]) => {
      if (done) nd[key] = { done: true, date: nd[key]?.date || "" };
      else delete nd[key];
    });
    setDev(nd); persist(records, custom, meals, vaccines, nd);
  };
  const devTotal = DEV_ALL.length;
  const devDone = DEV_ALL.filter(([k]) => dev[k]?.done).length;

  // ── 식사 기록 ──
  const openMealForm = (m) => {
    if (m) {
      setMealForm({ id: m.id, date: mealDate(m), slot: mealSlot(m), time: mealTime(m), items: m.items, memo: m.memo || "", amount: m.amount || "" });
      return;
    }
    const now = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    setMealForm({
      id: null,
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      slot: inferSlot(now.getHours()),
      time: "", // 시간은 옵션
      items: [], memo: "", amount: "",
    });
  };
  const toggleMealItem = (name) =>
    setMealForm((f) => ({
      ...f,
      items: f.items.includes(name) ? f.items.filter((x) => x !== name) : [...f.items, name],
    }));
  const saveMeal = () => {
    if (!mealForm || !mealForm.items.length) return;
    const time = mealForm.time || "";
    const ts = `${mealForm.date}T${time || "00:00"}`; // 정렬/호환용
    const entry = {
      id: mealForm.id || "m_" + Date.now(),
      ts, date: mealForm.date, slot: mealForm.slot, time,
      items: mealForm.items, memo: (mealForm.memo || "").trim(),
      amount: parseInt(String(mealForm.amount).replace(/[^0-9]/g, ""), 10) || 0,
    };
    const nm = mealForm.id ? meals.map((m) => (m.id === entry.id ? entry : m)) : [entry, ...meals];
    setMeals(nm); persist(records, custom, nm); setMealForm(null);
  };
  const removeMeal = (id) => {
    const nm = meals.filter((m) => m.id !== id);
    setMeals(nm); persist(records, custom, nm);
  };

  // ── 수유(분유·모유·물) 기록 ──
  const FEED_KINDS = ["분유", "모유", "물", "간식"];
  const openFeedForm = (f) => {
    const now = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    if (f) { setFeedForm({ id: f.id, date: f.date, time: f.time || "", kind: f.kind, amount: String(f.amount || "") }); return; }
    setFeedForm({ id: null, date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`, time: `${pad(now.getHours())}:${pad(now.getMinutes())}`, kind: "분유", amount: "" });
  };
  const saveFeed = () => {
    if (!feedForm) return;
    const amt = parseInt(String(feedForm.amount).replace(/[^0-9]/g, ""), 10) || 0;
    if (!amt) return;
    const entry = { id: feedForm.id || "f_" + Date.now(), date: feedForm.date, time: feedForm.time || "", kind: feedForm.kind, amount: amt };
    const nfd = feedForm.id ? feeds.map((x) => (x.id === entry.id ? entry : x)) : [entry, ...feeds];
    setFeeds(nfd); persist(records, custom, meals, vaccines, dev, nfd); setFeedForm(null);
  };
  const removeFeed = (id) => {
    const nfd = feeds.filter((x) => x.id !== id);
    setFeeds(nfd); persist(records, custom, meals, vaccines, dev, nfd);
  };

  // 하루 총 섭취량 통계 (분유+모유+물+이유식 다 합산)
  const dayStats = useMemo(() => {
    const fd = feeds.filter((f) => f.date === statDate);
    const md = meals.filter((m) => (m.date || (m.ts || "").slice(0, 10)) === statDate);
    const sumKind = (ks) => fd.filter((f) => ks.includes(f.kind)).reduce((s, f) => s + (f.amount || 0), 0);
    const milk = sumKind(["분유", "모유"]);
    const water = sumKind(["물"]);
    const snackFeed = sumKind(["간식"]);
    const mealMl = md.reduce((s, m) => s + (m.amount || 0), 0);
    const total = milk + water + snackFeed + mealMl;
    return { fd, md, milk, water, snackFeed, mealMl, total, feedCount: fd.length, mealCount: md.length };
  }, [feeds, meals, statDate]);
  const feedsToday = useMemo(() => {
    const t = statDate;
    return [...feeds].filter((f) => f.date).sort((a, b) => (b.date + (b.time || "")).localeCompare(a.date + (a.time || "")));
  }, [feeds, statDate]);

  // 날짜별 그룹 (날짜 최신순, 하루 안에선 아침→점심→저녁→간식 순)
  const mealsByDay = useMemo(() => {
    const groups = [];
    for (const m of meals) {
      const day = mealDate(m);
      let g = groups.find((x) => x.day === day);
      if (!g) { g = { day, list: [] }; groups.push(g); }
      g.list.push(m);
    }
    groups.sort((a, b) => (a.day < b.day ? 1 : -1));
    for (const g of groups) {
      g.list.sort((a, b) => {
        const so = SLOT_ORDER[mealSlot(a)] - SLOT_ORDER[mealSlot(b)];
        if (so !== 0) return so;
        return mealTime(a) < mealTime(b) ? -1 : 1;
      });
    }
    return groups;
  }, [meals]);

  // 식사 기록에 고를 수 있는 재료 = 먹어본(통과/테스트중) 재료
  const edibleItems = useMemo(
    () => allItems.filter((i) => ["safe", "trying"].includes(records[i.id]?.status)),
    [allItems, records]
  );

  // ── AI 레시피 추천 (Supabase에 기록된 레시피 서버 주소로 호출) ──
  const getRecipes = async () => {
    setCooking(true); setRecipeErr(""); setRecipes([]); setNextTry([]);
    try {
      // 1) 레시피 서버 주소를 Supabase config에서 읽기 (터널 URL은 가변)
      const { data: cfg } = await supabase
        .from("tracker_state").select("data").eq("id", "_config").maybeSingle();
      const base = cfg?.data?.recipe_url;
      if (!base) throw new Error("no recipe server url");

      // 아직 안 먹어본 재료 (새로 도전할 후보)
      const untriedNames = allItems
        .filter((i) => !records[i.id]?.status || records[i.id].status === "none")
        .map((i) => i.name);

      // 2) 조합 + 새 재료 추천 요청
      const res = await fetch(base + "/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, safeNames, untriedNames, babyAge }),
      });
      const json = await res.json();
      const list = json.combos || json.recipes;
      if (list?.length) {
        setRecipes(list);
        setNextTry(Array.isArray(json.nextTry) ? json.nextTry : []);
      } else {
        setRecipeErr(json.error || "조합을 못 만들었어요. 다시 한 번 눌러볼래요?");
      }
    } catch (e) {
      setRecipeErr("레시피 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요. 🍳");
    } finally {
      setCooking(false);
    }
  };

  if (!loaded) return <div style={{ ...wrap, display: "grid", placeItems: "center", color: "#B7AE9E" }}>불러오는 중…</div>;

  // 화면 잠금: PIN 안 풀렸으면 PIN 화면만 보여줌
  if (!unlocked) {
    return <PinGate onOk={() => {
      try { localStorage.setItem(PIN_KEY, "1"); } catch (e) {}
      setUnlocked(true);
    }} />;
  }

  return (
    <div style={wrap}>
      <style>{css}</style>

      <header style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 30, lineHeight: 1 }}>🐣</div>
        <h1 style={h1}>모이</h1>
        <p style={sub}>우리 아기 육아 도감 · 이유식 · 예방접종</p>
      </header>

      {/* 탭 */}
      <div style={tabs}>
        <button style={{ ...tab, ...(view === "tracker" ? tabOn : {}) }} onClick={() => setView("tracker")}>📋 재료체크</button>
        <button style={{ ...tab, ...(view === "recipes" ? tabOn : {}) }} onClick={() => setView("recipes")}>🍳 추천받기</button>
        <button style={{ ...tab, ...(view === "meals" ? tabOn : {}) }} onClick={() => setView("meals")}>📖 식사기록</button>
        <button style={{ ...tab, ...(view === "feeds" ? tabOn : {}) }} onClick={() => setView("feeds")}>🍼 수유</button>
        <button style={{ ...tab, ...(view === "stats" ? tabOn : {}) }} onClick={() => setView("stats")}>📊 통계</button>
        <button style={{ ...tab, ...(view === "vaccine" ? tabOn : {}) }} onClick={() => setView("vaccine")}>💉 예방접종</button>
        <button style={{ ...tab, ...(view === "dev" ? tabOn : {}) }} onClick={() => setView("dev")}>📏 발달</button>
      </div>

      {view === "tracker" && (
        <>
          <div style={statRow}>
            <Stat n={counts.safe} label="통과" c="#5C9A6B" bg="#E4F2E1" />
            <Stat n={counts.trying} label="테스트중" c="#C9982E" bg="#FFF3D6" />
            <Stat n={counts.react} label="반응" c="#D06A60" bg="#FBE3E0" />
          </div>

          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${counts.total ? (counts.safe / counts.total) * 100 : 0}%` }} />
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "#B7AE9E", margin: "8px 0 20px" }}>
            {counts.total}가지 중 {counts.safe}가지 통과 🌱
          </p>

          {grouped.map(({ cat, items }) => (
            <section key={cat} style={{ marginBottom: 22 }}>
              <h2 style={h2}>{cat}</h2>
              <div style={grid}>
                {items.map((it) => {
                  const st = records[it.id]?.status || "none";
                  const s = STATUS[st];
                  return (
                    <button key={it.id} onClick={() => setActive(it)} className="card"
                      style={{ ...card, background: s.bg, boxShadow: `inset 0 0 0 1.5px ${s.ring}` }}>
                      {it.allergen && <span style={allergenDot} title="알러지 유발 주의">!</span>}
                      <span style={{ fontSize: 26 }}>{it.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#5A5346", marginTop: 3 }}>{it.name}</span>
                      <span style={{ fontSize: 10, color: s.fg, fontWeight: 700, marginTop: 2 }}>{s.emoji} {s.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          <button style={addBtn} onClick={() => setAdding(true)}>+ 재료 직접 추가하기</button>
          <p style={tip}>
            💡 새 재료는 한 번에 하나씩, <b>3일</b> 정도 같은 재료를 주면서 발진·설사·구토가 없는지 보고 "통과"로 넘기는 걸 추천해요. <span style={{ color: "#D6A48E" }}>!</span> 표시는 대표 알러지 유발 식품이에요.
          </p>
        </>
      )}

      {view === "recipes" && (
        <>
          {/* 단계 선택 */}
          <p style={{ ...h2, marginBottom: 8 }}>
            우리 아기 단계{babyAge && <span style={{ color: "#5C9A6B", fontWeight: 700 }}> · {babyAge}</span>}
          </p>
          <div style={stageRow}>
            {STAGES.map((s) => (
              <button key={s.key} onClick={() => setStage(s.key)}
                style={{ ...stageChip, ...(stage === s.key ? stageOn : {}) }}>
                <span style={{ fontWeight: 700 }}>{s.label}</span>
                <span style={{ fontSize: 9.5, opacity: 0.8 }}>{s.age}</span>
              </button>
            ))}
          </div>

          <div style={safeBox}>
            <span style={{ fontSize: 12.5, color: "#5C9A6B", fontWeight: 700 }}>💚 통과한 재료 {safeNames.length}가지</span>
            <p style={{ fontSize: 11.5, color: "#8A8170", margin: "6px 0 0", lineHeight: 1.6 }}>
              {safeNames.length ? safeNames.join(" · ") : "아직 통과한 재료가 없어요. 체크리스트에서 먼저 재료를 통과시켜 주세요!"}
            </p>
          </div>

          <button
            style={{ ...cookBtn, opacity: safeNames.length < 2 || cooking ? 0.5 : 1 }}
            disabled={safeNames.length < 2 || cooking}
            onClick={getRecipes}>
            {cooking ? "🍱 조합 짜는 중…" : safeNames.length < 2 ? "재료를 2가지 이상 통과시켜 주세요" : "🍱 이 재료로 조합 추천받기"}
          </button>

          {recipeErr && <p style={{ color: "#C9982E", fontSize: 12.5, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>{recipeErr}</p>}

          {cooking && <div style={{ textAlign: "center", fontSize: 30, marginTop: 18 }} className="pot">🥄</div>}

          <div style={{ marginTop: 16 }}>
            {recipes.map((r, i) => (
              <div key={i} style={recipeCard}>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: "#4A4438", marginBottom: 8 }}>🍱 {r.name}</div>
                {(r.cubes || r.uses)?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                    {(r.cubes || r.uses).map((u, j) => <span key={j} style={useChip}>🧊 {u}</span>)}
                  </div>
                )}
                {r.why && <p style={{ fontSize: 13, color: "#5A5346", lineHeight: 1.7, margin: "0 0 6px" }}>{r.why}</p>}
                {(r.steps?.length > 0) && (
                  <ol style={{ margin: "0 0 6px", paddingLeft: 18, color: "#5A5346", fontSize: 13, lineHeight: 1.7 }}>
                    {r.steps.map((s, j) => <li key={j} style={{ marginBottom: 3 }}>{s}</li>)}
                  </ol>
                )}
                {r.tip && <p style={recipeTip}>💡 {r.tip}</p>}
              </div>
            ))}
            {recipes.length > 0 && (
              <p style={{ fontSize: 11, color: "#B7AE9E", textAlign: "center", marginTop: 6, lineHeight: 1.6 }}>
                AI가 추천한 조합이에요. 알러지·재료 상태는 한 번 더 확인해 주세요 🙏
              </p>
            )}
          </div>

          {/* 새로 도전해볼 재료 (알러지 테스트) */}
          {nextTry.length > 0 && (
            <div style={{ marginTop: 22 }}>
              <p style={{ ...h2, marginBottom: 4 }}>🌱 새로 도전해볼 재료</p>
              <p style={{ fontSize: 11.5, color: "#A9A091", margin: "0 0 12px 2px", lineHeight: 1.6 }}>
                아직 안 먹어본 재료 중 지금 단계에 좋은 거예요. 알러지 테스트로 하나씩 넘겨봐요!
              </p>
              {nextTry.map((n, i) => (
                <div key={i} style={nextCard}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#4A4438", marginBottom: 6 }}>🌱 {n.name}</div>
                  {n.why && <p style={{ fontSize: 12.5, color: "#5A5346", lineHeight: 1.7, margin: "0 0 6px" }}>{n.why}</p>}
                  {n.how && <p style={nextHow}>🧪 이렇게 줘보기: {n.how}</p>}
                </div>
              ))}
              <p style={{ fontSize: 11, color: "#B7AE9E", textAlign: "center", marginTop: 6, lineHeight: 1.6 }}>
                새 재료는 한 번에 하나씩 · 소량 · 오전 · 3일 관찰이 안전해요 🙏
              </p>
            </div>
          )}
        </>
      )}

      {view === "meals" && (
        <>
          <button style={cookBtn} onClick={() => openMealForm()}>＋ 오늘 먹은 거 기록하기</button>

          {meals.length === 0 ? (
            <p style={{ textAlign: "center", color: "#B7AE9E", fontSize: 12.5, marginTop: 28, lineHeight: 1.8 }}>
              아직 기록이 없어요.<br />어떤 끼니에 어떤 조합으로 먹었는지 남겨두면<br />알러지 추적할 때 큰 도움이 돼요 📖
            </p>
          ) : (
            <div style={{ marginTop: 18 }}>
              {mealsByDay.map((g) => (
                <section key={g.day} style={{ marginBottom: 18 }}>
                  <h2 style={h2}>{fmtDay(g.day)}</h2>
                  {g.list.map((m) => (
                    <div key={m.id} style={mealCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: "#5C9A6B" }}>
                          {SLOT_EMOJI[mealSlot(m)]} {mealSlot(m)}
                          {mealTime(m) && <span style={{ fontWeight: 600, color: "#B7AE9E", fontSize: 12 }}> · {mealTime(m)}</span>}
                        </span>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button style={miniBtn} onClick={() => openMealForm(m)}>수정</button>
                          <button style={{ ...miniBtn, color: "#D06A60" }} onClick={() => { if (window.confirm("이 기록을 삭제할까요?")) removeMeal(m.id); }}>삭제</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {m.items.map((it, j) => <span key={j} style={useChip}>🧊 {it}</span>)}
                      </div>
                      {m.memo && <p style={{ fontSize: 12, color: "#8A8170", margin: "8px 0 0", lineHeight: 1.6 }}>📝 {m.memo}</p>}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {view === "vaccine" && (
        <>
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${vaxTotal ? (vaxDone / vaxTotal) * 100 : 0}%`, background: "#7EA9D8" }} />
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "#B7AE9E", margin: "8px 0 18px" }}>
            표준일정 {vaxTotal}개 중 <b style={{ color: "#5E86B4" }}>{vaxDone}개</b> 완료 💉
          </p>

          {VACCINE_SEED.map(([period, list]) => {
            const allDone = list.every(([k]) => vaccines[k]?.done);
            return (
            <section key={period} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={h2}>{period}</h2>
                <button onClick={() => setPeriodVaccines(list, !allDone)} style={bulkBtn}>
                  {allDone ? "전체 해제" : "전체 완료"}
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {list.map(([key, name]) => {
                  const v = vaccines[key];
                  const done = !!v?.done;
                  return (
                    <div key={key} style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 14,
                      background: done ? "#E7F0FA" : "#FFF", boxShadow: `inset 0 0 0 1.5px ${done ? "#B9D3EC" : "#EFE9DE"}`,
                    }}>
                      <button onClick={() => toggleVaccine(key)} aria-label="접종 체크" style={{
                        width: 26, height: 26, flexShrink: 0, borderRadius: 8, border: "none", cursor: "pointer",
                        background: done ? "#5E86B4" : "#F1ECE1", color: "#FFF", fontSize: 15, fontWeight: 800,
                        display: "grid", placeItems: "center",
                      }}>{done ? "✓" : ""}</button>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: done ? "#3F5C7C" : "#5A5346" }}>{name}</div>
                        {done && (
                          <input type="date" value={v.date || ""} onChange={(e) => setVaccineDate(key, e.target.value)}
                            style={{ marginTop: 5, fontSize: 12, color: "#5E86B4", fontWeight: 600, border: "none", background: "transparent", padding: 0, fontFamily: "inherit" }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
            );
          })}

          <p style={tip}>
            💉 국가예방접종(NIP) 표준일정이에요. 로타·일본뇌염은 백신 종류에 따라 횟수가 달라요. 실제 접종 시기·종류는 소아과·보건소 안내를 따라주세요 🙏
          </p>
        </>
      )}

      {view === "dev" && (
        <>
          <div style={progressTrack}>
            <div style={{ ...progressFill, width: `${devTotal ? (devDone / devTotal) * 100 : 0}%`, background: "#5C9A6B" }} />
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "#B7AE9E", margin: "8px 0 18px" }}>
            발달 이정표 {devTotal}개 중 <b style={{ color: "#5C9A6B" }}>{devDone}개</b> 달성 🌱
          </p>

          {DEV_SEED.map(([period, domains]) => {
            const flat = domains.flatMap(([, items]) => items);
            const allDone = flat.every(([k]) => dev[k]?.done);
            const doneN = flat.filter(([k]) => dev[k]?.done).length;
            return (
            <section key={period} style={{ marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <h2 style={{ ...h2, marginBottom: 0 }}>{period} <span style={{ fontSize: 12, color: "#B7AE9E", fontWeight: 600 }}>{doneN}/{flat.length}</span></h2>
                <button onClick={() => setPeriodDev(flat, !allDone)} style={bulkBtn}>
                  {allDone ? "전체 해제" : "전체 완료"}
                </button>
              </div>
              {domains.map(([domain, items]) => (
                <div key={domain} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "#A99F8C", margin: "6px 2px 5px" }}>{domain}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {items.map(([key, name]) => {
                      const v = dev[key];
                      const done = !!v?.done;
                      return (
                        <div key={key} style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 13,
                          background: done ? "#E7F1E4" : "#FFF", boxShadow: `inset 0 0 0 1.5px ${done ? "#BEDBB6" : "#EFE9DE"}`,
                        }}>
                          <button onClick={() => toggleDev(key)} aria-label="발달 체크" style={{
                            width: 24, height: 24, flexShrink: 0, borderRadius: 7, border: "none", cursor: "pointer",
                            background: done ? "#5C9A6B" : "#F1ECE1", color: "#FFF", fontSize: 14, fontWeight: 800,
                            display: "grid", placeItems: "center",
                          }}>{done ? "✓" : ""}</button>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: done ? "#3E6B4B" : "#5A5346" }}>{name}</div>
                            {done && (
                              <input type="date" value={v.date || ""} onChange={(e) => setDevDate(key, e.target.value)}
                                style={{ marginTop: 4, fontSize: 12, color: "#5C9A6B", fontWeight: 600, border: "none", background: "transparent", padding: 0, fontFamily: "inherit" }} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
            );
          })}

          <p style={tip}>
            🌱 월령별 발달 체크포인트예요. 발달은 아이마다 <b>±2~3개월</b> 편차가 정상이에요. 늦다고 조급해하지 말고, 걱정되면 영유아 건강검진 때 K-DST 발달선별로 확인해요 💚
          </p>
        </>
      )}

      {view === "feeds" && (
        <>
          <div style={statRow}>
            <Stat n={dayStats.milk} label="분유·모유(ml)" c="#5C9A6B" bg="#E4F2E1" />
            <Stat n={dayStats.water} label="물(ml)" c="#4E9AC9" bg="#E1EEF6" />
            <Stat n={dayStats.feedCount} label="횟수" c="#C9982E" bg="#FFF3D6" />
          </div>
          <p style={{ textAlign: "center", fontSize: 12, color: "#B7AE9E", margin: "8px 0 16px" }}>
            {statDate === todayStr() ? "오늘" : statDate} 수유 기록 🍼
          </p>
          <button style={cookBtn} onClick={() => openFeedForm()}>＋ 수유·분유·물 기록하기</button>

          <div style={{ marginTop: 18 }}>
            {feeds.filter((f) => f.date === statDate).length === 0 ? (
              <p style={{ textAlign: "center", color: "#B7AE9E", fontSize: 13, padding: "10px 0" }}>이 날 기록이 없어요. ＋로 추가해봐요!</p>
            ) : (
              feeds.filter((f) => f.date === statDate).sort((a, b) => (b.time || "").localeCompare(a.time || "")).map((f) => (
                <div key={f.id} style={feedRow}>
                  <span style={{ fontSize: 20 }}>{FEED_EMOJI[f.kind] || "🍼"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: "#4A4438" }}>{f.kind} <span style={{ color: "#5C9A6B" }}>{f.amount}ml</span></div>
                    <div style={{ fontSize: 11.5, color: "#B7AE9E" }}>{f.time || "시간 미기록"}</div>
                  </div>
                  <button style={miniBtn} onClick={() => openFeedForm(f)}>수정</button>
                  <button style={{ ...miniBtn, color: "#D06A60" }} onClick={() => { if (window.confirm("이 기록을 삭제할까요?")) removeFeed(f.id); }}>삭제</button>
                </div>
              ))
            )}
          </div>
          <p style={tip}>🍼 분유·모유·물·간식을 먹을 때마다 ml로 기록하면 📊 통계에서 하루 총량이 자동으로 합산돼요.</p>
        </>
      )}

      {view === "stats" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, margin: "4px 0 16px" }}>
            <button style={miniBtn} onClick={() => setStatDate(shiftDay(statDate, -1))}>‹ 어제</button>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#4A4438" }}>{statDate === todayStr() ? "오늘" : statDate}</span>
            <button style={miniBtn} onClick={() => setStatDate(shiftDay(statDate, 1))} disabled={statDate >= todayStr()}>내일 ›</button>
          </div>

          <div style={{ background: "linear-gradient(135deg,#EAF6E6,#E1EEF6)", borderRadius: 20, padding: "20px 16px", textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#8A8170", fontWeight: 600 }}>오늘 총 섭취량</div>
            <div style={{ fontSize: 38, fontWeight: 800, color: "#4A4438", lineHeight: 1.1, margin: "4px 0" }}>{dayStats.total.toLocaleString()}<span style={{ fontSize: 18 }}>ml</span></div>
            <div style={{ fontSize: 12, color: "#8A8170" }}>분유·모유 + 이유식 + 물 다 합쳐서예요</div>
          </div>

          <div style={grid2}>
            <StatBig emoji="🍼" label="분유·모유" val={`${dayStats.milk}ml`} />
            <StatBig emoji="🥣" label="이유식" val={`${dayStats.mealMl}ml`} sub={`${dayStats.mealCount}끼`} />
            <StatBig emoji="💧" label="물" val={`${dayStats.water}ml`} />
            <StatBig emoji="🍪" label="간식" val={`${dayStats.snackFeed}ml`} />
          </div>

          <p style={tip}>📊 수유(🍼)랑 식사기록(📖)에 ml를 넣으면 여기 하루 총량이 자동으로 쌓여요. 재료별 빈도·영양 밸런스 통계는 곧 추가할게요!</p>
        </>
      )}

      {/* 상태 선택 시트 */}
      {active && (
        <div style={overlay} onClick={() => setActive(null)}>
          <div style={sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 34 }}>{active.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#4A4438", marginTop: 2 }}>
                {active.name} {active.allergen && <span style={{ color: "#D06A60", fontSize: 13 }}>· 주의 식품</span>}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "14px 0" }}>
              {ORDER.map((k) => {
                const s = STATUS[k];
                const on = (records[active.id]?.status || "none") === k;
                return (
                  <button key={k} onClick={() => setStatus(active.id, k)}
                    style={{ ...statusBtn, background: s.bg, color: s.fg, boxShadow: on ? `0 0 0 2.5px ${s.fg}` : `inset 0 0 0 1.5px ${s.ring}` }}>
                    <span style={{ fontSize: 18 }}>{s.emoji}</span> {s.label}
                  </button>
                );
              })}
            </div>
            <textarea placeholder="메모 (예: 첫날 입가 살짝 붉어짐, 다음날 괜찮음)"
              value={records[active.id]?.memo || ""} onChange={(e) => setMemo(active.id, e.target.value)} style={memoBox} />
            {String(active.id).startsWith("c_") && (
              <>
                <div style={{ margin: "6px 0 10px" }}>
                  <div style={{ fontSize: 12, color: "#B7AE9E", fontWeight: 600, margin: "0 0 6px 2px" }}>📂 카테고리 이동</div>
                  <select
                    value={custom.find((c) => c.id === active.id)?.cat || "직접 추가"}
                    onChange={(e) => moveCustom(active.id, e.target.value)}
                    style={{ ...input, marginBottom: 0, appearance: "none", cursor: "pointer" }}>
                    {SEED.map(([cat]) => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="직접 추가">직접 추가</option>
                  </select>
                </div>
                <button style={deleteBtn}
                  onClick={() => { if (window.confirm(`'${active.name}' 재료를 삭제할까요?`)) removeCustom(active.id); }}>
                  🗑️ 이 재료 삭제 (직접 추가한 재료)
                </button>
              </>
            )}
            <button style={doneBtn} onClick={() => setActive(null)}>닫기</button>
          </div>
        </div>
      )}

      {/* 재료 추가 시트 */}
      {adding && (
        <div style={overlay} onClick={() => setAdding(false)}>
          <div style={sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#4A4438", marginBottom: 12, textAlign: "center" }}>새 재료 추가</div>
            <input autoFocus placeholder="재료 이름 (예: 단호박)" value={newName}
              onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCustom()} style={input} />
            <button style={doneBtn} onClick={addCustom}>추가하기</button>
          </div>
        </div>
      )}

      {/* 식사 기록 추가/수정 시트 */}
      {mealForm && (
        <div style={overlay} onClick={() => setMealForm(null)}>
          <div style={{ ...sheet, maxHeight: "86vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#4A4438", marginBottom: 14, textAlign: "center" }}>
              {mealForm.id ? "✏️ 식사 기록 수정" : "📖 식사 기록하기"}
            </div>
            <input type="date" value={mealForm.date} onChange={(e) => setMealForm((f) => ({ ...f, date: e.target.value }))} style={{ ...input, marginBottom: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 14 }}>
              {SLOTS.map((s) => {
                const on = mealForm.slot === s.key;
                return (
                  <button key={s.key} onClick={() => setMealForm((f) => ({ ...f, slot: s.key }))}
                    style={{ ...stageChip, ...(on ? stageOn : {}) }}>
                    <span style={{ fontSize: 17 }}>{s.emoji}</span>
                    <span style={{ fontWeight: 700 }}>{s.key}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 12, color: "#B7AE9E", fontWeight: 600, whiteSpace: "nowrap" }}>시간 (선택)</span>
              <input type="time" value={mealForm.time} onChange={(e) => setMealForm((f) => ({ ...f, time: e.target.value }))} style={{ ...input, marginBottom: 0, flex: 1 }} />
              {mealForm.time && (
                <button style={{ ...miniBtn, color: "#B7AE9E" }} onClick={() => setMealForm((f) => ({ ...f, time: "" }))}>지우기</button>
              )}
            </div>
            <p style={{ ...h2, margin: "0 0 8px 2px" }}>무슨 조합으로 먹었나요? <span style={{ color: "#5C9A6B" }}>{mealForm.items.length || ""}</span></p>
            {edibleItems.length === 0 ? (
              <p style={{ fontSize: 12, color: "#B7AE9E", lineHeight: 1.6, margin: "0 0 12px" }}>
                먼저 '재료체크'에서 먹어본 재료를 '테스트 중' 또는 '통과'로 표시해 주세요!
              </p>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14, maxHeight: 190, overflowY: "auto" }}>
                {edibleItems.map((it) => {
                  const on = mealForm.items.includes(it.name);
                  return (
                    <button key={it.id} onClick={() => toggleMealItem(it.name)} style={{ ...pickChip, ...(on ? pickOn : {}) }}>
                      {it.emoji} {it.name}
                    </button>
                  );
                })}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
              <span style={{ fontSize: 12.5, color: "#8A8170", fontWeight: 600, whiteSpace: "nowrap" }}>얼마나 먹었나요?</span>
              <input inputMode="numeric" placeholder="예: 120" value={mealForm.amount}
                onChange={(e) => setMealForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, "") }))}
                style={{ ...input, marginBottom: 0, flex: 1, textAlign: "right" }} />
              <span style={{ fontSize: 13, color: "#8A8170", fontWeight: 700 }}>ml</span>
            </div>
            <textarea placeholder="메모 (예: 잘 먹음 / 새 재료 연어 첫 도전 — 발진 없음)"
              value={mealForm.memo} onChange={(e) => setMealForm((f) => ({ ...f, memo: e.target.value }))} style={memoBox} />
            <button style={{ ...doneBtn, background: "#5C9A6B", opacity: mealForm.items.length ? 1 : 0.5 }}
              disabled={!mealForm.items.length} onClick={saveMeal}>
              {mealForm.items.length ? `${mealForm.items.length}가지 조합 저장` : "재료를 골라주세요"}
            </button>
            <button style={{ ...doneBtn, background: "#EFEBE2", color: "#8A8170", marginTop: 8 }} onClick={() => setMealForm(null)}>취소</button>
          </div>
        </div>
      )}

      {/* 수유 기록 시트 */}
      {feedForm && (
        <div style={overlay} onClick={() => setFeedForm(null)}>
          <div style={sheet} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontWeight: 800, fontSize: 16, textAlign: "center", marginBottom: 14, color: "#4A4438" }}>
              {feedForm.id ? "✏️ 수유 기록 수정" : "🍼 수유·분유·물 기록"}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 12 }}>
              {FEED_KINDS.map((k) => (
                <button key={k} onClick={() => setFeedForm((f) => ({ ...f, kind: k }))}
                  style={{ ...stageChip, ...(feedForm.kind === k ? stageOn : {}) }}>
                  <span style={{ fontSize: 17 }}>{FEED_EMOJI[k]}</span>
                  <span style={{ fontWeight: 700 }}>{k}</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <input inputMode="numeric" autoFocus placeholder="양 (예: 150)" value={feedForm.amount}
                onChange={(e) => setFeedForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, "") }))}
                style={{ ...input, marginBottom: 0, flex: 1, fontSize: 20, fontWeight: 800, textAlign: "center" }} />
              <span style={{ fontSize: 15, color: "#8A8170", fontWeight: 700 }}>ml</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input type="date" value={feedForm.date} onChange={(e) => setFeedForm((f) => ({ ...f, date: e.target.value }))} style={{ ...input, marginBottom: 0, flex: 1 }} />
              <input type="time" value={feedForm.time} onChange={(e) => setFeedForm((f) => ({ ...f, time: e.target.value }))} style={{ ...input, marginBottom: 0, flex: 1 }} />
            </div>
            <button style={{ ...doneBtn, background: "#5C9A6B", opacity: feedForm.amount ? 1 : 0.5 }} disabled={!feedForm.amount} onClick={saveFeed}>
              {feedForm.amount ? `${feedForm.kind} ${feedForm.amount}ml 저장` : "양을 입력해주세요"}
            </button>
            <button style={{ ...doneBtn, background: "#EFEBE2", color: "#8A8170", marginTop: 8 }} onClick={() => setFeedForm(null)}>취소</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PIN 잠금 화면 ──────────────────────────────────────────
function PinGate({ onOk }) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  const press = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      if (next === PIN) {
        setTimeout(onOk, 120);
      } else {
        setShake(true);
        setTimeout(() => { setShake(false); setPin(""); }, 420);
      }
    }
  };
  const back = () => setPin((p) => p.slice(0, -1));

  return (
    <div style={pinWrap}>
      <style>{css}</style>
      <div style={{ fontSize: 38, marginBottom: 8 }}>🍼</div>
      <h1 style={{ ...h1, marginBottom: 4 }}>우리 아기 이유식 도장깨기</h1>
      <p style={{ ...sub, marginBottom: 26 }}>비밀번호 4자리를 눌러주세요</p>

      <div className={shake ? "shake" : ""} style={pinDots}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ ...pinDot, ...(i < pin.length ? pinDotOn : {}) }} />
        ))}
      </div>

      <div style={pinPad}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} style={pinKey} onClick={() => press(d)}>{d}</button>
        ))}
        <span />
        <button style={pinKey} onClick={() => press("0")}>0</button>
        <button style={{ ...pinKey, fontSize: 18, color: "#B7AE9E" }} onClick={back}>⌫</button>
      </div>
    </div>
  );
}

function Stat({ n, label, c, bg }) {
  return (
    <div style={{ ...statBox, background: bg }}>
      <div style={{ fontSize: 24, fontWeight: 800, color: c, lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 11, color: c, fontWeight: 600, marginTop: 3 }}>{label}</div>
    </div>
  );
}

const FEED_EMOJI = { 분유: "🍼", 모유: "🤱", 물: "💧", 간식: "🍪" };
function shiftDay(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  const p = (x) => String(x).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
function StatBig({ emoji, label, val, sub }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ECE7DC", borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11.5, color: "#8A8170", fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#4A4438" }}>{val} {sub && <span style={{ fontSize: 11, color: "#B7AE9E", fontWeight: 600 }}>· {sub}</span>}</div>
      </div>
    </div>
  );
}

// ── 스타일 ─────────────────────────────────────────────────
const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6 };
const feedRow = { display: "flex", alignItems: "center", gap: 11, padding: "11px 12px", background: "#fff", border: "1px solid #ECE7DC", borderRadius: 13, marginBottom: 8 };
const wrap = { maxWidth: 460, margin: "0 auto", padding: "26px 16px 60px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif", background: "#FBFAF6", minHeight: "100vh", color: "#4A4438" };
const h1 = { fontSize: 21, fontWeight: 800, margin: "8px 0 2px", letterSpacing: "-0.5px" };
const sub = { fontSize: 12.5, color: "#B7AE9E", margin: 0 };
const tabs = { display: "flex", flexWrap: "wrap", gap: 4, background: "#EFEBE2", padding: 4, borderRadius: 14, marginBottom: 18 };
const tab = { flex: "1 0 30%", border: "none", background: "transparent", padding: "9px 4px", borderRadius: 10, fontSize: 11.5, fontWeight: 700, color: "#9A917E", cursor: "pointer", whiteSpace: "nowrap" };
const tabOn = { background: "#FFFDF8", color: "#5A5346", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const bulkBtn = { border: "none", background: "#F1ECE1", color: "#9A917E", fontSize: 11, fontWeight: 700, padding: "5px 10px", borderRadius: 8, cursor: "pointer", whiteSpace: "nowrap" };
const statRow = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 };
const statBox = { borderRadius: 16, padding: "12px 0", textAlign: "center" };
const progressTrack = { height: 8, background: "#EDEAE2", borderRadius: 99, overflow: "hidden" };
const progressFill = { height: "100%", background: "linear-gradient(90deg,#A7D7A0,#5C9A6B)", borderRadius: 99, transition: "width .4s ease" };
const h2 = { fontSize: 13.5, fontWeight: 700, color: "#8A8170", margin: "0 0 10px 2px" };
const grid = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 };
const card = { position: "relative", border: "none", cursor: "pointer", borderRadius: 16, padding: "12px 4px 9px", display: "flex", flexDirection: "column", alignItems: "center", transition: "transform .12s ease", aspectRatio: "1/1.05", justifyContent: "center" };
const allergenDot = { position: "absolute", top: 6, right: 6, width: 15, height: 15, borderRadius: 99, background: "#F0C27B", color: "#7A5410", fontSize: 10, fontWeight: 800, display: "grid", placeItems: "center", lineHeight: 1 };
const addBtn = { width: "100%", padding: "13px", borderRadius: 14, border: "1.5px dashed #D8D2C4", background: "transparent", color: "#9A917E", fontWeight: 600, fontSize: 13.5, cursor: "pointer", marginTop: 4 };
const tip = { fontSize: 11.5, color: "#A9A091", lineHeight: 1.7, marginTop: 18, padding: "0 4px" };
const stageRow = { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 16 };
const stageChip = { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, border: "none", borderRadius: 12, padding: "10px 0", background: "#F3F1EC", color: "#9A917E", cursor: "pointer", fontSize: 13 };
const stageOn = { background: "#E4F2E1", color: "#5C9A6B", boxShadow: "inset 0 0 0 1.5px #BFE0BC" };
const safeBox = { background: "#FFFDF8", borderRadius: 16, padding: 14, boxShadow: "inset 0 0 0 1.5px #ECE7DC", marginBottom: 12 };
const cookBtn = { width: "100%", padding: 15, borderRadius: 14, border: "none", background: "#5C9A6B", color: "#fff", fontWeight: 800, fontSize: 14.5, cursor: "pointer" };
const recipeCard = { background: "#FFFDF8", borderRadius: 18, padding: 16, marginBottom: 12, boxShadow: "0 2px 10px rgba(90,83,70,0.06), inset 0 0 0 1px #F0ECE2" };
const useChip = { fontSize: 11, fontWeight: 700, color: "#5C9A6B", background: "#E4F2E1", borderRadius: 99, padding: "4px 9px" };
const recipeTip = { fontSize: 12, color: "#C9982E", background: "#FFF8E8", borderRadius: 10, padding: "8px 10px", margin: "10px 0 0", lineHeight: 1.6 };
const nextCard = { background: "#F4FAF2", borderRadius: 18, padding: 16, marginBottom: 12, boxShadow: "0 2px 10px rgba(90,83,70,0.06), inset 0 0 0 1px #DCEDD6" };
const nextHow = { fontSize: 12, color: "#5C9A6B", background: "#E4F2E1", borderRadius: 10, padding: "8px 10px", margin: "8px 0 0", lineHeight: 1.6 };
const mealCard = { background: "#FFFDF8", borderRadius: 16, padding: 14, marginBottom: 10, boxShadow: "0 2px 8px rgba(90,83,70,0.05), inset 0 0 0 1px #F0ECE2" };
const miniBtn = { border: "none", background: "transparent", color: "#9A917E", fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "2px 4px" };
const pickChip = { border: "none", borderRadius: 99, padding: "7px 11px", fontSize: 12.5, fontWeight: 600, background: "#F3F1EC", color: "#8A8170", cursor: "pointer" };
const pickOn = { background: "#E4F2E1", color: "#5C9A6B", boxShadow: "inset 0 0 0 1.5px #BFE0BC" };
const overlay = { position: "fixed", inset: 0, background: "rgba(60,54,44,0.32)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 12 };
const sheet = { width: "100%", maxWidth: 420, background: "#FFFDF8", borderRadius: 24, padding: 20, boxShadow: "0 -6px 30px rgba(0,0,0,0.12)" };
const statusBtn = { border: "none", borderRadius: 13, padding: "13px 8px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 };
const memoBox = { width: "100%", boxSizing: "border-box", border: "1.5px solid #ECE7DC", borderRadius: 12, padding: 11, fontSize: 13, resize: "none", height: 64, fontFamily: "inherit", color: "#4A4438", background: "#FBFAF6", outline: "none" };
const input = { width: "100%", boxSizing: "border-box", border: "1.5px solid #ECE7DC", borderRadius: 12, padding: 13, fontSize: 14, fontFamily: "inherit", marginBottom: 12, outline: "none", background: "#FBFAF6" };
const doneBtn = { width: "100%", padding: 13, borderRadius: 13, border: "none", background: "#5A5346", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 12 };
const deleteBtn = { width: "100%", padding: 12, borderRadius: 13, border: "1.5px solid #F2BDB6", background: "#FBE3E0", color: "#D06A60", fontWeight: 700, fontSize: 13, cursor: "pointer", marginTop: 12 };
const pinWrap = { maxWidth: 460, margin: "0 auto", padding: "26px 16px 40px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif", background: "#FBFAF6", minHeight: "100vh", color: "#4A4438", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" };
const pinDots = { display: "flex", gap: 16, marginBottom: 34 };
const pinDot = { width: 14, height: 14, borderRadius: 99, background: "transparent", boxShadow: "inset 0 0 0 2px #D8D2C4" };
const pinDotOn = { background: "#5C9A6B", boxShadow: "inset 0 0 0 2px #5C9A6B" };
const pinPad = { display: "grid", gridTemplateColumns: "repeat(3, 70px)", gap: 14 };
const pinKey = { width: 70, height: 70, borderRadius: 99, border: "none", background: "#FFFDF8", boxShadow: "0 2px 8px rgba(90,83,70,0.08), inset 0 0 0 1px #F0ECE2", fontSize: 24, fontWeight: 600, color: "#5A5346", cursor: "pointer" };
const css = `
  .card:active { transform: scale(0.94); }
  * { -webkit-tap-highlight-color: transparent; }
  body { margin: 0; }
  @keyframes wob { 0%,100%{transform:rotate(-12deg)} 50%{transform:rotate(12deg)} }
  .pot { animation: wob .7s ease-in-out infinite; display:inline-block; }
  @keyframes shk { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
  .shake { animation: shk .42s ease; }
`;
