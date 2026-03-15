import type { NextApiRequest, NextApiResponse } from "next";
import { list } from "@vercel/blob";
import { verifyToken } from "../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();

  // Determine role from token if present
  let role = "guest";
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    const user = await verifyToken(auth.slice(7));
    if (user) role = user.role;
  }

  // Guests get empty list (locked screen shown on frontend)
  if (role === "guest") {
    return res.status(200).json({ locked: true, files: [] });
  }

  try {
    const { blobs } = await list({ prefix: "republic/index.json" });
    if (!blobs || blobs.length === 0) return res.status(200).json({ locked: false, files: [] });

    const response = await fetch(blobs[0].url + "?t=" + Date.now());
    if (!response.ok) return res.status(200).json({ locked: false, files: [] });

    const allFiles = await response.json();

    // Filter by access level
    const filtered = allFiles.filter((f: { access?: string }) => {
      const access = f.access || "both";
      if (role === "admin") return true;
      if (role === "premium") return true; // premium sees everything
      if (role === "basic") return access === "basic" || access === "both";
      return false;
    });

    return res.status(200).json({ locked: false, files: filtered });
  } catch (e) {
    console.error(e);
    return res.status(200).json({ locked: false, files: [] });
  }
}
