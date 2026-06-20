import { useState } from "react";
import { HABITS } from "../data/habits";
import { saveSelectedHabits } from "../store";

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
    <div className="court-frame flex flex-col gap-4">
      <h2 className="text-xl font-bold mt-4">
        治したいサボり癖を選んでください
      </h2>
      <p className="text-sm text-gray-400 -mt-2">複数選択できます</p>

      <div className="flex flex-col gap-3 mt-2">
        {HABITS.map((h) => {
          const on = selected.includes(h.id);
          return (
            <button
              key={h.id}
              onClick={() => toggle(h.id)}
              className={`flex items-center gap-3 px-4 py-4 rounded-lg border text-left transition ${
                on
                  ? "border-court-gold bg-court-gold/10"
                  : "border-gray-700 bg-court-panel"
              }`}
            >
              <span
                className={`w-6 h-6 rounded flex items-center justify-center text-sm shrink-0 ${
                  on ? "bg-court-gold text-court-bg" : "bg-gray-700"
                }`}
              >
                {on ? "✓" : ""}
              </span>
              <span className="text-xl">{h.icon}</span>
              <span>{h.label}</span>
            </button>
          );
        })}
      </div>

      <button
        onClick={handleSave}
        disabled={selected.length === 0 || busy}
        className="mt-4 px-6 py-3 bg-court-gold text-court-bg font-bold rounded-lg disabled:opacity-40"
      >
        {busy ? "保存中…" : `選択を確定する（${selected.length}個）`}
      </button>
    </div>
  );
}
