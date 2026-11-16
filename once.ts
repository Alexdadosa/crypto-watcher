import * as webpush from "web-push";
import { existsSync, readFileSync } from "fs";

const PUBLIC_KEY =
  "BLE0pTg9JyDFxOAdoC_ZhZLLuJBwIiTVO3_9C-9V-mzSJxXgjnV5Lxwo7XYhzLWUFjWgmlFH-O-Va4SSNml92uY";
const PRIVATE_KEY = process.env.VAPID_PRIVATE ?? "";
if (!PRIVATE_KEY) {
  console.error("Missing VAPID_PRIVATE");
  process.exit(1);
}

const subJson =
  process.env.SUBSCRIPTION_JSON ??
  (existsSync("subscription.json") ? readFileSync("subscription.json", "utf8") : "");
if (!subJson) {
  console.error("Missing subscription");
  process.exit(1);
}

webpush.setVapidDetails("mailto:test@example.com", PUBLIC_KEY, PRIVATE_KEY);
const subscription = JSON.parse(subJson);

const COINS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
const ALERT_PERCENT = Number(process.env.ALERT_PERCENT ?? 1);

async function checkCoin(coin: string) {
  const url = `https://data-api.binance.vision/api/v3/klines?symbol=${coin}&interval=1m&limit=6`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${coin}: API error ${res.status}`);
  const candles = (await res.json()) as string[][];
  const oldPrice = parseFloat(candles[0][4]);
  const price = parseFloat(candles[candles.length - 1][4]);
  const change = ((price - oldPrice) / oldPrice) * 100;
  console.log(`${coin}: ${price} (${change.toFixed(2)}% / 5min)`);

  if (Math.abs(change) >= ALERT_PERCENT) {
    const message = `${coin.replace("USDT", "")} moved ${change.toFixed(2)}% in 5 min (now $${price})`;
    await webpush.sendNotification(
      subscription,
      JSON.stringify({ title: "Crypto Alert", body: message })
    );
    console.log("📲 Push sent:", message);
  }
}

async function main() {
  for (const coin of COINS) {
    try {
      await checkCoin(coin);
    } catch (e) {
      console.error("Failed:", e);
    }
  }
}

main();