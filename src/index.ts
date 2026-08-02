const token = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(8))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .slice(0, 10);

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/") {
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
