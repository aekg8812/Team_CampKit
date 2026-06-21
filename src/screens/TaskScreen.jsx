import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LEVEL_LABEL, getTasksForHabit } from "../data/tasksByHabit";
import { getPenaltySeconds } from "../data/penaltyTime";
import { REGACHA_OPTIONS, RESCUE_COST } from "../data/levelProbability";
import { judgeEvidence } from "../lib/claude";
import { HAS_API_KEY, AI_PROVIDER_LABEL } from "../lib/ai/index";

export default function TaskScreen({ task: initialTask, habitId, points: initialPoints, onTaskChange, onSuccess, onFail, onSpendPoints }) {
  const [task, setTask] = useState(initialTask);
  const [localPoints, setLocalPoints] = useState(initialPoints || 0);
  const penaltySeconds = getPenaltySeconds(task.penaltyLevel);
  const [remaining, setRemaining] = useState(penaltySeconds);
  const [comment, setComment] = useState("");
  const [imageData, setImageData] = useState(null);
  const [judgeMsg, setJudgeMsg] = useState("");
  const [showOptions, setShowOptions] = useState(false);

  const [judgePhase, setJudgePhase] = useState(null);
  const [judgeResult, setJudgeResult] = useState(null);
  const [displayScore, setDisplayScore] = useState(0);
  const [displayComment, setDisplayComment] = useState("");
  const [typingDone, setTypingDone] = useState(false);
  const pendingRef = useRef(null);

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef(null);
  const style = task.isUltra
    ? { label: "【激重】", color: "#ff2222", note: "覚悟しろ！！！" }
    : LEVEL_LABEL[task.level] || LEVEL_LABEL[1];

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

  useEffect(() => {
    if (judgePhase !== "result" || !judgeResult) return;

    setDisplayScore(0);
    setDisplayComment("");
    setTypingDone(false);

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
        }
      }, 35);
    }, 300);

    return () => {
      cancelAnimationFrame(animFrame);
      clearTimeout(typingStart);
      clearInterval(typingInterval);
    };
  }, [judgePhase]);

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

  async function handleComplete() {
    if (judgePhase !== null) return;
    setJudgeMsg("");
    const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

    if (imageData) {
      const thumbnail = await resizeImage(imageData.base64, imageData.mediaType, 480);
      // APIキーがある時だけ写真をAI採点にかける。
      if (HAS_API_KEY) {
        setJudgePhase("analyzing");
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
      // キー無し：AI採点はせず、画像つきでそのまま成功扱い。
      onSuccess({ comment, withEvidence: true, imageDataUrl: thumbnail, durationSec });
      return;
    }

    if (!comment.trim()) {
      setJudgeMsg("コメントを入力するか、写真を提出してください");
      return;
    }
    onSuccess({ comment, withEvidence: false, imageDataUrl: null, durationSec });
  }

  async function handleReGacha(option) {
    if (localPoints < option.cost) return;
    setShowOptions(false);
    setLocalPoints((p) => p - option.cost);
    await onSpendPoints?.(option.cost);

    if (Math.random() < option.prob) {
      const pool = getTasksForHabit(habitId, 1);
      const newTask = pool[Math.floor(Math.random() * pool.length)];
      setTask(newTask);
      onTaskChange?.(newTask);
      setImageData(null);
      setComment("");
      setJudgeMsg("ラッキー！課題がLv1に変わりました");
      resetTimerForNewTask(newTask);
    } else {
      setJudgeMsg(`惜しかった…課題は変わりませんでした（${option.cost}pt消費）`);
    }
  }

  async function handleRescue() {
    if (localPoints < RESCUE_COST) return;
    setLocalPoints((p) => p - RESCUE_COST);
    await onSpendPoints?.(RESCUE_COST);
    clearInterval(timerRef.current);
    const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
    onSuccess({ comment: "【救済】", withEvidence: false, imageDataUrl: null, durationSec, rescued: true });
  }

  // ─── 解析中 ───
  if (judgePhase === "analyzing") {
    const label = AI_PROVIDER_LABEL;
    return (
      <div className="court-frame flex flex-col items-center justify-center gap-6 min-h-screen">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-court-panel2" />
          <div className="absolute inset-0 rounded-full border-2 border-court-gold border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold">
            {label ? `${label} が解析中…` : "解析中…"}
          </p>
          <p className="text-xs text-court-muted mt-2">画像が課題の証拠かどうか判定しています</p>
        </div>
      </div>
    );
  }

  // ─── 判定結果 ───
  if (judgePhase === "result" && judgeResult) {
    const scoreColor =
      displayScore >= 80 ? "#c9a227"
      : displayScore >= 60 ? "#3dab42"
      : "#dc3535";
    const label = AI_PROVIDER_LABEL;

    return (
      <div className="court-frame flex flex-col items-center gap-5 py-8 text-center min-h-screen">
        <div className="flex items-center gap-2">
          <p className="text-xs tracking-widest font-bold text-court-gold uppercase">AI 画像判定</p>
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
          <p className="text-sm text-court-muted mt-1">/ 100点</p>
        </div>

        {/* コメント */}
        <div className="w-full bg-court-panel rounded-3xl p-5 text-left">
          <p className="text-sm leading-relaxed text-gray-200">
            {displayComment}
            {!typingDone && <span className="animate-pulse ml-0.5 text-court-gold">|</span>}
          </p>
        </div>

        {typingDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center gap-3"
          >
            {judgeResult.ok ? (
              <>
                <p className="text-court-gold font-bold">合格！課題達成</p>
                <motion.button
                  onClick={() => {
                    clearInterval(timerRef.current);
                    const { imageDataUrl, durationSec, comment: savedComment } = pendingRef.current || {};
                    onSuccess({ comment: savedComment || "", withEvidence: true, imageDataUrl, durationSec });
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 bg-court-gold text-court-bg font-bold rounded-3xl text-lg"
                  style={{ boxShadow: "0 4px 20px rgba(201,162,39,0.35)" }}
                >
                  結果を確定する
                </motion.button>
              </>
            ) : (
              <>
                <p className="text-court-danger font-bold text-sm">証拠として認められませんでした</p>
                <motion.button
                  onClick={() => {
                    setJudgePhase(null);
                    setJudgeMsg("証拠として認められませんでした。やり直してください。");
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 bg-court-panel border border-court-panel2 text-gray-300 font-bold rounded-3xl"
                >
                  やり直す
                </motion.button>
              </>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  // ─── 通常画面 ───
  return (
    <div className="court-frame flex flex-col gap-4 py-5">
      {/* ヘッダー: ポイント */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-court-muted font-semibold uppercase tracking-widest">今日の課題</p>
        <span className="text-xs text-court-gold font-bold bg-court-panel px-3 py-1 rounded-full">
          {localPoints}pt
        </span>
      </div>

      {/* 課題カード */}
      <div
        className={`w-full py-7 px-5 rounded-3xl border text-center ${task.isUltra ? "animate-pulse" : ""}`}
        style={{
          borderColor: style.color,
          background: `${style.color}0a`,
          boxShadow: task.isUltra ? `0 0 20px ${style.color}66` : undefined,
        }}
      >
        <p className="text-xs mb-2 font-bold uppercase tracking-widest" style={{ color: style.color }}>
          {style.label}
        </p>
        <p className="text-xl font-extrabold leading-relaxed">{task.text}</p>
        {task.isUltra && (
          <p className="text-xs text-red-400 mt-3 font-bold">⚠️ 激重課題が出た！覚悟を決めろ！</p>
        )}
      </div>

      {/* タイマー */}
      <div className="bg-court-panel rounded-3xl py-5 px-4 text-center">
        <p className="text-4xl font-mono tracking-wider font-bold">{formatTime(remaining)}</p>
        <p className="text-xs text-court-muted mt-2">制限時間内に達成しよう</p>
      </div>

      {/* 証拠提出（画像登録は常時可。AI採点はAPIキーがある時だけ行う） */}
      <div className="bg-court-panel rounded-3xl p-4 flex flex-col gap-3">
        <p className="text-xs text-court-muted font-semibold uppercase tracking-widest">証拠を提出（任意）</p>

        {imageData ? (
          <div className="flex flex-col items-center gap-2">
            <img src={imageData.preview} alt="証拠" className="max-h-40 rounded-xl object-contain" />
            <button onClick={() => setImageData(null)} className="text-xs text-court-muted underline">
              画像を取り消す
            </button>
          </div>
        ) : (
          <label className="py-3 bg-court-panel2 rounded-xl text-center text-sm cursor-pointer border border-court-panel2 hover:border-court-gold transition-colors">
            📷 写真を撮る / 選ぶ
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
          className="px-3 py-2.5 bg-court-panel2 rounded-xl text-sm border border-court-panel2 outline-none focus:border-court-gold resize-none transition-colors placeholder:text-court-muted"
          rows={2}
          placeholder="一言コメント（写真なしの場合は必須）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {judgeMsg && (
        <p className="text-sm text-court-mid text-center bg-court-mid/10 rounded-xl px-4 py-2">
          {judgeMsg}
        </p>
      )}

      <motion.button
        onClick={handleComplete}
        disabled={judgePhase !== null}
        whileTap={{ scale: 0.97 }}
        className="w-full py-4 bg-court-gold text-court-bg font-bold rounded-3xl text-base disabled:opacity-50"
        style={{ boxShadow: "0 4px 20px rgba(201,162,39,0.3)" }}
      >
        完了する
      </motion.button>

      {/* ポイント消費オプション */}
      <div>
        <button
          onClick={() => setShowOptions((v) => !v)}
          className="w-full text-xs text-court-muted py-1.5 hover:text-white transition-colors"
        >
          {showOptions ? "▲ オプションを閉じる" : "▼ ポイントを使う（再ガチャ / 救済）"}
        </button>

        {showOptions && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-court-panel rounded-3xl p-4 flex flex-col gap-3 mt-2"
          >
            <p className="text-xs text-court-muted">現在 {localPoints}pt 保有</p>

            <p className="text-xs font-bold text-gray-300">再ガチャ（確率でLv1に変更）</p>
            {REGACHA_OPTIONS.map((opt) => (
              <motion.button
                key={opt.cost}
                onClick={() => handleReGacha(opt)}
                disabled={localPoints < opt.cost}
                whileTap={{ scale: 0.97 }}
                className="px-4 py-2.5 bg-court-panel2 border border-court-panel2 rounded-xl text-xs text-left disabled:opacity-40 hover:border-court-gold transition-colors"
              >
                {opt.label}
              </motion.button>
            ))}

            <div className="border-t border-court-panel2 pt-3">
              <p className="text-xs font-bold text-gray-300 mb-1">救済（{RESCUE_COST}pt — 成功扱い）</p>
              <p className="text-xs text-court-muted mb-3">
                課題を「???」として登録し、成功扱いにします。連続成功カウントに含まれます。
              </p>
              <motion.button
                onClick={handleRescue}
                disabled={localPoints < RESCUE_COST}
                whileTap={{ scale: 0.97 }}
                className="w-full py-2.5 bg-court-mid text-court-bg rounded-xl text-xs font-bold disabled:opacity-40"
              >
                {RESCUE_COST}ptで救済する
              </motion.button>
            </div>
          </motion.div>
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
