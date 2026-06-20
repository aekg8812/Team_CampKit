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
  if (!USE_API || !providerHasKey()) {
    return { ok: true, message: "証拠を受理しました（モック判定）" };
  }
  try {
    return await provider().judgeEvidence({ base64, mediaType, taskText });
  } catch {
    return { ok: true, message: "判定できませんでしたが受理しました" };
  }
}

/**
 * サボり傾向診断
 * @returns {string} 診断テキスト
 */
export async function diagnoseAnswers({ habitId, habitLabel, questions, answers }) {
  if (!USE_API || !providerHasKey()) {
    return pickDiagnosisFallback(habitId);
  }
  try {
    const result = await provider().diagnoseAnswers({ habitId, habitLabel, questions, answers });
    return result || pickDiagnosisFallback(habitId);
  } catch {
    return pickDiagnosisFallback(habitId);
  }
}

/**
 * AI課題生成
 * @returns {[{ id, text, level, penaltyLevel }]}
 */
export async function generateTasks({ habitId, habitLabel, level, answers }) {
  if (!USE_API || !providerHasKey()) {
    return getTasksForHabit(habitId, level);
  }
  try {
    return await provider().generateTasks({ habitId, habitLabel, level, answers });
  } catch {
    return getTasksForHabit(habitId, level);
  }
}
