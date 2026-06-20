import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LEVEL_LABEL, getTasksForHabit } from "../data/tasksByHabit";
import { getPenaltySeconds } from "../data/penaltyTime";
import { REGACHA_OPTIONS, RESCUE_COST } from "../data/levelProbability";
import { judgeEvidence } from "../lib/claude";
import { AI_MODE } from "../lib/ai/index";

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
  const [judgeMsg, setJudgeMsg] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  // 画像判定フェーズ管理
  const [judgePhase, setJudgePhase] = useState(null); // null | "analyzing" | "result"
  const [judgeResult, setJudgeResult] = useState(null); // { ok, score, message }
  const [displayScore, setDisplayScore] = useState(0);
  const [displayComment, setDisplayComment] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const pendingRef = useRef(null); // { imageDataUrl, durationSec, comment }

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

  // 判定結果のアニメーション
  useEffect(() => {
    if (judgePhase !== "result" || !judgeResult) return;

    setDisplayScore(0);
    setDisplayComment("");
    setTypingDone(false);

    // スコアカウントアップ（イーズアウト）
    const targetScore = judgeResult.score ?? 80;
    const countDuration = 1200;
    const startTime = performance.now();
    let animFrame;
    function animateScore(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / countDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplayScore(Math.round(targetScore * eased));
      if (progress < 1) animFrame = requestAnimationFrame(animateScore);
    }
    animFrame = requestAnimationFrame(animateScore);

    // タイピングアニメーション（300ms後に開始）
    const message = judgeResult.message || "";
    let charIndex = 0;
    let typingInterval;
    const typingStart = setTimeout(() => {
      typingInterval = setInterval(() => {
        charIndex++;
        setDisplayComment(message.slice(0, charIndex));
        if (charIndex >= message.length) {
          clearInterval(typingInterval);
          setTypingDone(true);

          if (judgeResult.ok) {
            clearInterval(timerRef.current);
            const { imageDataUrl, durationSec, comment: savedComment } = pendingRef.current || {};
            setTimeout(() => {
              onSuccess({ comment: savedComment || "", withEvidence: true, imageDataUrl, durationSec });
            }, 800);
          } else {
            // 不合格：2秒後に通常画面に戻す
            setTimeout(() => {
              setJudgePhase(null);
              setJudgeMsg("証拠として認められませんでした。やり直してください。");
            }, 2000);
          }
        }
      }, 35);
    }, 300);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(typingStart);
      clearInterval(typingInterval);
    };
  }, [judgePhase]); // judgeResultはjudgePhaseと同時にセットされるので依存不要

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
    if (judgePhase !== null) return;
    setJudgeMsg("");
    const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

    if (imageData) {
      setJudgePhase("analyzing");
      const thumbnail = await resizeImage(imageData.base64, imageData.mediaType, 480);
      const r = await judgeEvidence({
        base64: thumbnail.split(",")[1],
        mediaType: "image/jpeg",
        taskText: task.text,
      });
      pendingRef.current = { imageDataUrl: thumbnail, durationSec, comment };
      setJudgeResult(r);
      setJudgePhase("result");
      return;
    }

    if (!comment.trim()) {
      setJudgeMsg("コメントを入力するか、写真を提出してください");
      return;
    }
    onSuccess({ comment, withEvidence: false, imageDataUrl: null, durationSec });
  }

  // ポイント消費で再ガチャ（確率でLv1へ引き下げ）
  async function handleReGacha(option) {
    if (localPoints < option.cost) return;
    setShowOptions(false);
    setLocalPoints((p) => p - option.cost);
    await onSpendPoints?.(option.cost);

    if (Math.random() < option.prob) {
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

  // ─── 解析中オーバーレイ ───
  if (judgePhase === "analyzing") {
    const label = AI_MODE.label;
    return (
      <div className="court-frame flex flex-col items-center justify-center gap-6">
        <div className="w-14 h-14 border-4 border-court-gold border-t-transparent rounded-full animate-spin" />
        <div className="text-center">
          <p className="text-lg font-bold text-gray-200">
            {label ? `${label} が解析中…` : "解析中…"}
          </p>
          <p className="text-xs text-gray-500 mt-2">画像が課題の証拠かどうか判定しています</p>
        </div>
      </div>
    );
  }

  // ─── 判定結果画面 ───
  if (judgePhase === "result" && judgeResult) {
    const scoreColor =
      displayScore >= 80 ? "#f5b301"
      : displayScore >= 60 ? "#4ade80"
      : "#f87171";
    const label = AI_MODE.label;

    return (
      <div className="court-frame flex flex-col items-center gap-5 py-8 text-center">
        <div className="flex items-center gap-2">
          <p className="text-xs tracking-widest font-bold text-court-gold">AI 画像判定</p>
          {label && (
            <span className="text-xs bg-court-gold/20 text-court-gold px-2 py-0.5 rounded-full">
              ⚡ {label}
            </span>
          )}
        </div>

        {/* スコア */}
        <div className="flex flex-col items-center">
          <p
            className="text-8xl font-extrabold font-mono leading-none tabular-nums"
            style={{ color: scoreColor }}
          >
            {displayScore}
          </p>
          <p className="text-sm text-gray-400 mt-1">/ 100点</p>
        </div>

        {/* コメント */}
        <div className="w-full bg-court-panel rounded-xl p-4 min-h-16 text-left">
          <p className="text-sm leading-relaxed text-gray-200">
            {displayComment}
            {!typingDone && <span className="animate-pulse ml-0.5 text-court-gold">|</span>}
          </p>
        </div>

        {/* 合否 */}
        {typingDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {judgeResult.ok ? (
              <p className="text-court-gold font-bold text-lg">合格！課題達成</p>
            ) : (
              <p className="text-court-danger font-bold text-sm">証拠として認められませんでした</p>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  // ─── 通常画面 ───
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
        disabled={judgePhase !== null}
        className="w-full px-6 py-4 bg-court-gold text-court-bg font-bold rounded-lg disabled:opacity-50"
      >
        完了する
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
