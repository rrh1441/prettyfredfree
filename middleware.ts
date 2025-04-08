/* FILE: middleware.ts */
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
    // 1) Force all traffic to www.prettyfred.com (Optional)
    const host = request.headers.get("host") || "";
    // Redirect only if it's the bare domain to avoid infinite loops if www is already there
    if (host === "prettyfred.com") {
        const url = new URL(request.url);
        url.hostname = "www.prettyfred.com";
        console.log(`Redirecting ${request.url} to ${url.toString()}`);
        // Use 301 for permanent redirect for SEO benefits
        return NextResponse.redirect(url, 301);
    }

    // Pass through the request without any Supabase auth processing
    const response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    return response;
}

export const config = {
    matcher: [
        // Match all paths except static files, images, favicon, etc.
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};