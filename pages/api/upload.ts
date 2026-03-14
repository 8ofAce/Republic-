import type { NextApiRequest, NextApiResponse } from "next";
import { put } from "@vercel/blob";
import { verifyToken } from "../../lib/auth";

export const config = {
  api: { bodyParser: false },
};

function getToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

async function parseMultipart(req: NextApiRequest): Promise<{ name: string; fileBuffer: Buffer; filename: string; mimetype: string } | null> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers["content-type"] || "";
        const boundary = contentType.split("boundary=")[1];
        if (!boundary) return resolve(null);

        const parts = body.toString("binary").split(`--${boundary}`);
        let name = "";
        let fileBuffer: Buffer | null = null;
        let filename = "upload";
        let mimetype = "application/octet-stream";

        for (const part of parts) {
          if (part.includes('name="name"')) {
            const match = part.split("\r\n\r\n");
            if (match[1]) name = match[1].replace(/\r\n--$/, "").trim();
          }
          if (part.includes('name="file"')) {
            const filenameMatch = part.match(/filename="([^"]+)"/);
            if (filenameMatch) filename = filenameMatch[1];
            const mimeMatch = part.match(/Content-Type: ([^\r\n]+)/);
            if (mimeMatch) mimetype = mimeMatch[1].trim();
            const headerEnd = part.indexOf("\r\n\r\n");
            if (headerEnd !== -1) {
              const fileData = part.slice(headerEnd + 4).replace(/\r\n--$/, "");
              fileBuffer = Buffer.from(fileData, "binary");
            }
          }
        }

        if (!name || !fileBuffer) return resolve(null);
        resolve({ name, fileBuffer, filename, mimetype });
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  try {
    const parsed = await parseMultipart(req);
    if (!parsed) return res.status(400).json({ error: "Missing name or file" });

    const { name, fileBuffer, filename, mimetype } = parsed;

    const blob = await put(`republic/${Date.now()}-${filename}`, fileBuffer, {
      access: "public",
      contentType: mimetype,
      addRandomSuffix: false,
    });

    // Update index
    let index: { id: string; name: string; url: string; filename: string; uploadedAt: string; uploadedBy: string }[] = [];try {
      const { blobs } = await list({ prefix: "republic/index.json" });
      if (blobs && blobs.length > 0) {
        const indexRes = await fetch(blobs[0].url);
        if (indexRes.ok) index = await indexRes.json();
      }
    } catch {}

    index.push({
      id: Date.now().toString(),
      name,
      url: blob.url,
      filename,
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
    return res.status(500).json({ error: "Storage error" });
  }
}
