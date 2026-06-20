import { db } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

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

// Firebaseが未設定/失敗の時に使うローカルフォールバック
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

// 前科データ取得（無ければ初期化して返す）
export async function fetchRecord(userId) {
  try {
    const ref = doc(db, "defendants", userId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      localSet(data);
      return data;
    }
    await setDoc(ref, { ...DEFAULT_RECORD, lastVerdictAt: serverTimestamp() });
    localSet(DEFAULT_RECORD);
    return { ...DEFAULT_RECORD };
  } catch (e) {
    // Firebase未設定でもデモが動くようローカルにフォールバック
    return localGet();
  }
}

// 判決を受けたら総数+1
export async function recordVerdict(userId) {
  try {
    const ref = doc(db, "defendants", userId);
    await updateDoc(ref, {
      totalVerdicts: increment(1),
      lastVerdictAt: serverTimestamp(),
    });
  } catch (e) {
    const r = localGet();
    r.totalVerdicts += 1;
    localSet(r);
  }
}

// 執行完了（予言を覆した）
export async function recordCleared(userId) {
  try {
    const ref = doc(db, "defendants", userId);
    await updateDoc(ref, { totalCleared: increment(1) });
  } catch (e) {
    const r = localGet();
    r.totalCleared += 1;
    localSet(r);
  }
}

// 執行失敗（予言的中）→ 前科+1
export async function recordFailure(userId) {
  try {
    const ref = doc(db, "defendants", userId);
    await updateDoc(ref, {
      criminalRecord: increment(1),
      predictionHits: increment(1),
    });
  } catch (e) {
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
