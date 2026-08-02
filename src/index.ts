declare global {
  interface SubtleCrypto {
    timingSafeEqual(a: ArrayBuffer | ArrayBufferView, b: ArrayBuffer | ArrayBufferView): boolean;
  }
}

const token = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(8))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .slice(0, 10);

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/") {
      const authorization = request.headers.get("authorization");
      const encode = new TextEncoder();
      const [supplied, expected] = await Promise.all([
        crypto.subtle.digest("SHA-256", encode.encode(authorization?.slice(7) ?? "")),
        crypto.subtle.digest("SHA-256", encode.encode(env.UPLOAD_TOKEN)),
      ]);
      if (
        !authorization?.startsWith("Bearer ") ||
        !crypto.subtle.timingSafeEqual(supplied, expected)
      ) {
        return new Response("Unauthorized\n", { status: 401 });
      }

      const key = token();
      await env.FILES.put(key, request.body, {
        httpMetadata: {
          contentType: request.headers.get("content-type") ?? "application/octet-stream",
        },
      });
      return new Response(`${url.origin}/${key}\n`, {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }

    if (request.method === "GET" && /^\/[\w-]{10}$/.test(url.pathname)) {
      const object = await env.FILES.get(url.pathname.slice(1));
      if (!object) return new Response("Not found\n", { status: 404 });

      const headers = new Headers({ etag: object.httpEtag });
      object.writeHttpMetadata(headers);
      return new Response(object.body, { headers });
    }

    return new Response("Not found\n", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
