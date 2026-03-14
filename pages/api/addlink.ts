import type { NextApiRequest, NextApiResponse } from "next";
import { put, list } from "@vercel/blob";
import { verifyToken } from "../../lib/auth";

function getToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: "Missing name or url" });

  try {
    let index: { id: string; name: string; url: string; filename: string; uploadedAt: string; uploadedBy: string }[] = [];
    try {
      const { blobs } = await list({ prefix: "republic/index.json" });
      if (blobs && blobs.length > 0) {
        const indexRes = await fetch(blobs[0].url);
        if (indexRes.ok) index = await indexRes.json();
      }
    } catch {}

    index.push({
      id: Date.now().toString(),
      name,
      url,
      filename: url,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user.username,
    });

    await put("republic/index.json", JSON.stringify(index), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to save link" });
  }
}
