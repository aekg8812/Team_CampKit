// ========================================
// Claude API連携
// VITE_USE_API=true のときだけ本物のAPIを呼ぶ
// false（既定）なら固定データ／モックで動く
// ========================================

import { getTasksForHabit } from "../data/tasksByHabit";

const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;
const USE_API = import.meta.env.VITE_USE_API === "true";
const MODEL = "claude-sonnet-4-6";

async function callClaude(content, maxTokens = 512) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  });
  const data = await res.json();
  return (data.content || [])
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
}

// ───────── 画像の証拠判定 ─────────
// 戻り値: { ok: boolean, message: string }
// message は画像の中身に具体的に触れた一言コメント
export async function judgeEvidence({ base64, mediaType, taskText }) {
  if (!USE_API || !API_KEY) {
    return { ok: true, message: "証拠を受理しました（モック判定）" };
  }

  try {
    const content = [
      {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64 },
      },
      {
        type: "text",
        text:
          `課題：「${taskText}」\n` +
          `この画像が課題の証拠として妥当かゆるく判定し、画像の具体的な内容に触れた一言コメントを日本語で返してください。\n` +
          `方針：「明らかに無関係・明らかにサボり」でない限り合格。グレーは合格。\n` +
          `合格コメント例：「机の上がすっきりしてますね」「外を歩いた様子が伝わります」\n` +
          `必ず次のJSONのみ出力：{ "ok": true か false, "message": "画像の具体的な内容に触れた一言" }`,
      },
    ];
    const raw = await callClaude(content, 256);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    return { ok: !!parsed.ok, message: parsed.message || "判定しました" };
  } catch {
    return { ok: true, message: "判定できませんでしたが受理しました" };
  }
}

// ───────── サボり傾向診断 ─────────
// 戻り値: string（診断テキスト 2〜3文）

const DIAGNOSIS_FALLBACKS = {
  sns: [
    "スマホが手放せない典型的なパターンです。通知音が心音になってますよ。",
    "SNSは「15分だけ」のつもりが2時間コースですね。アルゴリズムに時間を搾取されています。",
    "スクロールが止まらない症候群。指が勝手に動いているのはあなたではなくアルゴリズムです。",
  ],
  room: [
    "「いつか片付ける」が口癖になってますね。その「いつか」は来ません。",
    "床と物の境界線が曖昧になっているタイプです。慣れは恐ろしい。",
    "片付けの先延ばし名人。今も視界に入っているゴミを見て見ぬふりしていますよね？",
  ],
  exercise: [
    "運動は「明日から」を永遠に更新し続けているタイプです。更新期限がありません。",
    "体を動かすことへの抵抗感が強め。でも筋肉痛になった後の爽快感は知っているはず。",
    "ジムへの課金と実際の利用率に大きな乖離がありそうです。",
  ],
  sabo: [
    "先延ばしのプロです。タスクを見ると急に部屋の掃除がしたくなるタイプ。",
    "やる気スイッチを探し続けて数年。もうスイッチは諦めて体を動かしてください。",
    "積読の山があなたの良心の象徴になっています。本も読まれたがっています。",
  ],
  human: [
    "既読スルーが得意技ですね。相手もだいぶ待っています。",
    "連絡の重さが増すほど後回しにするタイプ。雪だるま方式で義務が増えていきます。",
    "LINEの未読バッジが増えても見て見ぬふりできる、ある種の才能の持ち主です。",
  ],
  morning: [
    "アラームのスヌーズ活用率ナンバーワン。7時起床のつもりが実際は9時タイプ。",
    "「あと5分」を繰り返して1時間溶かす達人。朝の時間感覚が少し壊れています。",
    "夜型の言い訳コレクションが充実してますね。でも朝の清々しさも知っているはず。",
  ],
  meal: [
    "コンビニと出前が主食になりかけてますね。財布と体に聞いてみてください。",
    "「野菜食べなきゃ」と思いながら今日もファストフードコースですね。",
    "自炊は面倒でも、食べた後の満足感は段違いのはず。まずハードルを下げてみましょう。",
  ],
};

const DIAGNOSIS_DEFAULT = [
  "サボり癖がしっかり定着してますね。でも気づいているだけエラいです。",
  "先延ばし体質ですが、こうして取り組もうとしているのは本物の一歩です。",
  "なかなかのサボり上級者ですが、直したい気持ちもちゃんとある。そのギャップが武器です。",
];

export async function diagnoseAnswers({ habitId, habitLabel, questions, answers }) {
  if (!USE_API || !API_KEY) {
    const pool = DIAGNOSIS_FALLBACKS[habitId] || DIAGNOSIS_DEFAULT;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  try {
    const qa = questions
      .map((q, i) => `Q: ${q.q}\nA: ${q.options[answers[i]] ?? "不明"}`)
      .join("\n\n");

    const prompt =
      `カテゴリ：「${habitLabel}」のサボり傾向チェックの回答結果です。\n\n${qa}\n\n` +
      `この回答パターンから、その人のサボり傾向を2〜3文で診断してください。\n` +
      `トーンは「毒舌すぎず、図星を突く・少し笑える」程度。出力は診断文のみ（JSON不要）。`;

    const result = await callClaude(prompt, 256);
    return result || DIAGNOSIS_DEFAULT[0];
  } catch {
    const pool = DIAGNOSIS_FALLBACKS[habitId] || DIAGNOSIS_DEFAULT;
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

// ───────── AI課題生成 ─────────
// 戻り値: [{ id, text, level }, ...] × 3件（getTasksForHabit と同形式）

export async function generateTasks({ habitId, habitLabel, level, answers }) {
  if (!USE_API || !API_KEY) {
    return getTasksForHabit(habitId, level);
  }

  try {
    const levelDesc =
      level === 3 ? "しっかり取り組む（30分以上かかる）"
      : level === 2 ? "中程度（15〜30分かかる）"
      : "軽め（5〜15分でできる）";

    const prompt =
      `カテゴリ：「${habitLabel}」のサボり癖を克服するための課題を3個生成してください。\n` +
      `難易度：レベル${level}（${levelDesc}）\n` +
      `条件：短い実行可能な行動、今日中にできること、具体的。\n` +
      `例：「寝る1時間前にスマホを別室に置く」「腹筋20回」「机の上を5分片付ける」\n` +
      `必ず次のJSON配列のみ出力：[{"text":"課題文"},{"text":"課題文"},{"text":"課題文"}]`;

    const raw = await callClaude(prompt, 384);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("invalid");

    return parsed.slice(0, 3).map((item, i) => ({
      id: `ai-${habitId}-${level}-${i}-${Date.now()}`,
      text: typeof item === "string" ? item : item.text,
      level,
    }));
  } catch {
    return getTasksForHabit(habitId, level);
  }
}
