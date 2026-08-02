# shareflare-nano

Tiny public file sharing on one Cloudflare Worker and one R2 bucket.

```sh
pnpm install
pnpm wrangler login
pnpm wrangler secret put UPLOAD_TOKEN
pnpm deploy
```

Wrangler creates the configured R2 bucket if needed. Add your upload subdomain as a
[Worker custom domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/),
then upload the raw file body:

```sh
curl --data-binary @photo.jpg \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: image/jpeg' \
  https://files.example.com/
```

The response is the public, random 10-character download URL.
