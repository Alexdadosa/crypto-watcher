import * as webpush from "web-push";
import { readFileSync } from "fs";

const PUBLIC_KEY =
  "BLE0pTg9JyDFxOAdoC_ZhZLLuJBwIiTVO3_9C-9V-mzSJxXgjnV5Lxwo7XYhzLWUFjWgmlFH-O-Va4SSNml92uY";
const PRIVATE_KEY = process.env.VAPID_PRIVATE ?? "";
if (!PRIVATE_KEY) {
  console.error("Missing VAPID_PRIVATE environment variable");
  process.exit(1);
}
webpush.setVapidDetails("mailto:test@example.com", PUBLIC_KEY, PRIVATE_KEY);
const subscription = JSON.parse(readFileSync("subscription.json", "utf8"));

const COINS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const ALERT_PERCENT = 1; // test value, we set it to 1 later
const WINDOW_MS = 5 * 60 * 1000;
const CHECK_EVERY_MS = 10 * 1000;
const COOLDOWN_MS = 10 * 60 * 1000;

const priceHistory: Record<string, { t: number; p: number }[]> = {};
const lastAlert: Record<string, number> = {};

async function getPrices(): Promise<Record<string, number>> {
  const url =
    "https://api.binance.com/api/v3/ticker/price?symbols=" +
    encodeURIComponent(JSON.stringify(COINS));
  const res = await fetch(url);
  if (!res.ok) throw new Error("API error " + res.status);
  const data = (await res.json()) as { symbol: string; price: string }[];
  return Object.fromEntries(data.map((d) => [d.symbol, parseFloat(d.price)]));
}

async function notify(coin: string, message: string) {
  const now = Date.now();
  if (now - (lastAlert[coin] ?? 0) < COOLDOWN_MS) return;
  lastAlert[coin] = now;
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: "Crypto Alert", body: message })
    );
    console.log("📲 Push sent:", message);
  } catch (e) {
    console.error("Push failed:", e);
  }
}

async function tick() {
  try {
    const prices = await getPrices();
    const now = Date.now();
    for (const coin of COINS) {
      const price = prices[coin];
      const h = (priceHistory[coin] ??= []);
      h.push({ t: now, p: price });
      while (h.length && now - h[0].t > WINDOW_MS) h.shift();

      const change = ((price - h[0].p) / h[0].p) * 100;
      console.log(`${coin}: ${price.toFixed(2)} (${change.toFixed(2)}% / 5min)`);

      if (Math.abs(change) >= ALERT_PERCENT) {
        await notify(
          coin,
          `${coin.replace("USDT", "")} moved ${change.toFixed(2)}% in 5 min (now $${price.toFixed(2)})`
        );
      }
    }
  } catch (e) {
    console.error("Check failed:", e);
  }
}

setInterval(tick, CHECK_EVERY_MS);
tick();