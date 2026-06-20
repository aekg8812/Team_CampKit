// ========================================
// 統一ストア：画面はここだけを呼ぶ
// VITE_USE_FIREBASE の値でローカル版/Firebase版を振り分ける
//   false（既定）→ ローカルストレージ（A案・確実に動く）
//   true          → Firebase（C案・発表用）
// ========================================

import * as L from "./localStore";
import * as F from "./firebaseStore";

const USE_FB = import.meta.env.VITE_USE_FIREBASE === "true";

// 現在ログイン中のユーザー名を保持（ローカル版で使う）
let currentUsername = USE_FB ? null : L.getSessionLocal();

// ───────── 認証 ─────────

export async function register(username, password) {
  if (USE_FB) return await F.registerFb(username, password);
  return L.registerLocal(username, password);
}

export async function login(username, password) {
  if (USE_FB) {
    const r = await F.loginFb(username, password);
    if (r.ok) currentUsername = username;
    return r;
  }
  const r = L.loginLocal(username, password);
  if (r.ok) currentUsername = username;
  return r;
}

export async function resetPassword(username, newPassword) {
  if (USE_FB) return await F.resetPasswordFb(username, newPassword);
  return L.resetPasswordLocal(username, newPassword);
}

export async function logout() {
  if (USE_FB) await F.logoutFb();
  else L.logoutLocal();
  currentUsername = null;
}

// 既にログイン済みか（リロード復帰用）
export function getLoggedInUser() {
  if (USE_FB) return F.getCurrentUsernameFb() || null;
  return currentUsername;
}

// ───────── データ ─────────

export async function getUserData() {
  if (USE_FB) return await F.getUserDataFb();
  return L.getUserDataLocal(currentUsername);
}

export async function saveSelectedHabits(habitIds) {
  if (USE_FB) return await F.saveSelectedHabitsFb(habitIds);
  return L.saveSelectedHabitsLocal(currentUsername, habitIds);
}

export async function recordResult(payload) {
  if (USE_FB) return await F.recordResultFb(payload);
  return L.recordResultLocal(currentUsername, payload);
}

// いまFirebaseモードかどうか（UI表示用）
export const isFirebaseMode = USE_FB;
