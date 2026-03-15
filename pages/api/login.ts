import type { NextApiRequest, NextApiResponse } from "next";
import { signToken } from "../../lib/auth";
import { list, put } from "@vercel/blob";

const ADMINS = [
  { username: "admin", password: "republic2026" },
];

type User = {
  id: string;
  username: string;
  password: string;
  tier: "basic" | "premium";
  createdAt: string;
};

async function getUsers(): Promise<User[]> {
  try {
    const { blobs } = await list({ prefix: "republic/users.json" });
    if (blobs && blobs.length > 0) {
      const res = await fetch(blobs[0].url + "?t=" + Date.now());
      if (res.ok) return await res.json();
    }
  } catch {}
  return [];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  // Check admins first
  const admin = ADMINS.find(
    (a) => a.username.toLowerCase() === username.toLowerCase() && a.password === password
  );
  if (admin) {
    const token = await signToken(admin.username, "admin");
    return res.status(200).json({ token, username: admin.username, role: "admin" });
  }

  // Check regular users
  const users = await getUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  if (user) {
    const token = await signToken(user.username, user.tier);
    return res.status(200).json({ token, username: user.username, role: user.tier });
  }

  return res.status(401).json({ error: "Invalid credentials" });
}
