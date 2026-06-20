// タスク候補（5個まで表示してルーレットで1つ選ぶ）
// 難易度: "low" | "mid" | "high"
const TASK_POOL = [
  { id: "screen", text: "今夜のスクリーンタイムを30分以内に", difficulty: "high", tags: ["sns"] },
  { id: "scroll", text: "寝るまでSNSを開かない", difficulty: "high", tags: ["sns"] },
  { id: "situp", text: "腹筋30回", difficulty: "high", tags: ["exercise"] },
  { id: "squat", text: "スクワット20回", difficulty: "mid", tags: ["exercise"] },
  { id: "walk", text: "外を10分散歩する", difficulty: "mid", tags: ["exercise", "outside"] },
  { id: "read", text: "積んでる本を10ページ読む", difficulty: "mid", tags: ["sabo"] },
  { id: "reply", text: "溜まったLINEに1件返信する", difficulty: "low", tags: ["human"] },
  { id: "clean", text: "机の上を5分だけ片付ける", difficulty: "low", tags: ["life"] },
  { id: "dishes", text: "シンクの食器を全部洗う", difficulty: "mid", tags: ["life"] },
  { id: "earlybed", text: "今日は0時前に布団に入る", difficulty: "high", tags: ["life"] },
];

const DIFFICULTY_WEIGHT = { low: 1, mid: 2, high: 3 };

// answers: 前半5問の選択index配列 [0..3, ...]、weather, criminalRecord を受け取る
export function selectTasks({ answers, weather, criminalRecord }) {
  // 回答の「悪さ」を集計（選択肢の右に行くほど悪い＝index大きい）
  const badness = answers.reduce((sum, idx) => sum + idx, 0); // 0〜15

  // タグごとの加点（特定の悪い回答に反応）
  const tagBoost = {};
  const boost = (tag, n) => (tagBoost[tag] = (tagBoost[tag] || 0) + n);

  if (answers[0] >= 3) boost("sns", 4); // SNS「もはや呼吸」
  if (answers[1] >= 2) boost("life", 3); // 部屋が散らかってる
  if (answers[2] >= 3) boost("sabo", 4); // 先延ばし数えてない
  if (answers[3] >= 3) boost("exercise", 4); // 運動「何それ」
  if (answers[4] >= 2) boost("human", 3); // LINE溜まってる
  if (weather?.isRain) boost("outside", 5); // 雨→外出タスク（逃げ場なし）

  // 各タスクにスコア付け
  const scored = TASK_POOL.map((task) => {
    let score = DIFFICULTY_WEIGHT[task.difficulty] * (1 + badness / 10);
    task.tags.forEach((t) => (score += tagBoost[t] || 0));
    return { ...task, score };
  });

  // スコア上位5個をルーレット候補に
  const candidates = scored.sort((a, b) => b.score - a.score).slice(0, 5);

  // 重み付き抽選で当選タスクを決定
  const winner = weightedPick(candidates);

  // 前科があれば難易度を1段階上げる
  let finalDifficulty = winner.difficulty;
  if (criminalRecord > 0) finalDifficulty = bumpDifficulty(finalDifficulty);

  return {
    candidates, // ルーレットに流す5個
    winner: { ...winner, difficulty: finalDifficulty },
  };
}

function weightedPick(items) {
  const total = items.reduce((s, i) => s + i.score, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.score;
    if (r <= 0) return item;
  }
  return items[0];
}

function bumpDifficulty(d) {
  if (d === "low") return "mid";
  if (d === "mid") return "high";
  return "high";
}
