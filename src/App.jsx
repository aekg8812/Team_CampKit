import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import LoginScreen from "./screens/LoginScreen";
import HabitSelectScreen from "./screens/HabitSelectScreen";
import MyPageScreen from "./screens/MyPageScreen";
import QuestionScreen from "./screens/QuestionScreen";
import DiagnosisScreen from "./screens/DiagnosisScreen";
import GachaScreen from "./screens/GachaScreen";
import TaskScreen from "./screens/TaskScreen";
import ResultScreen from "./screens/ResultScreen";
import LogDetailScreen from "./screens/LogDetailScreen";
import OmikujiScreen from "./screens/OmikujiScreen";

import {
  getLoggedInUser, getUserData, recordResult, logout,
  updateLastLogin, addEmailLog, spendPoints, recordOmikuji,
  recordPenaltyEmailSent, cleanupFailedTasks,
} from "./store";
import { diagnoseAnswers, generateTasks } from "./lib/claude";
import {
  shouldSendPenaltyEmail, shouldSendAbsenceEmail,
  sendPenaltyEmail, sendAbsenceEmail, makeEmailLogEntry,
} from "./lib/email";
import { getHabit } from "./data/habits";
import { getQuestionsForHabit } from "./data/questionsByHabit";
import { buildCandidates } from "./data/tasksByHabit";
import { rollUltra, ULTRA_TASK } from "./data/levelProbability";

const S = {
  LOGIN: "login",
  HABIT_SELECT: "habit_select",
  MYPAGE: "mypage",
  QUESTION: "question",
  DIAGNOSIS: "diagnosis",
  GACHA: "gacha",
  TASK: "task",
  RESULT: "result",
  LOG_DETAIL: "log_detail",
  OMIKUJI: "omikuji",
};

