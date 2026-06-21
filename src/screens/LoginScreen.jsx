import { useState } from "react";
import { motion } from "framer-motion";
import { register, login, resetPassword } from "../store";

// 入力欄：常時 white/20 枠、フォーカスで gold 枠
const inputClass =
  "w-full px-4 py-3.5 rounded-2xl bg-court-panel2 border border-white/20 focus:border-court-gold outline-none text-sm transition-colors placeholder:text-court-muted";

const spring = { type: "spring", stiffness: 300, damping: 28 };

export default function LoginScreen({ onLoggedIn }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="court-frame flex flex-col justify-center gap-6 min-h-screen">
      {/* ロゴ */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0 }}
      >
        <h1 className="text-3xl font-extrabold text-court-gold tracking-tight">
          サボり法廷
        </h1>
        <p className="text-court-muted text-sm mt-1">サボり癖を毎日裁く、習慣化アプリ</p>
      </motion.div>

      {/* フォームカード */}
      <motion.div
        className="bg-court-panel rounded-3xl p-6 flex flex-col gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.08 }}
        style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)" }}
      >
        <p className="text-sm font-semibold text-court-muted">{titles[mode]}</p>

        {/* ユーザー名 */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 px-1">ユーザー名</label>
          <input
            className={inputClass}
            placeholder="例: 山田太郎"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        {/* パスワード */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400 px-1">
            {mode === "reset" ? "新しいパスワード" : "パスワード"}
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className={`${inputClass} pr-12`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && mode === "login" && handleSubmit()}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "パスワードを隠す" : "パスワードを表示"}
              className="absolute inset-y-0 right-0 px-4 flex items-center text-court-muted hover:text-white transition-colors"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          <p className="text-xs text-court-muted px-1 mt-0.5">6文字以上入力してください</p>
        </div>

        {/* パスワード確認 */}
        {(mode === "register" || mode === "reset") && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 px-1">パスワード（確認用）</label>
            <input
              type="password"
              className={inputClass}
              placeholder="••••••••"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
            />
          </div>
        )}

        {/* 通知先メール */}
        {mode === "register" && (
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 px-1">通知先メールアドレス（必須）</label>
            <input
              type="email"
              className={inputClass}
              placeholder="親・友人・上司など"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
            />
            <p className="text-xs text-court-muted px-1 mt-0.5">
              サボりが累積すると、ここに密告メールが届きます
            </p>
          </div>
        )}

        {error && (
          <motion.p
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-sm text-court-mid text-center rounded-2xl bg-court-mid/10 py-2.5 px-3"
          >
            {error}
          </motion.p>
        )}

        <motion.button
          onClick={handleSubmit}
          disabled={busy}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 bg-court-gold text-court-bg font-bold rounded-2xl text-sm disabled:opacity-50 transition-opacity mt-1"
          style={{ boxShadow: "0 4px 16px rgba(201,162,39,0.3)" }}
        >
          {busy ? "処理中…" : titles[mode]}
        </motion.button>

        <div className="flex justify-between text-xs text-gray-400 pt-1">
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

// パスワード表示中アイコン（クリックで隠す）
function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// パスワード非表示アイコン（クリックで表示）
function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
