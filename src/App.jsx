import { useState, useEffect } from "react";
import LoginScreen from "./screens/LoginScreen";
import HabitSelectScreen from "./screens/HabitSelectScreen";
import MyPageScreen from "./screens/MyPageScreen";
import QuestionScreen from "./screens/QuestionScreen";
import GachaScreen from "./screens/GachaScreen";
import TaskScreen from "./screens/TaskScreen";
import ResultScreen from "./screens/ResultScreen";

import { getLoggedInUser, getUserData, recordResult, logout } from "./store";

const S = {
  LOGIN: "login",
  HABIT_SELECT: "habit_select",
  MYPAGE: "mypage",
  QUESTION: "question",
  GACHA: "gacha",
  TASK: "task",
  RESULT: "result",
};

export default function App() {
  const [screen, setScreen] = useState(S.LOGIN);
  const [username, setUsername] = useState(null);
  const [data, setData] = useState(null);

  // 進行中の状態
  const [currentHabit, setCurrentHabit] = useState(null);
  const [currentTask, setCurrentTask] = useState(null);
  const [lastSuccess, setLastSuccess] = useState(false);

  // リロード時にログイン状態を復帰
  useEffect(() => {
    async function init() {
      const u = await getLoggedInUser();
      if (u) {
        setUsername(u);
        loadData(u);
      }
    }
    init();
  }, []);

  async function loadData(u) {
    const d = await getUserData();
    setData(d);
    // サボり癖が未選択なら選択画面、選択済みならマイページ
    if (!d.selectedHabits || d.selectedHabits.length === 0) {
      setScreen(S.HABIT_SELECT);
    } else {
      setScreen(S.MYPAGE);
    }
  }

  // ログイン成功
  async function handleLoggedIn(u) {
    setUsername(u);
    await loadData(u);
  }

  // サボり癖選択完了
  async function handleHabitsDone() {
    const d = await getUserData();
    setData(d);
    setScreen(S.MYPAGE);
  }

  // 今日の課題を始める
  function handleStart() {
    setScreen(S.QUESTION);
  }

  // 質問完了 → ガチャへ
  function handleQuestionComplete({ habitId }) {
    setCurrentHabit(habitId);
    setScreen(S.GACHA);
  }

  // ガチャ完了 → 課題画面へ
  function handleGachaComplete(task) {
    setCurrentTask(task);
    setScreen(S.TASK);
  }

  // 課題成功
  async function handleTaskSuccess({ comment, withEvidence }) {
    await recordResult({
      habitId: currentHabit,
      taskText: currentTask.text,
      result: "success",
      comment: comment + (withEvidence ? "" : "（自己申告）"),
    });
    const d = await getUserData();
    setData(d);
    setLastSuccess(true);
    setScreen(S.RESULT);
  }

  // 課題失敗（時間切れ）
  async function handleTaskFail() {
    await recordResult({
      habitId: currentHabit,
      taskText: currentTask.text,
      result: "fail",
      comment: "",
    });
    const d = await getUserData();
    setData(d);
    setLastSuccess(false);
    setScreen(S.RESULT);
  }

  // ログアウト
  async function handleLogout() {
    await logout();
    setUsername(null);
    setData(null);
    setScreen(S.LOGIN);
  }

  // 現在のカテゴリのレベルを取得（ガチャに渡す）
  function currentLevel() {
    if (!data || !currentHabit) return 1;
    return data.habitStreaks?.[currentHabit]?.level || 1;
  }

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
        />
      ) : null;
    case S.QUESTION:
      return (
        <QuestionScreen
          selectedHabits={data?.selectedHabits || []}
          onComplete={handleQuestionComplete}
        />
      );
    case S.GACHA:
      return (
        <GachaScreen
          habitId={currentHabit}
          level={currentLevel()}
          onComplete={handleGachaComplete}
        />
      );
    case S.TASK:
      return (
        <TaskScreen
          task={currentTask}
          onSuccess={handleTaskSuccess}
          onFail={handleTaskFail}
        />
      );
    case S.RESULT:
      return (
        <ResultScreen
          success={lastSuccess}
          onBackToMyPage={() => setScreen(S.MYPAGE)}
        />
      );
    default:
      return null;
  }
}
