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
          cloud && (Object.keys(cloud.records || {}).length || (cloud.custom || []).length || (cloud.meals || []).length);

        if (cloudHasData) {
          // 클라우드 데이터로 갱신 + 로컬 캐시 업데이트
          setRecords(cloud.records || {});
          setCustom(cloud.custom || []);
          setMeals(cloud.meals || []);
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

  const persist = (nr = records, nc = custom, nm = meals) => {
    const payload = { records: nr, custom: nc, meals: nm };
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

  // ── 식사 기록 ──
  const openMealForm = (m) => {
    if (m) {
      setMealForm({ id: m.id, date: mealDate(m), slot: mealSlot(m), time: mealTime(m), items: m.items, memo: m.memo || "" });
      return;
    }
    const now = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    setMealForm({
      id: null,
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      slot: inferSlot(now.getHours()),
      time: "", // 시간은 옵션
      items: [], memo: "",
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
    };
    const nm = mealForm.id ? meals.map((m) => (m.id === entry.id ? entry : m)) : [entry, ...meals];
    setMeals(nm); persist(records, custom, nm); setMealForm(null);
  };
  const removeMeal = (id) => {
    const nm = meals.filter((m) => m.id !== id);
    setMeals(nm); persist(records, custom, nm);
  };

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
        <div style={{ fontSize: 30, lineHeight: 1 }}>🍼</div>
        <h1 style={h1}>우리 아기 이유식 도장깨기</h1>
        <p style={sub}>재료 기록 · 큐브 조합 추천 · 식사 일지</p>
      </header>

      {/* 탭 */}
      <div style={tabs}>
        <button style={{ ...tab, ...(view === "tracker" ? tabOn : {}) }} onClick={() => setView("tracker")}>📋 재료체크</button>
        <button style={{ ...tab, ...(view === "recipes" ? tabOn : {}) }} onClick={() => setView("recipes")}>🍳 추천받기</button>
        <button style={{ ...tab, ...(view === "meals" ? tabOn : {}) }} onClick={() => setView("meals")}>📖 식사기록</button>
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

// ── 스타일 ─────────────────────────────────────────────────
const wrap = { maxWidth: 460, margin: "0 auto", padding: "26px 16px 60px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif", background: "#FBFAF6", minHeight: "100vh", color: "#4A4438" };
const h1 = { fontSize: 21, fontWeight: 800, margin: "8px 0 2px", letterSpacing: "-0.5px" };
const sub = { fontSize: 12.5, color: "#B7AE9E", margin: 0 };
const tabs = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 5, background: "#EFEBE2", padding: 4, borderRadius: 14, marginBottom: 18 };
const tab = { border: "none", background: "transparent", padding: "9px 0", borderRadius: 10, fontSize: 12.5, fontWeight: 700, color: "#9A917E", cursor: "pointer" };
const tabOn = { background: "#FFFDF8", color: "#5A5346", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
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
