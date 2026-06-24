import { useState, useEffect, useMemo } from "react";

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

// ── 이유식 단계 ────────────────────────────────────────────
const STAGES = [
  { key: "early",  label: "초기", age: "만 4~6개월",  desc: "초기 이유식. 10배죽/미음, 재료는 곱게 갈아 묽게." },
  { key: "mid",    label: "중기", age: "만 7~8개월",  desc: "중기 이유식. 5~7배죽, 재료는 으깨거나 잘게." },
  { key: "late",   label: "후기", age: "만 9~11개월", desc: "후기 이유식. 무른밥/진밥, 재료는 잘게 다져 손가락 크기 핑거푸드도 가능." },
  { key: "fin",    label: "완료기", age: "만 12개월~", desc: "완료기. 진밥/유아식, 재료는 작게 썰어 다양한 식감." },
];

export default function App() {
  const [view, setView] = useState("tracker"); // tracker | recipes
  const [records, setRecords] = useState({});
  const [custom, setCustom] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  // 레시피 상태
  const [stage, setStage] = useState("late");
  const [recipes, setRecipes] = useState([]);
  const [cooking, setCooking] = useState(false);
  const [recipeErr, setRecipeErr] = useState("");

  // 데이터 로드 (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        setRecords(d.records || {});
        setCustom(d.custom || []);
      }
    } catch (e) {}
    setLoaded(true);
  }, []);

  const persist = (nr, nc) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ records: nr, custom: nc })); }
    catch (e) { console.error(e); }
  };

  const allItems = useMemo(() => {
    const base = SEED.flatMap(([cat, list]) =>
      list.map(([name, emoji, allergen]) => ({ id: name, name, emoji, allergen: !!allergen, cat }))
    );
    return [...base, ...custom.map((c) => ({ ...c, cat: "직접 추가" }))];
  }, [custom]);

  const grouped = useMemo(() => {
    const cats = [...SEED.map(([c]) => c)];
    if (custom.length) cats.push("직접 추가");
    return cats.map((cat) => ({ cat, items: allItems.filter((i) => i.cat === cat) }));
  }, [allItems, custom.length]);

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

  // ── 레시피 추천 (AI 연동은 백엔드 준비 후 제공 예정) ──
  const getRecipes = async () => {
    setCooking(true); setRecipeErr(""); setRecipes([]);
    await new Promise((r) => setTimeout(r, 500));
    setCooking(false);
    setRecipeErr("AI 레시피 추천 기능은 곧 추가될 예정이에요! 🍳 지금은 위 '통과한 재료'를 참고해서 자유롭게 만들어 주세요.");
  };

  if (!loaded) return <div style={{ ...wrap, display: "grid", placeItems: "center", color: "#B7AE9E" }}>불러오는 중…</div>;

  return (
    <div style={wrap}>
      <style>{css}</style>

      <header style={{ textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 30, lineHeight: 1 }}>🍼</div>
        <h1 style={h1}>우리 아기 이유식 도장깨기</h1>
        <p style={sub}>먹어본 재료 기록 · 통과 재료로 레시피 추천</p>
      </header>

      {/* 탭 */}
      <div style={tabs}>
        <button style={{ ...tab, ...(view === "tracker" ? tabOn : {}) }} onClick={() => setView("tracker")}>📋 체크리스트</button>
        <button style={{ ...tab, ...(view === "recipes" ? tabOn : {}) }} onClick={() => setView("recipes")}>🍳 오늘 뭐먹지</button>
      </div>

      {view === "tracker" ? (
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
      ) : (
        <>
          {/* 단계 선택 */}
          <p style={{ ...h2, marginBottom: 8 }}>우리 아기 단계</p>
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
            {cooking ? "🍲 레시피 끓이는 중…" : safeNames.length < 2 ? "재료를 2가지 이상 통과시켜 주세요" : "🍳 이 재료로 레시피 추천받기"}
          </button>

          {recipeErr && <p style={{ color: "#C9982E", fontSize: 12.5, textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>{recipeErr}</p>}

          {cooking && <div style={{ textAlign: "center", fontSize: 30, marginTop: 18 }} className="pot">🥄</div>}

          <div style={{ marginTop: 16 }}>
            {recipes.map((r, i) => (
              <div key={i} style={recipeCard}>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: "#4A4438", marginBottom: 8 }}>🍽️ {r.name}</div>
                {r.uses?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10 }}>
                    {r.uses.map((u, j) => <span key={j} style={useChip}>{u}</span>)}
                  </div>
                )}
                <ol style={{ margin: 0, paddingLeft: 18, color: "#5A5346", fontSize: 13, lineHeight: 1.7 }}>
                  {r.steps?.map((s, j) => <li key={j} style={{ marginBottom: 3 }}>{s}</li>)}
                </ol>
                {r.tip && <p style={recipeTip}>💡 {r.tip}</p>}
              </div>
            ))}
          </div>
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
const tabs = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, background: "#EFEBE2", padding: 4, borderRadius: 14, marginBottom: 18 };
const tab = { border: "none", background: "transparent", padding: "9px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 700, color: "#9A917E", cursor: "pointer" };
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
const overlay = { position: "fixed", inset: 0, background: "rgba(60,54,44,0.32)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50, padding: 12 };
const sheet = { width: "100%", maxWidth: 420, background: "#FFFDF8", borderRadius: 24, padding: 20, boxShadow: "0 -6px 30px rgba(0,0,0,0.12)" };
const statusBtn = { border: "none", borderRadius: 13, padding: "13px 8px", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 };
const memoBox = { width: "100%", boxSizing: "border-box", border: "1.5px solid #ECE7DC", borderRadius: 12, padding: 11, fontSize: 13, resize: "none", height: 64, fontFamily: "inherit", color: "#4A4438", background: "#FBFAF6", outline: "none" };
const input = { width: "100%", boxSizing: "border-box", border: "1.5px solid #ECE7DC", borderRadius: 12, padding: 13, fontSize: 14, fontFamily: "inherit", marginBottom: 12, outline: "none", background: "#FBFAF6" };
const doneBtn = { width: "100%", padding: 13, borderRadius: 13, border: "none", background: "#5A5346", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 12 };
const css = `
  .card:active { transform: scale(0.94); }
  * { -webkit-tap-highlight-color: transparent; }
  body { margin: 0; }
  @keyframes wob { 0%,100%{transform:rotate(-12deg)} 50%{transform:rotate(12deg)} }
  .pot { animation: wob .7s ease-in-out infinite; display:inline-block; }
`;
