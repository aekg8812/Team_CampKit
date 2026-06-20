import { Howl } from "howler";

// public/sounds/ に音声ファイルを置く（フリー素材でOK）
// ファイルが無くても再生がスキップされるだけでアプリは落ちない
const SOUND_SRC = {
  gavel: ["/sounds/gavel.mp3"], // 木槌「ガンッ」
  roulette: ["/sounds/roulette.mp3"], // ルーレット回転（ループ）
  alarm: ["/sounds/alarm.mp3"], // 重刑の警報
  reveal: ["/sounds/reveal.mp3"], // 予言タイプ音
  clear: ["/sounds/clear.mp3"], // 執行完了
  fail: ["/sounds/fail.mp3"], // 執行失敗
};

const LOOPING = new Set(["roulette"]);

// Howlインスタンスは初回再生時に遅延生成する（起動時の無駄なロードを避ける）
const cache = {};

function getHowl(name) {
  if (!SOUND_SRC[name]) return null;
  if (!cache[name]) {
    try {
      cache[name] = new Howl({
        src: SOUND_SRC[name],
        volume: name === "roulette" ? 0.5 : 0.7,
        loop: LOOPING.has(name),
      });
    } catch (e) {
      return null;
    }
  }
  return cache[name];
}

export function play(name) {
  try {
    getHowl(name)?.play();
  } catch (e) {}
}

export function stop(name) {
  try {
    getHowl(name)?.stop();
  } catch (e) {}
}
