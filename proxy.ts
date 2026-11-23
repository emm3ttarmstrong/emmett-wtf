import { NextResponse, type NextRequest } from "next/server";
import { isOwner, SESSION_COOKIE } from "@/lib/auth";
import { findPrototype } from "@/lib/entries";

// Private prototypes answer 404 to everyone but the owner, so their names don't leak through a login redirect.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const owner = await isOwner(request.cookies.get(SESSION_COOKIE)?.value);
  const notFound = () => NextResponse.rewrite(new URL("/not-found", request.url), { status: 404 });

  if (pathname === "/") {
    return owner ? NextResponse.rewrite(new URL("/all", request.url)) : NextResponse.next();
  }
  if (pathname === "/all") return notFound();

  const slug = pathname.match(/^\/(?:api\/)?p\/([^/]+)/)?.[1];
  if (!slug) return NextResponse.next();
  const prototype = findPrototype(slug);
  if (!prototype || !(prototype.public || owner)) return notFound();
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/all", "/p/:path*", "/api/p/:path*"],
};
