import axios from "axios";

let clientId = null;

export async function getClientId() {
  if (clientId) return clientId;

  const page = await axios.get("https://soundcloud.com");
  const scripts = [
    ...page.data.matchAll(
      /src="(https:\/\/a-v2\.sndcdn\.com\/assets\/.*?\.js)"/g
    )
  ];

  for (const s of scripts) {
    const js = await axios.get(s[1]);
    const match = js.data.match(/client_id:"([a-zA-Z0-9]+)"/);

    if (match) {
      clientId = match[1];
      return clientId;
    }
  }

  throw new Error("client_id not found");
}

export function getCachedClientId() {
  return clientId;
}
