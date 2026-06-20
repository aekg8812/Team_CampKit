import { useState } from "react";
import { motion } from "framer-motion";
import { register, login, resetPassword } from "../store";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-court-panel border border-court-panel2 focus:border-court-gold outline-none text-sm transition-colors placeholder:text-court-muted";

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
      if (!r.ok) { setError(r.error); setBusy(false); return; }
      setMode("login");
      setPassword(""); setPassword2(""); setNotifyEmail("");
      setError("登録できました。ログインしてください");
      setBusy(false);
      return;
    }

    if (mode === "reset") {
      const r = await resetPassword(username, password);
      if (!r.ok) { setError(r.error); setBusy(false); return; }
      setMode("login");
      setPassword(""); setPassword2("");
      setError("パスワードを変更しました。ログインしてください");
      setBusy(false);
      return;
    }

    const r = await login(username, password);
    if (!r.ok) { setError(r.error); setBusy(false); return; }
    onLoggedIn(username);
  }

  const titles = { login: "ログイン", register: "新規登録", reset: "パスワード再設定" };

  return (
    <div className="court-frame flex flex-col justify-center gap-5 min-h-screen">
      {/* ロゴ */}
      <motion.div
        className="text-center mb-2"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <h1 className="text-3xl font-extrabold text-court-gold tracking-tight">
          サボり癖クリア
        </h1>
        <p className="text-court-muted text-sm mt-1">習慣化アプリ</p>
      </motion.div>

      {/* フォームカード */}
      <motion.div
        className="bg-court-panel rounded-2xl p-6 flex flex-col gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        <p className="text-sm font-semibold text-court-muted">{titles[mode]}</p>

        <input
          className={inputClass}
          placeholder="ユーザー名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          className={inputClass}
          placeholder={mode === "reset" ? "新しいパスワード" : "パスワード"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        {(mode === "register" || mode === "reset") && (
          <input
            type="password"
            className={inputClass}
            placeholder="パスワード（確認用）"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        )}
        {mode === "register" && (
          <div className="flex flex-col gap-1">
            <input
              type="email"
              className={inputClass}
              placeholder="通知先メールアドレス（必須）"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
            />
            <p className="text-xs text-court-muted px-1">
              サボったとき通知が届く第三者（親・友人など）のアドレスを入力
            </p>
          </div>
        )}

        {error && (
          <p className="text-sm text-court-mid text-center rounded-xl bg-court-mid/10 py-2 px-3">
            {error}
          </p>
        )}

        <motion.button
          onClick={handleSubmit}
          disabled={busy}
          whileTap={{ scale: 0.97 }}
          className="w-full py-3.5 bg-court-gold text-court-bg font-bold rounded-xl text-sm disabled:opacity-50 transition-opacity"
        >
          {busy ? "処理中…" : titles[mode]}
        </motion.button>

        <div className="flex justify-between text-xs text-court-muted pt-1">
          {mode !== "login" && (
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className="hover:text-white transition-colors"
            >
              ← ログインへ
            </button>
          )}
          {mode === "login" && (
            <>
              <button
                onClick={() => { setMode("register"); setError(""); }}
                className="hover:text-white transition-colors"
              >
                新規登録
              </button>
              <button
                onClick={() => { setMode("reset"); setError(""); }}
                className="hover:text-white transition-colors"
              >
                パスワードを忘れた
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
