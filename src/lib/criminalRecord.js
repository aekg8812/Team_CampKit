import { supabase } from "./supabase";

// ブラウザごとの匿名IDを localStorage に保持
export function getUserId() {
  let id = localStorage.getItem("yogen_user_id");
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `u_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem("yogen_user_id", id);
  }
  return id;
}

const DEFAULT_RECORD = {
  criminalRecord: 0,
  totalVerdicts: 0,
  totalCleared: 0,
  predictionHits: 0,
};

// Supabaseが未設定/失敗の時に使うローカルフォールバック
function localGet() {
  try {
    const raw = localStorage.getItem("yogen_record");
    return raw ? JSON.parse(raw) : { ...DEFAULT_RECORD };
  } catch {
    return { ...DEFAULT_RECORD };
  }
}
function localSet(record) {
  try {
    localStorage.setItem("yogen_record", JSON.stringify(record));
  } catch {}
}

function fromRow(row) {
  return {
    criminalRecord: row.criminal_record ?? 0,
    totalVerdicts: row.total_verdicts ?? 0,
    totalCleared: row.total_cleared ?? 0,
    predictionHits: row.prediction_hits ?? 0,
  };
}

// 前科データ取得（無ければ初期化して返す）
export async function fetchRecord(userId) {
  try {
    const { data, error } = await supabase
      .from("criminal_records")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      await supabase.from("criminal_records").upsert({
        user_id: userId,
        criminal_record: 0,
        total_verdicts: 0,
        total_cleared: 0,
        prediction_hits: 0,
        last_verdict_at: new Date().toISOString(),
      });
      localSet(DEFAULT_RECORD);
      return { ...DEFAULT_RECORD };
    }

    const record = fromRow(data);
    localSet(record);
    return record;
  } catch {
    return localGet();
  }
}

// 判決を受けたら総数+1
export async function recordVerdict(userId) {
  try {
    const current = await fetchRecord(userId);
    current.totalVerdicts += 1;
    await supabase.from("criminal_records").upsert({
      user_id: userId,
      criminal_record: current.criminalRecord,
      total_verdicts: current.totalVerdicts,
      total_cleared: current.totalCleared,
      prediction_hits: current.predictionHits,
      last_verdict_at: new Date().toISOString(),
    });
    localSet(current);
  } catch {
    const r = localGet();
    r.totalVerdicts += 1;
    localSet(r);
  }
}

// 執行完了（予言を覆した）
export async function recordCleared(userId) {
  try {
    const current = await fetchRecord(userId);
    current.totalCleared += 1;
    await supabase.from("criminal_records").upsert({
      user_id: userId,
      criminal_record: current.criminalRecord,
      total_verdicts: current.totalVerdicts,
      total_cleared: current.totalCleared,
      prediction_hits: current.predictionHits,
      last_verdict_at: new Date().toISOString(),
    });
    localSet(current);
  } catch {
    const r = localGet();
    r.totalCleared += 1;
    localSet(r);
  }
}

// 執行失敗（予言的中）→ 前科+1
export async function recordFailure(userId) {
  try {
    const current = await fetchRecord(userId);
    current.criminalRecord += 1;
    current.predictionHits += 1;
    await supabase.from("criminal_records").upsert({
      user_id: userId,
      criminal_record: current.criminalRecord,
      total_verdicts: current.totalVerdicts,
      total_cleared: current.totalCleared,
      prediction_hits: current.predictionHits,
      last_verdict_at: new Date().toISOString(),
    });
    localSet(current);
  } catch {
    const r = localGet();
    r.criminalRecord += 1;
    r.predictionHits += 1;
    localSet(r);
  }
}

// 前科に応じた裁判長の口調レベル
export function toneLevel(criminalRecord) {
  if (criminalRecord >= 6) return "weary"; // 「もう驚きません。」
  if (criminalRecord >= 3) return "harsh"; // 「またあなたですか。」
  return "normal";
}
