import { SignJWT, jwtVerify } from "jose";
import { JWT_SECRET } from "./admins";

const secret = new TextEncoder().encode(JWT_SECRET);

export async function signToken(username: string, role: string): Promise<string> {
  return new SignJWT({ username, role })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<{ username: string; role: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return { username: payload.username as string, role: payload.role as string };
  } catch {
    return null;
  }
}
