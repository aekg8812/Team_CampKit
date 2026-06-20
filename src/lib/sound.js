import { Howl } from "howler";

// public/sounds/ に音声ファイルを置く（フリー素材でOK）
// ファイルが無くても再生がスキップされるだけでアプリは落ちない
const SOUND_SRC = {
  gavel:        ["/sounds/gavel.mp3"],        // 木槌「ガンッ」
  roulette:     ["/sounds/roulette.mp3"],     // ルーレット回転（ループ）
  alarm:        ["/sounds/alarm.mp3"],        // 重刑の警報
  reveal:       ["/sounds/reveal.mp3"],       // 予言タイプ音
  clear:        ["/sounds/clear.mp3"],        // 執行完了
  fail:         ["/sounds/fail.mp3"],         // 執行失敗
  bgm_question: ["/sounds/bgm_question.mp3"], // 質問画面BGM（ループ）
  bgm_gacha:    ["/sounds/bgm_gacha.mp3"],    // ガチャ画面BGM（ループ）
};

const LOOPING = new Set(["roulette", "bgm_question", "bgm_gacha"]);

const cache = {};

function getHowl(name) {
  if (!SOUND_SRC[name]) return null;
  if (!cache[name]) {
    try {
      cache[name] = new Howl({
        src: SOUND_SRC[name],
        volume: name.startsWith("bgm_") ? 0.4 : name === "roulette" ? 0.5 : 0.7,
        loop: LOOPING.has(name),
      });
    } catch {
      return null;
    }
  }
  return cache[name];
}

export function play(name) {
  try {
    getHowl(name)?.play();
  } catch {}
}

export function stop(name) {
  try {
    getHowl(name)?.stop();
  } catch {}
}
