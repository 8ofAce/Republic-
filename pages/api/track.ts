import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return res.status(500).json({ error: "No webhook configured" });

  const { loggedIn, username, role, userAgent, isReturning, visitCount, page } = req.body;

  const ua = userAgent || "";
  let device = "💻 Desktop";
  let browser = "Unknown browser";

  if (/iPhone/.test(ua)) device = "📱 iPhone";
  else if (/iPad/.test(ua)) device = "📱 iPad";
  else if (/Android/.test(ua) && /Mobile/.test(ua)) device = "📱 Android Phone";
  else if (/Android/.test(ua)) device = "📱 Android Tablet";
  else if (/Macintosh/.test(ua)) device = "💻 Mac";
  else if (/Windows/.test(ua)) device = "💻 Windows";
  else if (/Linux/.test(ua)) device = "💻 Linux";

  if (/CriOS|Chrome/.test(ua) && !/Edg/.test(ua)) browser = "Chrome";
  else if (/Firefox|FxiOS/.test(ua)) browser = "Firefox";
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/Edg/.test(ua)) browser = "Edge";
  else if (/OPR|Opera/.test(ua)) browser = "Opera";

  const isNew = !isReturning;
  const color = isNew ? 0x5865f2 : 0x43b581;
  const title = isNew ? "👁️ New Visitor" : `✅ Returning Visitor${visitCount ? ` · Visit #${visitCount}` : ""}`;

  const statusValue = loggedIn
    ? `🔐 Logged in as **${username}** · ${role}`
    : "🔓 Not logged in";

  const firstVisitValue = isNew ? "Yes — welcome! 👋" : `No — visit #${visitCount || "?"}`;

  const embed = {
    title,
    color,
    fields: [
      { name: "🔑 Status", value: statusValue, inline: false },
      { name: "📱 Device", value: `${device} · ${browser}`, inline: false },
      { name: "🕐 First Visit", value: firstVisitValue, inline: false },
      { name: "🌍 Page", value: page || "republic-rho.vercel.app", inline: false },
    ],
    footer: { text: "republic · visitor log" },
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to send webhook" });
  }
}
