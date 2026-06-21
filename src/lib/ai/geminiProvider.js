// ============================================================
// Gemini API 呼び出し（純粋な API コール層）
// このファイルはフォールバック・スイッチを一切持たない。
// 失敗時は throw する → ai/index.js が受け取ってフォールバックする。
// ============================================================

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// ▼ モデル名・エンドポイント。変更はここのみ
const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const hasKey = () => !!API_KEY;

async function callGemini(parts) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": API_KEY,
    },
    body: JSON.stringify({ contents: [{ parts }] }),
  });
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ?? "";
  if (!text) throw new Error("Gemini: empty response");
  return text.trim();
}

// ───────── 画像の証拠判定 ─────────
export async function judgeEvidence({ base64, mediaType, taskText }) {
  const parts = [
    { inlineData: { mimeType: mediaType, data: base64 } },
    {
      text:
        `課題：「${taskText}」\n` +
        `この画像が課題の証拠として妥当かゆるく判定し、画像の具体的な内容に触れた一言コメントを日本語で返してください。\n` +
        `方針：「明らかに無関係・明らかにサボり」でない限り合格。グレーは合格。\n` +
        `score は 0〜100 の整数で「課題に対する証拠の妥当性」を表す（高いほどよい）。\n` +
        `必ずJSONのみを出力。前後に説明やコードフェンスを付けない：{"ok":true,"score":85,"message":"一言"}`,
    },
  ];
  const raw = await callGemini(parts);
  const parsed = JSON.parse(extractJson(raw, "object"));
  return {
    ok: !!parsed.ok,
    score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, Math.round(parsed.score))) : 75,
    message: parsed.message || "判定しました",
  };
}

// ───────── 後半5問の動的生成 ─────────
// 前半5問の回答(priorQA)を踏まえ、深掘りする質問を5問作る。
// 返り値: [{ q, options:[4] }, ...]
export async function generateQuestions({ habitLabel, priorQA }) {
  const parts = [
    {
      text:
        `カテゴリ：「${habitLabel}」のサボり傾向チェックです。前半5問の回答は次の通り：\n\n${priorQA}\n\n` +
        `この回答内容を踏まえて、さらに深掘りする質問を「5問」日本語で作ってください。\n` +
        `各質問には選択肢を4つ用意し、最後の選択肢は「正直で少し笑える」ものにしてください。\n` +
        `必ずJSON配列のみを出力。前後に説明やコードフェンスを付けない：\n` +
        `[{"q":"質問文","options":["選択肢1","選択肢2","選択肢3","選択肢4"]}, ... 5個]`,
    },
  ];
  const raw = await callGemini(parts);
  const parsed = JSON.parse(extractJson(raw, "array"));
  const questions = (Array.isArray(parsed) ? parsed : [])
    .filter((x) => x && typeof x.q === "string" && Array.isArray(x.options) && x.options.length >= 2)
    .slice(0, 5)
    .map((x) => ({ q: x.q, options: x.options.slice(0, 4).map(String) }));
  if (questions.length === 0) throw new Error("no valid questions");
  return questions;
}

// AIの返答からJSON部分だけ取り出す（前後にprose/コードフェンスが混ざっても拾う）
function extractJson(raw, kind) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const re = kind === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const m = cleaned.match(re);
  return m ? m[0] : cleaned;
}

// ───────── サボり傾向診断 ─────────
export async function diagnoseAnswers({ habitLabel, questions, answers }) {
  const qa = questions
    .map((q, i) => `Q: ${q.q}\nA: ${q.options[answers[i]] ?? "不明"}`)
    .join("\n\n");
  const parts = [
    {
      text:
        `カテゴリ：「${habitLabel}」のサボり傾向チェックの回答結果です。\n\n${qa}\n\n` +
        `この回答パターンから、その人のサボり傾向を2〜3文で診断してください。\n` +
        `トーンは「毒舌すぎず、図星を突く・少し笑える」程度。診断文のみ出力（JSONや前置き不要）。`,
    },
  ];
  return await callGemini(parts);
}

// ───────── AI課題生成 ─────────
export async function generateTasks({ habitId, habitLabel, level }) {
  const levelDesc =
    level === 3 ? "しっかり取り組む（30分以上かかる）"
    : level === 2 ? "中程度（15〜30分かかる）"
    : "軽め（5〜15分でできる）";
  const parts = [
    {
      text:
        `カテゴリ：「${habitLabel}」のサボり癖を克服するための課題を3個生成してください。\n` +
        `難易度：レベル${level}（${levelDesc}）\n` +
        `条件：短い実行可能な行動、今日中にできること、具体的。\n` +
        `必ずJSONのみを出力。前後に説明やコードフェンスを付けない：[{"text":"課題文"},{"text":"課題文"},{"text":"課題文"}]`,
    },
  ];
  const raw = await callGemini(parts);
  const parsed = JSON.parse(extractJson(raw, "array"));
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("invalid response");
  const defaultPenalty = level === 3 ? 8 : level === 2 ? 6 : 4;
  const tasks = parsed.slice(0, 3).map((item, i) => ({
    id: `ai-gemini-${habitId}-${level}-${i}-${Date.now()}`,
    text: typeof item === "string" ? item : item?.text,
    level,
    penaltyLevel: defaultPenalty,
  })).filter((t) => typeof t.text === "string" && t.text.trim());
  // text を持たない項目が全滅したら固定データへフォールバックさせる
  if (tasks.length === 0) throw new Error("no valid task text");
  return tasks;
}