export default function App() {
  const [screen, setScreen] = useState(S.LOGIN);
  const [username, setUsername] = useState(null);
  const [data, setData] = useState(null);

  const [currentHabit, setCurrentHabit] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [lastSuccess, setLastSuccess] = useState(false);

  const [diagnosis, setDiagnosis] = useState(null);
  const [taskCandidates, setTaskCandidates] = useState([]);
  const [logEntry, setLogEntry] = useState(null);

  // リロード時にログイン状態を復帰
  useEffect(() => {
    async function init() {
      const u = await getLoggedInUser();
      if (u) {
        setUsername(u);
        await loadData(u);
      }
    }
    init();
  }, []);

  async function loadData(u) {
    await cleanupFailedTasks(); // 過去の undefined 混入をログイン時に一度だけ掃除
    const d = await getUserData();

    // 条件B: 最終ログ記録から72時間以上経過していたら通知
    if (shouldSendAbsenceEmail(d)) {
      await sendAbsenceEmail({ toEmail: d.notifyEmail, targetName: u });
      await addEmailLog(makeEmailLogEntry({ reason: "inactive" }));
    }

    await updateLastLogin();
    setData(d);

    if (!d.selectedHabits || d.selectedHabits.length === 0) {
      setScreen(S.HABIT_SELECT);
    } else {
      setScreen(S.MYPAGE);
    }
  }

  async function handleLoggedIn(u) {
    setUsername(u);
    await loadData(u);
  }

  async function handleHabitsDone() {
    const d = await getUserData();
    setData(d);
    setScreen(S.MYPAGE);
  }

  function handleStart() {
    setScreen(S.QUESTION);
  }

  // 質問完了 → AI診断・課題生成を並行実行 → 診断画面へ
  async function handleQuestionComplete({ habitId, answers }) {
    setCurrentHabit(habitId);
    setDiagnosis(null);
    setTaskCandidates([]);
    setScreen(S.DIAGNOSIS);

    const habit = getHabit(habitId);
    const questions = getQuestionsForHabit(habitId);
    const playerLevel = data?.habitStreaks?.[habitId]?.level || 1;

    // 激重抽選をここで行い、当選したら AI 生成をスキップ
    if (rollUltra()) {
      const [diagText] = await Promise.all([
        diagnoseAnswers({ habitId, habitLabel: habit.label, questions, answers }),
      ]);
      setDiagnosis(diagText);
      setTaskCandidates([ULTRA_TASK]);
      return;
    }

    // 通常フロー：レベル確率でタスクレベルを決定し AI 生成
    const candidates = buildCandidates(habitId, playerLevel);
    const effectiveLevel = candidates[0]?.level || playerLevel;

    const [diagText, aiCandidates] = await Promise.all([
      diagnoseAnswers({ habitId, habitLabel: habit.label, questions, answers }),
      generateTasks({ habitId, habitLabel: habit.label, level: effectiveLevel, answers }),
    ]);

    setDiagnosis(diagText);
    // AI生成が candidates と異なる level を持つ場合があるため、
    // buildCandidates で決まった level に統一する
    setTaskCandidates(
      aiCandidates.map((t) => ({ ...t, level: effectiveLevel }))
    );
  }

  function handleDiagnosisNext() {
    setScreen(S.GACHA);
  }

  function handleGachaComplete(task) {
    setCurrentTask(task);
    setScreen(S.TASK);
  }

  async function handleTaskSuccess({ comment, withEvidence, imageDataUrl, durationSec, rescued }) {
    const newData = await recordResult({
      habitId: currentHabit,
      taskText: rescued ? "???" : currentTask.text,
      result: "success",
      comment: rescued
        ? "【救済】50ptを消費して成功扱い"
        : comment + (withEvidence ? "" : "（自己申告）"),
      imageData: imageDataUrl || null,
      durationSec: durationSec || 0,
    });
    const freshData = newData || (await getUserData());
    setData((prev) => ({
      ...freshData,
      lastOmikujiDate: freshData.lastOmikujiDate || prev?.lastOmikujiDate,
    }));
    setLastSuccess(true);
    setScreen(S.RESULT);
  }

  async function handleTaskFail({ durationSec } = {}) {
    const newData = await recordResult({
      habitId: currentHabit,
      taskText: currentTask.text,
      result: "fail",
      comment: "",
      imageData: null,
      durationSec: durationSec || 0,
    });
    const latestData = newData || (await getUserData());
    setData((prev) => ({
      ...latestData,
      lastOmikujiDate: latestData.lastOmikujiDate || prev?.lastOmikujiDate,
    }));

    // 条件A: 全体の累積失敗回数が 3 の倍数に達したとき通知（多重送信防止付き）
    if (shouldSendPenaltyEmail(latestData)) {
      await sendPenaltyEmail({
        toEmail: latestData.notifyEmail,
        targetName: username,
        failedTasks: latestData.failedTasks || [],
        failCount: latestData.failCount,
      });
      await recordPenaltyEmailSent(latestData.failCount);
    }

    setLastSuccess(false);
    setScreen(S.RESULT);
  }

  async function handleSpendPoints(amount) {
    const newData = await spendPoints(amount);
    setData(newData || (await getUserData()));
  }

  async function handleLogout() {
    await logout();
    setUsername(null);
    setData(null);
    setScreen(S.LOGIN);
  }

  function handleViewLog(entry) {
    setLogEntry(entry);
    setScreen(S.LOG_DETAIL);
  }

  function handleOmikuji() {
    const today = new Date().toISOString().slice(0, 10);
    if (data?.lastOmikujiDate === today) return; // ボタン disabled をすり抜けた場合の二重防止
    setScreen(S.OMIKUJI);
  }

  // 結果が出た瞬間に呼ばれる
  async function handleOmikujiReveal(result) {
    const today = new Date().toISOString().slice(0, 10);
    // 保存の成否に依存せず即座にUIを更新（ポイント・引いた日付を反映）
    setData((prev) => prev ? {
      ...prev,
      points: (prev.points || 0) + (result.points || 0),
      lastOmikujiDate: today,
    } : prev);
    // ストアへ永続化
    try {
      const newData = await recordOmikuji(result.points);
      // 永続化が成功してlastOmikujiDateが入った場合のみ上書き
      if (newData?.lastOmikujiDate) setData(newData);
    } catch (e) {
      console.error("[omikuji] persist failed:", e);
    }
  }

  // 5秒後のナビゲーション
  async function handleOmikujiComplete() {
    // handleOmikujiReveal で state は更新済み。
    // ストアから再取得して reconcile するが、空データで上書きしない。
    try {
      const fresh = await getUserData();
      if (fresh?.lastOmikujiDate) setData(fresh);
    } catch {}
    setScreen(S.MYPAGE);
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        style={{ minHeight: "100dvh" }}
      >
        {renderScreen()}
      </motion.div>
    </AnimatePresence>
  );

  function renderScreen() {
    switch (screen) {
      case S.LOGIN:
        return <LoginScreen onLoggedIn={handleLoggedIn} />;
      case S.HABIT_SELECT:
        return (
          <HabitSelectScreen
            initial={data?.selectedHabits || []}
            onDone={handleHabitsDone}
          />
        );
      case S.MYPAGE:
        return data ? (
          <MyPageScreen
            username={username}
            data={data}
            onStart={handleStart}
            onEditHabits={() => setScreen(S.HABIT_SELECT)}
            onLogout={handleLogout}
            onViewLog={handleViewLog}
            onOmikuji={handleOmikuji}
          />
        ) : null;
      case S.QUESTION:
        return (
          <QuestionScreen
            selectedHabits={data?.selectedHabits || []}
            onComplete={handleQuestionComplete}
          />
        );
      case S.DIAGNOSIS:
        return <DiagnosisScreen diagnosis={diagnosis} onNext={handleDiagnosisNext} />;
      case S.GACHA:
        return <GachaScreen candidates={taskCandidates} onComplete={handleGachaComplete} />;
      case S.TASK:
        return (
          <TaskScreen
            task={currentTask}
            habitId={currentHabit}
            points={data?.points || 0}
            onTaskChange={setCurrentTask}
            onSuccess={handleTaskSuccess}
            onFail={handleTaskFail}
            onSpendPoints={handleSpendPoints}
          />
        );
      case S.RESULT:
        return <ResultScreen success={lastSuccess} onBackToMyPage={() => setScreen(S.MYPAGE)} />;
      case S.LOG_DETAIL:
        return <LogDetailScreen entry={logEntry} onBack={() => setScreen(S.MYPAGE)} />;
      case S.OMIKUJI:
        return (
          <OmikujiScreen
            onReveal={handleOmikujiReveal}
            onComplete={handleOmikujiComplete}
          />
        );
      default:
        return null;
    }
  }
}
