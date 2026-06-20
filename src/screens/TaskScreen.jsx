import { useEffect, useRef, useState } from "react";
import { LEVEL_LABEL, getTasksForHabit } from "../data/tasksByHabit";
import { getPenaltySeconds } from "../data/penaltyTime";
import { REGACHA_OPTIONS, RESCUE_COST } from "../data/levelProbability";
import { judgeEvidence } from "../lib/claude";

// 課題提示 + カウントダウン + 証拠提出（画像/コメント）+ 再ガチャ/救済
// props:
//   task         : { id, text, level, penaltyLevel, isUltra? }
//   habitId      : string  (再ガチャ時に新課題を選ぶために必要)
//   points       : number  (現在の保有ポイント)
//   onSuccess    : ({ comment, withEvidence, imageDataUrl, durationSec, rescued? })
//   onFail       : ({ durationSec })
//   onSpendPoints: async (amount) => void
export default function TaskScreen({ task: initialTask, habitId, points: initialPoints, onSuccess, onFail, onSpendPoints }) {
  const [task, setTask] = useState(initialTask);
  const [localPoints, setLocalPoints] = useState(initialPoints || 0);
  const penaltySeconds = getPenaltySeconds(task.penaltyLevel);
  const [remaining, setRemaining] = useState(penaltySeconds);
  const [comment, setComment] = useState("");
  const [imageData, setImageData] = useState(null); // { base64, mediaType, preview }
  const [judging, setJudging] = useState(false);
  const [judgeMsg, setJudgeMsg] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const style = task.isUltra
    ? { label: "【激重】", color: "#ff2222", note: "覚悟しろ！！！" }
    : LEVEL_LABEL[task.level] || LEVEL_LABEL[1];

  // カウントダウン（課題提示からの経過時間）
  useEffect(() => {
    let secs = penaltySeconds;
    timerRef.current = setInterval(() => {
      secs -= 1;
      setRemaining(Math.max(0, secs));
      if (secs <= 0) {
        clearInterval(timerRef.current);
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        onFail({ durationSec });
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 課題が変わったらタイマーをリセット
  function resetTimerForNewTask(newTask) {
    clearInterval(timerRef.current);
    const newSecs = getPenaltySeconds(newTask.penaltyLevel);
    setRemaining(newSecs);
    startTimeRef.current = Date.now();
    let secs = newSecs;
    timerRef.current = setInterval(() => {
      secs -= 1;
      setRemaining(Math.max(0, secs));
      if (secs <= 0) {
        clearInterval(timerRef.current);
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        onFail({ durationSec });
      }
    }, 1000);
  }

  // 画像選択
  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      setImageData({ base64, mediaType, preview: result });
    };
    reader.readAsDataURL(file);
  }

  // 完了ボタン
  async function handleComplete() {
    setJudging(true);
    setJudgeMsg("");
    const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

    if (imageData) {
      const thumbnail = await resizeImage(imageData.base64, imageData.mediaType, 480);
      const r = await judgeEvidence({
        base64: thumbnail.split(",")[1],
        mediaType: "image/jpeg",
        taskText: task.text,
      });
      setJudgeMsg(r.message);
      if (r.ok) {
        setTimeout(() => onSuccess({ comment, withEvidence: true, imageDataUrl: thumbnail, durationSec }), 800);
        return;
      }
      setJudging(false);
      return;
    }

    if (!comment.trim()) {
      setJudgeMsg("コメントを入力するか、写真を提出してください");
      setJudging(false);
      return;
    }
    onSuccess({ comment, withEvidence: false, imageDataUrl: null, durationSec });
  }

  // ポイント消費で再ガチャ（確率でLv1へ引き下げ）
  async function handleReGacha(option) {
    if (localPoints < option.cost) return;
    setShowOptions(false);
    // ポイントを先に消費
    setLocalPoints((p) => p - option.cost);
    await onSpendPoints?.(option.cost);

    if (Math.random() < option.prob) {
      // 課題レベルをLv1へ下げて引き直し
      const pool = getTasksForHabit(habitId, 1);
      const newTask = pool[Math.floor(Math.random() * pool.length)];
      setTask(newTask);
      setImageData(null);
      setComment("");
      setJudgeMsg(`ラッキー！課題がLv1に変わりました`);
      resetTimerForNewTask(newTask);
    } else {
      setJudgeMsg(`惜しかった…課題は変わりませんでした（${option.cost}pt消費）`);
    }
  }

  // 50pt消費で成功扱い救済
  async function handleRescue() {
    if (localPoints < RESCUE_COST) return;
    setLocalPoints((p) => p - RESCUE_COST);
    await onSpendPoints?.(RESCUE_COST);
    clearInterval(timerRef.current);
    const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
    onSuccess({ comment: "【救済】", withEvidence: false, imageDataUrl: null, durationSec, rescued: true });
  }

  return (
    <div className="court-frame flex flex-col items-center gap-5 py-6">
      <div className="flex w-full justify-between items-center">
        <p className="text-sm text-gray-400">今日の課題</p>
        <p className="text-xs text-court-gold font-bold">{localPoints}pt</p>
      </div>

      <div
        className={`w-full py-6 px-4 rounded-xl border-2 text-center ${task.isUltra ? "animate-pulse" : ""}`}
        style={{ borderColor: style.color, boxShadow: task.isUltra ? `0 0 24px ${style.color}88` : undefined }}
      >
        <p className="text-xs mb-2 font-bold" style={{ color: style.color }}>
          {style.label}
        </p>
        <p className="text-2xl font-extrabold">{task.text}</p>
        {task.isUltra && (
          <p className="text-xs text-red-400 mt-2 font-bold">⚠️ 激重課題が出た！覚悟を決めろ！</p>
        )}
      </div>

      <p className="text-4xl font-mono tracking-wider">{formatTime(remaining)}</p>
      <p className="text-xs text-gray-500 -mt-3">制限時間内に達成しよう</p>

      {/* 証拠提出 */}
      <div className="w-full bg-court-panel rounded-xl p-4 flex flex-col gap-3">
        <p className="text-sm font-bold">証拠を提出（任意）</p>

        {imageData ? (
          <div className="flex flex-col items-center gap-2">
            <img src={imageData.preview} alt="証拠" className="max-h-40 rounded-lg object-contain" />
            <button onClick={() => setImageData(null)} className="text-xs text-gray-400 underline">
              画像を取り消す
            </button>
          </div>
        ) : (
          <label className="px-4 py-3 bg-court-bg rounded-lg text-center text-sm cursor-pointer border border-gray-700">
            写真を撮る / 選ぶ
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImage}
              className="hidden"
            />
          </label>
        )}

        <textarea
          className="px-3 py-2 bg-court-bg rounded-lg text-sm border border-gray-700 outline-none focus:border-court-gold resize-none"
          rows={2}
          placeholder="一言コメント（写真なしの場合は必須）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {judgeMsg && <p className="text-sm text-court-mid text-center">{judgeMsg}</p>}

      <button
        onClick={handleComplete}
        disabled={judging}
        className="w-full px-6 py-4 bg-court-gold text-court-bg font-bold rounded-lg disabled:opacity-50"
      >
        {judging ? "確認中…" : "完了する"}
      </button>

      {/* ポイント消費オプション */}
      <div className="w-full">
        <button
          onClick={() => setShowOptions((v) => !v)}
          className="w-full text-xs text-gray-500 underline py-1"
        >
          {showOptions ? "オプションを閉じる" : "ポイントを使う（再ガチャ / 救済）"}
        </button>

        {showOptions && (
          <div className="bg-court-panel rounded-xl p-4 flex flex-col gap-3 mt-2">
            <p className="text-xs text-gray-400">現在 {localPoints}pt 保有</p>

            <p className="text-xs font-bold text-gray-300">再ガチャ（確率でLv1に変更）</p>
            {REGACHA_OPTIONS.map((opt) => (
              <button
                key={opt.cost}
                onClick={() => handleReGacha(opt)}
                disabled={localPoints < opt.cost}
                className="px-4 py-2 bg-court-bg border border-gray-600 rounded-lg text-xs text-left disabled:opacity-40"
              >
                {opt.label}
              </button>
            ))}

            <div className="border-t border-gray-700 pt-3">
              <p className="text-xs font-bold text-gray-300 mb-2">救済（{RESCUE_COST}pt — 成功扱い）</p>
              <p className="text-xs text-gray-500 mb-2">
                課題を履歴に「???」として登録し、成功扱いにします。
                連続成功カウントに含まれます。
              </p>
              <button
                onClick={handleRescue}
                disabled={localPoints < RESCUE_COST}
                className="w-full px-4 py-2 bg-court-mid text-white rounded-lg text-xs font-bold disabled:opacity-40"
              >
                {RESCUE_COST}ptで救済する
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

// 証拠画像をサムネイルにリサイズして data URL で返す（容量削減）
function resizeImage(base64, mediaType, maxPx = 480) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(`data:${mediaType};base64,${base64}`);
    img.src = `data:${mediaType};base64,${base64}`;
  });
}
