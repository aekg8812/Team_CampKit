// ========================================
// 統一ストア：画面はここだけを呼ぶ
// VITE_USE_SUPABASE の値でローカル版/Supabase版を振り分ける
//   false（既定）→ ローカルストレージ（確実に動く）
//   true          → Supabase（クラウド保存）
// ========================================

import * as L from "./localStore";
import * as S from "./supabaseStore";

const USE_SB = import.meta.env.VITE_USE_SUPABASE === "true";

// 現在ログイン中のユーザー名を保持（ローカル版で使う）
let currentUsername = USE_SB ? null : L.getSessionLocal();

// ───────── 認証 ─────────

export async function register(username, password) {
  if (USE_SB) return await S.registerSb(username, password);
  return L.registerLocal(username, password);
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

// 既にログイン済みか（リロード復帰用）※ Supabase版は async
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

// いまSupabaseモードかどうか（UI表示用）
export const isSupabaseMode = USE_SB;
