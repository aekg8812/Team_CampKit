// ========================================
// 第三者メール通知
// Supabase Edge Function "send-penalty-email" → GAS → Gmail で送信する
// 送信失敗時は try/catch で握りつぶしてアプリを止めない
// ========================================

import { supabase } from "./supabase";

// ─── 送信関数 ───

/**
 * 課題失敗通知（type:1）を送る
 * 全体の cumulative failCount が 3 の倍数に達したときに呼ぶ
 * @param {{ toEmail, targetName, failedTasks: string[], failCount: number }}
 */
export async function sendPenaltyEmail({ toEmail, targetName, failedTasks = [], failCount }) {
  try {
    // 過去データに混入した undefined / 空文字を本文から除外する
    const cleanTasks = (failedTasks || []).filter(
      (t) => typeof t === "string" && t.trim() && t !== "undefined"
    );
    // [診断ログ] 動作確認用：実際に送るタスク名を確認する（確認後に削除）
    console.log("[email] sendPenaltyEmail payload:", { failCount, cleanTasks });
    await supabase.functions.invoke("send-penalty-email", {
      body: { toEmail, targetName, failedTasks: cleanTasks, failCount, type: 1 },
    });
  } catch (e) {
    console.error("[email] sendPenaltyEmail failed:", e);
  }
}

/**
 * 3日放置通知（type:2）を送る
 * 最終ログ記録から72時間以上経過したときに呼ぶ
 */
export async function sendAbsenceEmail({ toEmail, targetName }) {
  try {
    await supabase.functions.invoke("send-penalty-email", {
      body: { toEmail, targetName, type: 2 },
    });
  } catch (e) {
    console.error("[email] sendAbsenceEmail failed:", e);
  }
}

// ─── 送信条件の判定 ───

/**
 * 条件A: 全体の累積失敗回数（data.failCount）が 3 の倍数 かつ
 *        前回送信時の failCount より増えているとき true
 * @param {object} data - getUserData() の戻り値
 */
export function shouldSendPenaltyEmail(data) {
  const { notifyEmail, failCount = 0, lastPenaltyFailCount = 0 } = data;
  if (!notifyEmail) return false;
  if (failCount === 0 || failCount % 3 !== 0) return false;
  return failCount > lastPenaltyFailCount;
}

/**
 * 条件B: 最終ログ記録から72時間以上経過 かつ 直近72時間以内に未送信のとき true
 */
export function shouldSendAbsenceEmail(data) {
  const { notifyEmail, lastLogAt, emailLog = [] } = data;
  if (!notifyEmail || !lastLogAt) return false;
  const hoursSinceLast = (Date.now() - new Date(lastLogAt).getTime()) / (1000 * 3600);
  if (hoursSinceLast < 72) return false;
  // 直近72hに inactive メールを送っていないか
  const limit = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const sentRecently = emailLog.some((e) => e.reason === "inactive" && e.sentAt >= limit);
  return !sentRecently;
}

// ─── ログエントリ生成（absence 用） ───

/**
 * emailLog に追加するエントリを作る（放置メール用）
 */
export function makeEmailLogEntry({ reason }) {
  return {
    sentAt: new Date().toISOString(),
    reason,
  };
}
