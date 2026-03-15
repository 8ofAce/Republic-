import type { NextApiRequest, NextApiResponse } from "next";
import { put, list } from "@vercel/blob";
import { verifyToken } from "../../lib/auth";

function getToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

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

async function saveUsers(users: User[]) {
  await put("republic/users.json", JSON.stringify(users), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const admin = await verifyToken(token);
  if (!admin || admin.role !== "admin") return res.status(403).json({ error: "Admins only" });

  // GET - list users
  if (req.method === "GET") {
    const users = await getUsers();
    // Never send passwords to client
    return res.status(200).json(users.map(({ password: _p, ...u }) => u));
  }

  // POST - create user
  if (req.method === "POST") {
    const { username, password, tier } = req.body;
    if (!username || !password || !tier) return res.status(400).json({ error: "Missing fields" });

    const users = await getUsers();
    if (users.find((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: "Username already exists" });
    }

    users.push({
      id: Date.now().toString(),
      username,
      password,
      tier: tier as "basic" | "premium",
      createdAt: new Date().toISOString(),
    });

    await saveUsers(users);
    return res.status(200).json({ success: true });
  }

  // DELETE - remove user
  if (req.method === "DELETE") {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing id" });

    let users = await getUsers();
    users = users.filter((u) => u.id !== id);
    await saveUsers(users);
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
