import assert from "node:assert/strict";
import test from "node:test";

import worker from "../src/index.ts";

test("POST / returns a public URL which serves the uploaded file", async () => {
  const files = new Map<string, { body: Uint8Array; type: string }>();
  const bucket = {
    async put(key: string, body: ReadableStream, options: { httpMetadata: { contentType: string } }) {
      files.set(key, {
        body: new Uint8Array(await new Response(body).arrayBuffer()),
        type: options.httpMetadata.contentType,
      });
    },
    async get(key: string) {
      const file = files.get(key);
      return file && {
        body: file.body,
        httpEtag: '"etag"',
        writeHttpMetadata(headers: Headers) {
          headers.set("content-type", file.type);
        },
      };
    },
  };

  const upload = await worker.fetch(
    new Request("https://files.example.com/", {
      method: "POST",
      body: "hello",
      headers: { "content-type": "text/plain" },
    }),
    { FILES: bucket } as Env,
  );
  const url = (await upload.text()).trim();

  assert.match(url, /^https:\/\/files\.example\.com\/[A-Za-z0-9_-]{10}$/);

  const download = await worker.fetch(new Request(url), { FILES: bucket } as Env);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-type"), "text/plain");
  assert.equal(await download.text(), "hello");
});
