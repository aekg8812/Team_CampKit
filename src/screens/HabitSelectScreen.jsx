import { useState } from "react";
import { motion } from "framer-motion";
import { HABITS } from "../data/habits";
import { saveSelectedHabits } from "../store";

const spring = { type: "spring", stiffness: 280, damping: 26 };

export default function HabitSelectScreen({ initial, onDone }) {
  const [selected, setSelected] = useState(initial || []);
  const [busy, setBusy] = useState(false);

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (selected.length === 0) return;
    setBusy(true);
    await saveSelectedHabits(selected);
    onDone(selected);
  }

  return (
    <div className="court-frame flex flex-col gap-4 py-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <h2 className="text-xl font-bold">治したいサボり癖</h2>
        <p className="text-sm text-gray-400 mt-1">複数選択できます</p>
      </motion.div>

      <div className="flex flex-col gap-2.5">
        {HABITS.map((h, i) => {
          const on = selected.includes(h.id);
          return (
            <motion.button
              key={h.id}
              onClick={() => toggle(h.id)}
              whileTap={{ scale: 0.97 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.04 }}
              className={`flex items-center gap-3 px-4 py-4 rounded-2xl border text-left transition-colors ${
                on
                  ? "border-court-gold bg-court-gold/10 text-white"
                  : "border-white/20 bg-court-panel text-gray-300"
              }`}
              style={on ? { boxShadow: "0 0 0 1px rgba(201,162,39,0.3)" } : undefined}
            >
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm shrink-0 font-bold transition-colors ${
                  on ? "bg-court-gold text-court-bg" : "bg-court-panel2 text-gray-400"
                }`}
              >
                {on ? "✓" : ""}
              </span>
              <span className="text-xl">{h.icon}</span>
              <span className="text-sm">{h.label}</span>
            </motion.button>
          );
        })}
      </div>

      <motion.button
        onClick={handleSave}
        disabled={selected.length === 0 || busy}
        whileTap={{ scale: 0.97 }}
        className="mt-2 py-4 bg-court-gold text-court-bg font-bold rounded-2xl text-sm disabled:opacity-40 transition-opacity"
        style={{ boxShadow: selected.length > 0 ? "0 4px 20px rgba(201,162,39,0.3)" : undefined }}
      >
        {busy ? "保存中…" : `選択を確定する（${selected.length}個）`}
      </motion.button>
    </div>
  );
}
