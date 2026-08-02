# cloudshare-nano

Tiny public file sharing on one Cloudflare Worker and one R2 bucket.

```sh
npm install
npx wrangler login
npm run deploy
```

Wrangler creates the configured R2 bucket if needed. Add your upload subdomain as a
[Worker custom domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/),
then upload the raw file body:

```sh
curl --data-binary @photo.jpg -H 'Content-Type: image/jpeg' https://files.example.com/
```

The response is the public, random 10-character download URL.
