import { useState, useEffect } from "react";
import LoginScreen from "./screens/LoginScreen";
import HabitSelectScreen from "./screens/HabitSelectScreen";
import MyPageScreen from "./screens/MyPageScreen";
import QuestionScreen from "./screens/QuestionScreen";
import DiagnosisScreen from "./screens/DiagnosisScreen";
import GachaScreen from "./screens/GachaScreen";
import TaskScreen from "./screens/TaskScreen";
import ResultScreen from "./screens/ResultScreen";
import LogDetailScreen from "./screens/LogDetailScreen";

import { getLoggedInUser, getUserData, recordResult, logout, updateLastLogin, addEmailLog } from "./store";
import { diagnoseAnswers, generateTasks } from "./lib/claude";
import { shouldSendFailEmail, shouldSendInactiveEmail, sendThirdPartyNotification, makeEmailLogEntry } from "./lib/email";
import { getHabit } from "./data/habits";
import { getQuestionsForHabit } from "./data/questionsByHabit";

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

  // モックメール表示用（VITE_USE_EMAIL=false のとき送信内容をプレビュー）
  const [mockEmail, setMockEmail] = useState(null);

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
    const d = await getUserData();

    // 条件B: 最終ログインから72時間以上経過していたら通知
    if (shouldSendInactiveEmail(d)) {
      const result = await sendThirdPartyNotification({
        to: d.notifyEmail,
        reason: "inactive",
        username: u,
      });
      await addEmailLog(makeEmailLogEntry({ reason: "inactive" }));
      if (result.mock) setMockEmail(result);
    }

    // 最終ログイン時刻を更新
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
    const level = data?.habitStreaks?.[habitId]?.level || 1;

    const [diagText, candidates] = await Promise.all([
      diagnoseAnswers({ habitId, habitLabel: habit.label, questions, answers }),
      generateTasks({ habitId, habitLabel: habit.label, level, answers }),
    ]);

    setDiagnosis(diagText);
    setTaskCandidates(candidates);
  }

  function handleDiagnosisNext() {
    setScreen(S.GACHA);
  }

  function handleGachaComplete(task) {
    setCurrentTask(task);
    setScreen(S.TASK);
  }

  async function handleTaskSuccess({ comment, withEvidence, imageDataUrl, durationSec }) {
    const newData = await recordResult({
      habitId: currentHabit,
      taskText: currentTask.text,
      result: "success",
      comment: comment + (withEvidence ? "" : "（自己申告）"),
      imageData: imageDataUrl || null,
      durationSec: durationSec || 0,
    });
    setData(newData || (await getUserData()));
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
    setData(latestData);

    // 条件A: 失敗累計が3の倍数に達したら通知
    if (shouldSendFailEmail(latestData)) {
      const result = await sendThirdPartyNotification({
        to: latestData.notifyEmail,
        reason: "fail",
        username,
        failCount: latestData.failCount,
      });
      await addEmailLog(makeEmailLogEntry({ reason: "fail", failCountAtSend: latestData.failCount }));
      if (result.mock) setMockEmail(result);
    }

    setLastSuccess(false);
    setScreen(S.RESULT);
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

  return (
    <>
      {/* 画面本体 */}
      {renderScreen()}

      {/* モックメール表示オーバーレイ（VITE_USE_EMAIL=false のとき送信内容をプレビュー） */}
      {mockEmail && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-court-panel rounded-xl p-6 max-w-sm w-full flex flex-col gap-4">
            <p className="text-xs text-court-gold tracking-widest">📧 メール通知プレビュー</p>
            <p className="text-xs text-gray-400">本番（VITE_USE_EMAIL=true）では以下を送信します</p>
            <div className="bg-court-bg rounded-lg p-3 text-xs space-y-2">
              <p><span className="text-gray-400">宛先：</span>{mockEmail.to}</p>
              <p><span className="text-gray-400">件名：</span>{mockEmail.subject}</p>
              <p className="whitespace-pre-wrap text-gray-300 mt-1">{mockEmail.body}</p>
            </div>
            <button
              onClick={() => setMockEmail(null)}
              className="px-4 py-2 bg-court-gold text-court-bg font-bold rounded-lg text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </>
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
            onSuccess={handleTaskSuccess}
            onFail={handleTaskFail}
          />
        );
      case S.RESULT:
        return <ResultScreen success={lastSuccess} onBackToMyPage={() => setScreen(S.MYPAGE)} />;
      case S.LOG_DETAIL:
        return <LogDetailScreen entry={logEntry} onBack={() => setScreen(S.MYPAGE)} />;
      default:
        return null;
    }
  }
}
