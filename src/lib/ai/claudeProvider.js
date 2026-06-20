// ============================================================
// Claude API 呼び出し（純粋な API コール層）
// このファイルはフォールバック・スイッチを一切持たない。
// 失敗時は throw する → ai/index.js が受け取ってフォールバックする。
// ============================================================

const API_KEY = import.meta.env.VITE_CLAUDE_API_KEY;

// ▼ モデル名。変更はここのみ
const MODEL = "claude-sonnet-4-6";

export const hasKey = () => !!API_KEY;

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
export async function judgeEvidence({ base64, mediaType, taskText }) {
  const content = [
    { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
    {
      type: "text",
      text:
        `課題：「${taskText}」\n` +
        `この画像が課題の証拠として妥当かゆるく判定し、画像の具体的な内容に触れた一言コメントを日本語で返してください。\n` +
        `方針：「明らかに無関係・明らかにサボり」でない限り合格。グレーは合格。\n` +
        `必ず次のJSONのみ出力（前後に説明やコードフェンスを付けない）：{"ok":true,"message":"一言"}`,
    },
  ];
  const raw = await callClaude(content, 256);
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  return { ok: !!parsed.ok, message: parsed.message || "判定しました" };
}

// ───────── サボり傾向診断 ─────────
export async function diagnoseAnswers({ habitLabel, questions, answers }) {
  const qa = questions
    .map((q, i) => `Q: ${q.q}\nA: ${q.options[answers[i]] ?? "不明"}`)
    .join("\n\n");
  const prompt =
    `カテゴリ：「${habitLabel}」のサボり傾向チェックの回答結果です。\n\n${qa}\n\n` +
    `この回答パターンから、その人のサボり傾向を2〜3文で診断してください。\n` +
    `トーンは「毒舌すぎず、図星を突く・少し笑える」程度。出力は診断文のみ（JSON不要）。`;
  return await callClaude(prompt, 256);
}

// ───────── AI課題生成 ─────────
export async function generateTasks({ habitId, habitLabel, level }) {
  const levelDesc =
    level === 3 ? "しっかり取り組む（30分以上かかる）"
    : level === 2 ? "中程度（15〜30分かかる）"
    : "軽め（5〜15分でできる）";
  const prompt =
    `カテゴリ：「${habitLabel}」のサボり癖を克服するための課題を3個生成してください。\n` +
    `難易度：レベル${level}（${levelDesc}）\n` +
    `条件：短い実行可能な行動、今日中にできること、具体的。\n` +
    `必ず次のJSON配列のみ出力（前後に説明やコードフェンスを付けない）：[{"text":"課題文"},{"text":"課題文"},{"text":"課題文"}]`;
  const raw = await callClaude(prompt, 384);
  const clean = raw.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("invalid response");
  const defaultPenalty = level === 3 ? 8 : level === 2 ? 6 : 4;
  return parsed.slice(0, 3).map((item, i) => ({
    id: `ai-claude-${habitId}-${level}-${i}-${Date.now()}`,
    text: typeof item === "string" ? item : item.text,
    level,
    penaltyLevel: defaultPenalty,
  }));
}
