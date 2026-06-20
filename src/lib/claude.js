// ========================================
// Claude API連携（v3）
// VITE_USE_API=true のときだけ本物のAPIを呼ぶ
// false（既定）なら固定データ／モックで動く
// ========================================

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
export async function judgeEvidence({ base64, mediaType, taskText }) {
  // モックモード：常に受理（デモ用）
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
          `次の課題に取り組んだ証拠としてこの画像が妥当か、ゆるく判定してください。\n` +
          `課題：「${taskText}」\n` +
          `厳密な採点はせず、「明らかに無関係・明らかにサボり」でない限り合格としてください。\n` +
          `必ず次のJSONのみ出力：{ "ok": true/false, "message": "一言コメント" }`,
      },
    ];
    const raw = await callClaude(content, 256);
    const clean = raw.replace(/\`\`\`json|\`\`\`/g, "").trim();
    const parsed = JSON.parse(clean);
    return { ok: !!parsed.ok, message: parsed.message || "判定しました" };
  } catch (e) {
    // 失敗時は救済（合格扱い）
    return { ok: true, message: "判定できませんでしたが受理しました" };
  }
}
