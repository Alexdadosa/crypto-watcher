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

webpush
  .sendNotification(
    subscription,
    JSON.stringify({ title: "Crypto Alert", body: "It works! 🚀" })
  )
  .then(() => console.log("Sent!"))
  .catch((err) => console.error("Failed:", err.statusCode, err.body));