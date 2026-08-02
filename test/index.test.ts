import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";
import test from "node:test";

import worker from "../src/index.ts";

Object.defineProperty(crypto.subtle, "timingSafeEqual", { value: timingSafeEqual });

test("authorized POST / returns a public URL which serves the uploaded file", async () => {
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

  const env = { FILES: bucket, UPLOAD_TOKEN: "secret" } as Env;
  const unauthorized = await worker.fetch(
    new Request("https://files.example.com/", { method: "POST", body: "nope" }),
    env,
  );
  assert.equal(unauthorized.status, 401);
  assert.equal(files.size, 0);

  const upload = await worker.fetch(
    new Request("https://files.example.com/", {
      method: "POST",
      body: "hello",
      headers: {
        authorization: "Bearer secret",
        "content-type": "text/plain",
      },
    }),
    env,
  );
  const url = (await upload.text()).trim();

  assert.match(url, /^https:\/\/files\.example\.com\/[A-Za-z0-9_-]{10}$/);

  const download = await worker.fetch(new Request(url), env);
  assert.equal(download.status, 200);
  assert.equal(download.headers.get("content-type"), "text/plain");
  assert.equal(await download.text(), "hello");
});
