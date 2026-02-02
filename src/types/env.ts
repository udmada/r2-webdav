export interface Env {
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  bucket: R2Bucket;

  // Variables defined in the "Environment Variables" section of the Wrangler CLI or dashboard
  USERNAME: string;
  PASSWORD: string;
}

export interface WebDAVContext {
  bucket: R2Bucket;
  request: Request;
  url: URL;
  path: string;
}