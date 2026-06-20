// ========================================
// Supabase版データストア
// VITE_USE_SUPABASE=true のときだけ使われる
// ========================================

import { supabase } from "../lib/supabase";

// ユーザー名をメール形式に変換（Supabase Authはメール必須のため）
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

// DBの行(snake_case) → アプリ用オブジェクト(camelCase)
function rowToData(row) {
  if (!row) return freshData();
  return {
    selectedHabits: row.selected_habits || [],
    habitStreaks: row.habit_streaks || {},
    successCount: row.success_count || 0,
    failCount: row.fail_count || 0,
    history: row.history || [],
  };
}

// ───────── 認証 ─────────

export async function registerSb(username, password) {
  const { data, error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
  });
  if (error) return { ok: false, error: sbError(error) };

  const uid = data.user?.id;
  if (uid) {
    await supabase.from("user_data").insert({
      id: uid,
      selected_habits: [],
      habit_streaks: {},
      success_count: 0,
      fail_count: 0,
      history: [],
    });
  }
  return { ok: true };
}

export async function loginSb(username, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  });
  if (error) return { ok: false, error: sbError(error) };
  return { ok: true };
}

export async function logoutSb() {
  await supabase.auth.signOut();
}

export async function resetPasswordSb() {
  return { ok: false, error: "Supabaseモードではパスワード再設定は未対応です" };
}

export async function getCurrentUidSb() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function getCurrentUsernameSb() {
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email || "";
  return email.replace("@sabori-app.local", "") || null;
}

// ───────── データ読み書き ─────────

export async function getUserDataSb() {
  const uid = await getCurrentUidSb();
  if (!uid) return freshData();

  const { data } = await supabase
    .from("user_data")
    .select("*")
    .eq("id", uid)
    .single();

  return rowToData(data);
}

export async function saveSelectedHabitsSb(habitIds) {
  const uid = await getCurrentUidSb();
  if (!uid) return;

  const current = await getUserDataSb();
  current.selectedHabits = habitIds;
  habitIds.forEach((id) => {
    if (!current.habitStreaks[id]) {
      current.habitStreaks[id] = { current: 0, best: 0, level: 1 };
    }
  });

  await supabase.from("user_data").upsert({
    id: uid,
    selected_habits: current.selectedHabits,
    habit_streaks: current.habitStreaks,
    success_count: current.successCount,
    fail_count: current.failCount,
    history: current.history,
    updated_at: new Date().toISOString(),
  });

  return current;
}

export async function recordResultSb({ habitId, taskText, result, comment }) {
  const uid = await getCurrentUidSb();
  if (!uid) return;

  const data = await getUserDataSb();
  const today = new Date().toISOString().slice(0, 10);
  data.history.unshift({ date: today, habitId, taskText, result, comment: comment || "" });

  if (!data.habitStreaks[habitId]) {
    data.habitStreaks[habitId] = { current: 0, best: 0, level: 1 };
  }
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

  await supabase.from("user_data").upsert({
    id: uid,
    selected_habits: data.selectedHabits,
    habit_streaks: data.habitStreaks,
    success_count: data.successCount,
    fail_count: data.failCount,
    history: data.history,
    updated_at: new Date().toISOString(),
  });

  return data;
}

function sbError(error) {
  const msg = error?.message || "";
  if (msg.includes("User already registered")) return "そのユーザー名は既に使われています";
  if (msg.includes("Invalid login credentials")) return "ユーザー名またはパスワードが違います";
  if (msg.includes("Password should be") || msg.includes("should be at least"))
    return "パスワードは6文字以上にしてください";
  return "エラーが発生しました（" + msg + "）";
}
