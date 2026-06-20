// ========================================
// 統一ストア：画面はここだけを呼ぶ
// VITE_USE_SUPABASE の値でローカル版/Supabase版を振り分ける
// ========================================

import * as L from "./localStore";
import * as S from "./supabaseStore";

const USE_SB = import.meta.env.VITE_USE_SUPABASE === "true";

let currentUsername = USE_SB ? null : L.getSessionLocal();

// ───────── 認証 ─────────

export async function register(username, password, notifyEmail) {
  if (USE_SB) return await S.registerSb(username, password, notifyEmail);
  return L.registerLocal(username, password, notifyEmail);
}

export async function login(username, password) {
  if (USE_SB) {
    const r = await S.loginSb(username, password);
    if (r.ok) currentUsername = username;
    return r;
  }
  const r = L.loginLocal(username, password);
  if (r.ok) currentUsername = username;
  return r;
}

export async function resetPassword(username, newPassword) {
  if (USE_SB) return await S.resetPasswordSb(username, newPassword);
  return L.resetPasswordLocal(username, newPassword);
}

export async function logout() {
  if (USE_SB) await S.logoutSb();
  else L.logoutLocal();
  currentUsername = null;
}

export async function getLoggedInUser() {
  if (USE_SB) return await S.getCurrentUsernameSb();
  return currentUsername;
}

// ───────── データ ─────────

export async function getUserData() {
  if (USE_SB) return await S.getUserDataSb();
  return L.getUserDataLocal(currentUsername);
}

export async function saveSelectedHabits(habitIds) {
  if (USE_SB) return await S.saveSelectedHabitsSb(habitIds);
  return L.saveSelectedHabitsLocal(currentUsername, habitIds);
}

export async function recordResult(payload) {
  if (USE_SB) return await S.recordResultSb(payload);
  return L.recordResultLocal(currentUsername, payload);
}

// 最終ログイン時刻を現在時刻で更新する
export async function updateLastLogin() {
  if (USE_SB) return await S.updateLastLoginSb();
  return L.updateLastLoginLocal(currentUsername);
}

// メール送信ログを追記する
export async function addEmailLog(entry) {
  if (USE_SB) return await S.addEmailLogSb(entry);
  return L.addEmailLogLocal(currentUsername, entry);
}

// ポイントを消費する（残高不足時は 0 で止まる）
export async function spendPoints(amount) {
  if (USE_SB) return await S.spendPointsSb(amount);
  return L.spendPointsLocal(currentUsername, amount);
}

// おみくじ結果を記録し、ポイントを加算する（1日3pt上限の対象外）
export async function recordOmikuji(points) {
  if (USE_SB) return await S.recordOmikujiSb(points);
  return L.recordOmikujiLocal(currentUsername, points);
}

// ペナルティメール送信済みを記録する（lastPenaltyFailCount 更新 + emailLog 追記）
export async function recordPenaltyEmailSent(failCount) {
  if (USE_SB) return await S.recordPenaltyEmailSentSb(failCount);
  return L.recordPenaltyEmailSentLocal(currentUsername, failCount);
}

export const isSupabaseMode = USE_SB;
