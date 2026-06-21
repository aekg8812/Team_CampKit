// ============================================================
// AI 統合インターフェース
// VITE_USE_API と VITE_AI_PROVIDER を見て
// 固定データ / Claude / Gemini を振り分ける。
//
// 呼び出し側（画面・App.jsx）はここだけを import すること。
// 引数・戻り値のシグネチャは固定。変えない。
// ============================================================

import * as claude from "./claudeProvider";
import * as gemini from "./geminiProvider";
import { getTasksForHabit } from "../../data/tasksByHabit";

const USE_API  = import.meta.env.VITE_USE_API === "true";
const PROVIDER = (import.meta.env.VITE_AI_PROVIDER || "claude").toLowerCase();

// ─── プロバイダを選ぶ ───
function provider() {
  return PROVIDER === "gemini" ? gemini : claude;
}

function providerHasKey() {
  return provider().hasKey();
}

// ─── APIキーの有無 ───
// 選択中プロバイダ（VITE_AI_PROVIDER）の hasKey() を参照する。
// 例: gemini のときは geminiProvider.js の hasKey()（VITE_GEMINI_API_KEY）を見る。
// 証拠写真のAI採点画面を表示するかどうかは、このフラグで決める。
export const HAS_API_KEY = providerHasKey();

// 現在のプロバイダ表示名（採点画面のラベル用）
export const AI_PROVIDER_LABEL = PROVIDER === "gemini" ? "Gemini" : "Claude";

// ─── AI モード（画面表示・デバッグ用）───
// active: 実際に API を呼ぶ状態か
// label : "Gemini" | "Claude" | null（モック時）
export const AI_MODE = (() => {
  if (!USE_API) return { active: false, provider: null, label: null };
  if (!providerHasKey()) return { active: false, provider: PROVIDER, label: null };
  const label = PROVIDER === "gemini" ? "Gemini" : "Claude";
  return { active: true, provider: PROVIDER, label };
})();

console.log(
  `[AI] mode=${AI_MODE.active ? AI_MODE.label : "mock"}`,
  AI_MODE.active ? "" : `(VITE_USE_API=${USE_API}, key=${providerHasKey()})`
);

// ─── フォールバックデータ ───

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

function pickDiagnosisFallback(habitId) {
  const pool = DIAGNOSIS_FALLBACKS[habitId] || DIAGNOSIS_DEFAULT;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── 公開インターフェース ───

/**
 * 証拠画像の判定
 * @returns {{ ok: boolean, message: string }}
 */
export async function judgeEvidence({ base64, mediaType, taskText }) {
  // APIキーが入っていれば実AI（gemini/claude）で採点、無ければモック
  if (!providerHasKey()) {
    console.log("[AI] judgeEvidence → mock");
    // 疑似ローディング：デモでも「解析している感」を出す
    await new Promise((r) => setTimeout(r, 700 + Math.random() * 400));
    const score = Math.floor(Math.random() * 16) + 80; // 80〜95
    return { ok: true, score, message: "証拠を受理しました（モック判定）" };
  }
  console.log(`[AI:${PROVIDER}] judgeEvidence 開始`, { taskText });
  try {
    const result = await provider().judgeEvidence({ base64, mediaType, taskText });
    console.log(`[AI:${PROVIDER}] judgeEvidence 完了 → score:${result.score}`, result.message);
    return result;
  } catch (e) {
    console.warn(`[AI:${PROVIDER}] judgeEvidence 失敗、フォールバック:`, e.message);
    return { ok: true, score: 80, message: "判定できませんでしたが受理しました" };
  }
}

/**
 * サボり傾向診断
 * @returns {string} 診断テキスト
 */
export async function diagnoseAnswers({ habitId, habitLabel, questions, answers }) {
  // APIキーがあれば動的生成、無ければ固定フォールバック
  if (!providerHasKey()) {
    console.log("[AI] diagnoseAnswers → mock");
    return pickDiagnosisFallback(habitId);
  }
  console.log(`[AI:${PROVIDER}] diagnoseAnswers 開始`, { habitId });
  try {
    const result = await provider().diagnoseAnswers({ habitId, habitLabel, questions, answers });
    console.log(`[AI:${PROVIDER}] diagnoseAnswers 完了`);
    return result || pickDiagnosisFallback(habitId);
  } catch (e) {
    console.warn(`[AI:${PROVIDER}] diagnoseAnswers 失敗、フォールバック:`, e.message);
    return pickDiagnosisFallback(habitId);
  }
}

/**
 * AI課題生成
 * @returns {[{ id, text, level, penaltyLevel }]}
 */
export async function generateTasks({ habitId, habitLabel, level, answers }) {
  // APIキーがあれば動的生成、無ければ固定データ
  if (!providerHasKey()) {
    console.log("[AI] generateTasks → 固定データ");
    return getTasksForHabit(habitId, level);
  }
  console.log(`[AI:${PROVIDER}] generateTasks 開始`, { habitId, level });
  try {
    const result = await provider().generateTasks({ habitId, habitLabel, level, answers });
    console.log(`[AI:${PROVIDER}] generateTasks 完了 → ${result.length}件`);
    return result;
  } catch (e) {
    console.warn(`[AI:${PROVIDER}] generateTasks 失敗、固定データ:`, e.message);
    return getTasksForHabit(habitId, level);
  }
}
