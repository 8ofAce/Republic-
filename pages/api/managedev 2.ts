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

export const config = {
  api: { bodyParser: false },
};

async function parseBody(req: NextApiRequest): Promise<{ fields: Record<string, string>; fileBuffer?: Buffer; filename?: string; mimetype?: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks);
        const contentType = req.headers["content-type"] || "";

        if (contentType.includes("application/json")) {
          const json = JSON.parse(body.toString());
          return resolve({ fields: json });
        }

        if (contentType.includes("multipart/form-data")) {
          const boundary = contentType.split("boundary=")[1];
          if (!boundary) return resolve({ fields: {} });

          const parts = body.toString("binary").split(`--${boundary}`);
          const fields: Record<string, string> = {};
          let fileBuffer: Buffer | undefined;
          let filename: string | undefined;
          let mimetype: string | undefined;

          for (const part of parts) {
            if (part.includes('name="id"') || part.includes('name="name"') || part.includes('name="title"')) {
              const nameMatch = part.match(/name="([^"]+)"/);
              const valueMatch = part.split("\r\n\r\n");
              if (nameMatch && valueMatch[1]) {
                fields[nameMatch[1]] = valueMatch[1].replace(/\r\n--$/, "").trim();
              }
            }
            if (part.includes('name="image"') && part.includes("filename=")) {
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
          return resolve({ fields, fileBuffer, filename, mimetype });
        }

        resolve({ fields: {} });
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const user = await verifyToken(token);
  if (!user) return res.status(401).json({ error: "Invalid token" });

  if (req.method === "POST") {
    const { fields, fileBuffer, filename, mimetype } = await parseBody(req);
    const { name, title } = fields;

    if (!name || !title) {
      return res.status(400).json({ error: "Name and title are required" });
    }

    let imageUrl = "";

    if (fileBuffer && filename) {
      const blob = await put(`republic/avatars/${Date.now()}-${filename}`, fileBuffer, {
        access: "public",
        contentType: mimetype || "image/jpeg",
        addRandomSuffix: false,
      });
      imageUrl = blob.url;
    }

    const devs = await getDevs();
    devs.push({
      id: Date.now().toString(),
      name,
      title,
      image: imageUrl,
      addedAt: new Date().toISOString(),
    });

    await saveDevs(devs);
    return res.status(200).json({ success: true });
  }

  if (req.method === "DELETE") {
    const { fields } = await parseBody(req);
    const { id } = fields;
    if (!id) return res.status(400).json({ error: "Missing id" });

    let devs = await getDevs();
    devs = devs.filter((d) => d.id !== id);
    await saveDevs(devs);
    return res.status(200).json({ success: true });
  }

  return res.status(405).end();
}
