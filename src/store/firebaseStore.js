// ========================================
// Firebase版データストア（C案・発表用）
// VITE_USE_FIREBASE=true のときだけ使われる
// 失敗時は呼び出し側がローカル版にフォールバックする
// ========================================

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { app } from "../lib/firebase";

const auth = getAuth(app);
const db = getFirestore(app);

// ユーザー名をメール形式に変換（Firebase Authはメール必須のため）
function toEmail(username) {
  return `${username}@sabori-app.local`;
}

function freshData() {
  return {
    selectedHabits: [],
    habitStreaks: {},
    successCount: 0,
    failCount: 0,
    history: [],
  };
}

// ───────── 認証 ─────────

export async function registerFb(username, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, toEmail(username), password);
    await setDoc(doc(db, "defendants", cred.user.uid), freshData());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: fbError(e) };
  }
}

export async function loginFb(username, password) {
  try {
    await signInWithEmailAndPassword(auth, toEmail(username), password);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: fbError(e) };
  }
}

export async function logoutFb() {
  await signOut(auth);
}

// 注意：このアプリはユーザー名運用なので、実メールが無くパスワードリセットメールは送れない。
// Firebaseモードでは管理上の制約として、リセットは非対応（ローカルモードのみ対応）とする。
export async function resetPasswordFb() {
  return { ok: false, error: "Firebaseモードではパスワード再設定は未対応です" };
}

export function getCurrentUidFb() {
  return auth.currentUser?.uid || null;
}
export function getCurrentUsernameFb() {
  const email = auth.currentUser?.email || "";
  return email.replace("@sabori-app.local", "");
}

// ───────── データ読み書き ─────────

export async function getUserDataFb() {
  const uid = getCurrentUidFb();
  if (!uid) return freshData();
  const snap = await getDoc(doc(db, "defendants", uid));
  return snap.exists() ? snap.data() : freshData();
}

export async function saveSelectedHabitsFb(habitIds) {
  const uid = getCurrentUidFb();
  if (!uid) return;
  const data = await getUserDataFb();
  data.selectedHabits = habitIds;
  habitIds.forEach((id) => {
    if (!data.habitStreaks[id]) data.habitStreaks[id] = { current: 0, best: 0, level: 1 };
  });
  await setDoc(doc(db, "defendants", uid), data);
  return data;
}

export async function recordResultFb({ habitId, taskText, result, comment }) {
  const uid = getCurrentUidFb();
  if (!uid) return;
  const data = await getUserDataFb();
  const today = new Date().toISOString().slice(0, 10);
  data.history.unshift({ date: today, habitId, taskText, result, comment: comment || "" });

  if (!data.habitStreaks[habitId]) data.habitStreaks[habitId] = { current: 0, best: 0, level: 1 };
  const s = data.habitStreaks[habitId];
  if (result === "success") {
    data.successCount += 1;
    s.current += 1;
    if (s.current > s.best) s.best = s.current;
    s.level = Math.min(3, s.level + 1);
  } else {
    data.failCount += 1;
    s.current = 0;
  }
  await setDoc(doc(db, "defendants", uid), data);
  return data;
}

function fbError(e) {
  const code = e?.code || "";
  if (code.includes("email-already-in-use")) return "そのユーザー名は既に使われています";
  if (code.includes("user-not-found")) return "ユーザーが見つかりません";
  if (code.includes("wrong-password") || code.includes("invalid-credential"))
    return "パスワードが違います";
  if (code.includes("weak-password")) return "パスワードは6文字以上にしてください";
  return "エラーが発生しました（" + code + "）";
}
