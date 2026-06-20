const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
const MODEL = "claude-sonnet-4-6";

// 共通の呼び出し関数（ブラウザ直叩き。ハッカソン用）
async function callClaude({ system, user, maxTokens = 1024 }) {
  if (!API_KEY || API_KEY.startsWith("YOUR_")) {
    throw new Error("no api key");
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      // ⚠️ ブラウザから直接叩くための許可ヘッダ（キーが露出する点に注意）
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  return (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

// ───────────────────────────────
// ① 後半5問の動的生成
// ───────────────────────────────
export async function generateDynamicQuestions(firstHalfSummary) {
  const system = `あなたはAI裁判長です。
被告の前半5問の回答をもとに、サボり傾向を分析し、
最も「図星を突く」追加尋問を5問生成してください。

条件：
・選択肢は必ず4択にすること
・最後の選択肢は「答えたくない」レベルの正直な選択肢にすること
・回答者が「なぜこれを聞かれるのか」と感じるほど傾向に沿っていること
・笑えるが本質を突いていること

必ず以下のJSON配列のみを出力してください（前後に説明文やMarkdownのバッククォートを付けないこと）：
[
  { "q": "質問文", "options": ["選択肢1","選択肢2","選択肢3","選択肢4"] }
]`;

  const user = `被告の前半5問の回答：\n${firstHalfSummary}`;

  try {
    const raw = await callClaude({ system, user, maxTokens: 1024 });
    return safeParseQuestions(raw);
  } catch (e) {
    return FALLBACK_QUESTIONS;
  }
}

function safeParseQuestions(raw) {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 5);
  } catch (e) {
    // パース失敗時のフォールバック質問
  }
  return FALLBACK_QUESTIONS;
}

const FALLBACK_QUESTIONS = [
  { q: "「あとでやる」と言った今日のタスク、いくつ残ってる？", options: ["0個", "1〜2個", "3〜5個", "数えてない"] },
  { q: "スマホを触らず15分、何もせずいられる自信は？", options: ["余裕", "たぶん大丈夫", "たぶん無理", "今も触ってる"] },
  { q: "今週、自分で決めた予定を守れた割合は？", options: ["ほぼ全部", "半分", "ちょっとだけ", "予定とは"] },
  { q: "「やる気が出たらやろう」案件は今いくつ？", options: ["0個", "1〜2個", "3〜5個", "やる気は永遠に来ない"] },
  { q: "この尋問、図星を突かれてる感ある？", options: ["全然", "ちょっと", "けっこう", "見ないでくれ"] },
];

// ───────────────────────────────
// ② 断罪一言 + ③ 予言（まとめて1回のAPIで生成）
// ───────────────────────────────
export async function generateVerdict({
  allAnswers,
  task,
  weather,
  weekday,
  time,
  criminalRecord,
}) {
  const system = `あなたはAI裁判長です。毒舌だが笑えるトーンを保ってください。
以下の被告の回答・判決タスク・外部データをもとに、「断罪一言」と「今夜の行動の予言」を生成します。

【断罪】の条件：
・被告のサボり傾向をズバッと一言で言い当てる（1〜2文）

【予言】の条件：
・3〜4文で構成する
・高確率で実際に当たる、人間の典型的な先延ばし行動を描写する
・外部データ（天気・曜日・時刻・前科）を自然に織り込む
・最後の1文は必ず「今この瞬間に起きていること」への言及にする
  例：「でも今、少し笑っていますね。」「今この瞬間、少し図星だと思っていますね。」

必ず以下のJSONのみを出力（前後に説明やバッククォートを付けない）：
{ "condemnation": "断罪一言", "prophecy": "予言本文" }`;

  const user = `被告の全回答：
${allAnswers}

判決タスク：${task.text}（難易度：${task.difficulty}）

外部データ：
・現在時刻：${time}
・曜日：${weekday}
・天気：${weather.description}${weather.isRain ? "（雨）" : ""}
・前科：${criminalRecord}回`;

  try {
    const raw = await callClaude({ system, user, maxTokens: 1024 });
    return safeParseVerdict(raw, criminalRecord);
  } catch (e) {
    return fallbackVerdict();
  }
}

function safeParseVerdict(raw, criminalRecord) {
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (parsed.condemnation && parsed.prophecy) return parsed;
  } catch (e) {}
  return fallbackVerdict();
}

function fallbackVerdict() {
  return {
    condemnation: "あなたは『明日やる』が口癖の、先延ばし製造機です。",
    prophecy:
      "あなたは今夜、この刑罰をまだやっていない状態でスマホを開きます。" +
      "そして『明日こそ』と思いながら寝ます。" +
      "でも今、少し笑っていますね。",
  };
}
