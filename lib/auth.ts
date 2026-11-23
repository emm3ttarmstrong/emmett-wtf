// The owner's session. The cookie holds a hash of the password, so changing WTF_PASSWORD signs everyone out.
export const SESSION_COOKIE = "wtf_session";

// Outside production, or with WTF_OPEN=1 (the thumbnail script), everything is open.
export function isOpen() {
  return process.env.NODE_ENV !== "production" || process.env.WTF_OPEN === "1";
}

export async function sessionToken(password: string) {
  const data = new TextEncoder().encode(`emmett.wtf:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// With no password configured in production, nobody is the owner and private prototypes stay closed.
export async function isOwner(cookie: string | undefined) {
  if (isOpen()) return true;
  const password = process.env.WTF_PASSWORD;
  if (!password || !cookie) return false;
  return cookie === (await sessionToken(password));
}
