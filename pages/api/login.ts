import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { ADMINS } from "../../lib/admins";
import { signToken } from "../../lib/auth";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  const admin = ADMINS.find(
    (a) => a.username.toLowerCase() === username.toLowerCase()
  );

  if (!admin) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = await signToken(admin.username);
  return res.status(200).json({ token, username: admin.username });
}
