import type { NextApiRequest, NextApiResponse } from "next";
import { list } from "@vercel/blob";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    const { blobs } = await list({ prefix: "republic/index.json" });
    
    if (!blobs || blobs.length === 0) {
      return res.status(200).json([]);
    }

    const indexBlob = blobs[0];
    const response = await fetch(indexBlob.url);
    
    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (e) {
    console.error(e);
    return res.status(200).json([]);
  }
}
