import type { NextApiRequest, NextApiResponse } from "next";
import { put, list } from "@vercel/blob";
import { verifyToken } from "../../lib/auth";

function getToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

type Dev = {
  id: string;
  name: string;
  title: string;
  image: string;
  addedAt: string;
};

async function getDevs(): Promise<Dev[]> {
  try {
    const { blobs } = await list({ prefix: "republic/devs.json" });
    if (blobs && blobs.length > 0) {
      const res = await fetch(blobs[0].url + "?t=" + Date.now());
      if (res.ok) return await res.json();
    }
  } catch {}
  return [];
}

async function saveDevs(devs: Dev[]) {
  await put("republic/devs.json", JSON.stringify(devs), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  // ADD a dev
  if (req.method === "POST") {
    const { name, title, image } = req.body;
    if (!name || !title) {
      return res.status(400).json({ error: "Name and title are required" });
    }

    const devs = await getDevs();
    devs.push({
      id: Date.now().toString(),
      name,
      title,
      image: image || "",
      addedAt: new Date().toISOString(),
    });

    await saveDevs(devs);
    return res.status(200).json({ success: true });
  }

  // DELETE a dev
  if (req.method === "DELETE") {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing id" });

    let devs = await getDevs();
    devs = devs.filter((d) => d.id !== id);
    await saveDevs(devs);
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
