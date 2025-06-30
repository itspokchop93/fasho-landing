import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { url } = req.body as { url?: string };

  if (!url || typeof url !== "string") {
    return res.status(400).json({ success: false, message: "Invalid Spotify URL" });
  }

  try {
    const oEmbedRes = await fetch(
      `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
    );

    if (!oEmbedRes.ok) {
      throw new Error("Spotify oEmbed request failed");
    }

    const data = await oEmbedRes.json();

    // oEmbed returns title formatted as "Track – Artist"
    const [title, artist] = data.title.split(" – ");

    // Extract ID from URL (after last slash)
    const idMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);

    res.status(200).json({
      success: true,
      track: {
        id: idMatch ? idMatch[1] : url,
        title: title || data.title,
        artist: artist || "",
        imageUrl: data.thumbnail_url,
        url,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
} 