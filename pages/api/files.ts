import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    if (!process.env.BLOB_STORE_HOSTNAME) {
      return res.status(200).json([]);
    }

    const response = await fetch(
      `https://${process.env.BLOB_STORE_HOSTNAME}/republic/index.json`,
      { next: { revalidate: 0 } } as RequestInit
    );

    if (!response.ok) {
      return res.status(200).json([]);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch {
    return res.status(200).json([]);
  }
}
