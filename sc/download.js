import axios from "axios";
import { getCachedClientId } from "./clientId.js";

export async function streamTrack(trackUrl) {
  const clientId = getCachedClientId();

  const resolve = await axios.get("https://api-v2.soundcloud.com/resolve", {
    params: {
      url: trackUrl,
      client_id: clientId
    }
  });

  const track = resolve.data;

  const transcoding = track.media.transcodings.find(
    (t) => t.format.protocol === "progressive"
  );

  if (!transcoding) throw new Error("No progressive stream");

  const stream = await axios.get(transcoding.url, {
    params: { client_id: clientId }
  });

  const audio = await axios.get(stream.data.url, {
    responseType: "stream"
  });

  return audio.data;
}
