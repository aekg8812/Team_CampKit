import { useState } from "react";
import { register, login, resetPassword } from "../store";

export default function LoginScreen({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // login | register | reset
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!username || !password) {
      setError("ユーザー名とパスワードを入力してください");
      return;
    }
    if ((mode === "register" || mode === "reset") && password !== password2) {
      setError("確認用パスワードが一致しません");
      return;
    }
    setBusy(true);

    if (mode === "register") {
      if (!notifyEmail || !notifyEmail.includes("@")) {
        setError("通知先メールアドレス（第三者）を正しく入力してください");
        setBusy(false);
        return;
      }
      const r = await register(username, password, notifyEmail);
      if (!r.ok) {
        setError(r.error);
        setBusy(false);
        return;
      }
      setMode("login");
      setPassword("");
      setPassword2("");
      setNotifyEmail("");
      setError("登録できました。ログインしてください");
      setBusy(false);
      return;
    }

    if (mode === "reset") {
      const r = await resetPassword(username, password);
      if (!r.ok) {
        setError(r.error);
        setBusy(false);
        return;
      }
      setMode("login");
      setPassword("");
      setPassword2("");
      setError("パスワードを変更しました。ログインしてください");
      setBusy(false);
      return;
    }

    // login
    const r = await login(username, password);
    if (!r.ok) {
      setError(r.error);
      setBusy(false);
      return;
    }
    onLoggedIn(username);
  }

  const titles = { login: "ログイン", register: "新規登録", reset: "パスワード再設定" };

  return (
    <div className="court-frame flex flex-col justify-center gap-5">
      <h1 className="text-2xl font-extrabold text-center text-court-gold">
        サボり癖クリア
      </h1>
      <p className="text-center text-sm text-gray-400 -mt-2">{titles[mode]}</p>

      <input
        className="px-4 py-3 rounded-lg bg-court-panel border border-gray-700 focus:border-court-gold outline-none"
        placeholder="ユーザー名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <input
        type="password"
        className="px-4 py-3 rounded-lg bg-court-panel border border-gray-700 focus:border-court-gold outline-none"
        placeholder={mode === "reset" ? "新しいパスワード" : "パスワード"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {(mode === "register" || mode === "reset") && (
        <input
          type="password"
          className="px-4 py-3 rounded-lg bg-court-panel border border-gray-700 focus:border-court-gold outline-none"
          placeholder="パスワード（確認用）"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
      )}

      {mode === "register" && (
        <div className="flex flex-col gap-1">
          <input
            type="email"
            className="px-4 py-3 rounded-lg bg-court-panel border border-gray-700 focus:border-court-gold outline-none"
            placeholder="通知先メールアドレス（必須）"
            value={notifyEmail}
            onChange={(e) => setNotifyEmail(e.target.value)}
          />
          <p className="text-xs text-gray-500 px-1">
            ※ サボったとき通知が届く第三者（親・友人・上司など）のアドレスを入力してください
          </p>
        </div>
      )}

      {error && <p className="text-sm text-center text-court-mid">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={busy}
        className="px-6 py-3 bg-court-gold text-court-bg font-bold rounded-lg disabled:opacity-50"
      >
        {busy ? "処理中…" : titles[mode]}
      </button>

      <div className="flex justify-between text-xs text-gray-400 mt-2">
        {mode !== "login" && (
          <button onClick={() => { setMode("login"); setError(""); }}>
            ログインへ
          </button>
        )}
        {mode === "login" && (
          <>
            <button onClick={() => { setMode("register"); setError(""); }}>
              新規登録
            </button>
            <button onClick={() => { setMode("reset"); setError(""); }}>
              パスワードを忘れた
            </button>
          </>
        )}
      </div>
    </div>
  );
}
