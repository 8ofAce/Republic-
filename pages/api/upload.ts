import type { NextApiRequest, NextApiResponse } from "next";
import { put } from "@vercel/blob";
import { verifyToken } from "../../lib/auth";
import formidable, { File } from "formidable";
import fs from "fs";

export const config = {
  api: { bodyParser: false },
};

function getToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
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

  const form = formidable({ maxFileSize: 50 * 1024 * 1024 }); // 50MB

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ error: "Upload failed" });

    const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!name || !file) {
      return res.status(400).json({ error: "Missing name or file" });
    }

    try {
      const fileBuffer = fs.readFileSync((file as File).filepath);
      const filename = (file as File).originalFilename || "upload";

      const blob = await put(`republic/${Date.now()}-${filename}`, fileBuffer, {
        access: "public",
        contentType: (file as File).mimetype || "application/octet-stream",
      });

      // Store metadata in Vercel Blob as a JSON index file
      // We fetch existing index, append, and re-upload
      let index: { id: string; name: string; url: string; filename: string; uploadedAt: string; uploadedBy: string }[] = [];

      try {
        const indexBlob = await fetch(
          `https://${process.env.BLOB_STORE_HOSTNAME}/republic/index.json`
        );
        if (indexBlob.ok) {
          index = await indexBlob.json();
        }
      } catch {
        // index doesn't exist yet
      }

      index.push({
        id: Date.now().toString(),
        name: name as string,
        url: blob.url,
        filename,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user.username,
      });

      await put("republic/index.json", JSON.stringify(index), {
        access: "public",
        contentType: "application/json",
        allowOverwrite: true,
      });

      return res.status(200).json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: "Storage error" });
    }
  });
}
