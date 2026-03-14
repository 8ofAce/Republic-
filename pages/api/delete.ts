import type { NextApiRequest, NextApiResponse } from "next";
import { del, put } from "@vercel/blob";
import { verifyToken } from "../../lib/auth";

function getToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "DELETE") return res.status(405).end();

  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  const { id, url } = req.body;
  if (!id) return res.status(400).json({ error: "Missing id" });

  try {
    // Remove from index
    let index: { id: string; name: string; url: string; filename: string; uploadedAt: string; uploadedBy: string }[] = [];

    try {
      const indexBlob = await fetch(
        `https://${process.env.BLOB_STORE_HOSTNAME}/republic/index.json`
      );
      if (indexBlob.ok) index = await indexBlob.json();
    } catch {}

    index = index.filter((f) => f.id !== id);

    await put("republic/index.json", JSON.stringify(index), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    // Delete actual blob
    if (url) {
      try {
        await del(url);
      } catch {}
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Delete failed" });
  }
}
