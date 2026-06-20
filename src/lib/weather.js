const OWM_KEY = import.meta.env.VITE_OWM_API_KEY;

// 緯度経度から現在天気を取得。失敗時は晴れ扱いでフォールバック
export async function fetchWeather() {
  if (!OWM_KEY || OWM_KEY.startsWith("YOUR_")) {
    return { main: "Clear", description: "晴れ", isRain: false, temp: null };
  }
  const coords = await getCoords();
  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${coords.lat}&lon=${coords.lon}&appid=${OWM_KEY}&units=metric&lang=ja`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const main = data.weather?.[0]?.main ?? "Clear"; // Rain / Clouds / Clear ...
    return {
      main,
      description: data.weather?.[0]?.description ?? "晴れ",
      isRain: main === "Rain" || main === "Drizzle" || main === "Thunderstorm",
      temp: data.main?.temp ?? null,
    };
  } catch (e) {
    return { main: "Clear", description: "晴れ", isRain: false, temp: null };
  }
}

function getCoords() {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return resolve({ lat: 35.68, lon: 139.76 });
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve({ lat: 35.68, lon: 139.76 }), // 拒否されたら東京
      { timeout: 4000 }
    );
  });
}
