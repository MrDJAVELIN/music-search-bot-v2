import axios from "axios";
import { getCachedClientId } from "./clientId.js";

export async function searchTracks(query) {
  const clientId = getCachedClientId();

  const res = await axios.get("https://api-v2.soundcloud.com/search/tracks", {
    params: {
      q: query,
      client_id: clientId,
      limit: 10
    }
  });

  return res.data.collection.map((t) => ({
    title: t.title,
    author: t.user.username,
    url: t.permalink_url,
    id: t.id,
    duration: Math.floor(t.duration / 1000)
  }));
}
