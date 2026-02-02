export interface Env {
  BUCKET: R2Bucket;
  USERNAME: string;
  PASSWORD: string;
}

export interface WebDAVContext {
  bucket: R2Bucket;
  request: Request;
  url: URL;
  path: string;
}

export const SUPPORT_METHODS = [
  "OPTIONS",
  "PROPFIND",
  "GET",
  "HEAD",
  "PUT",
  "DELETE",
  "MKCOL",
  "MOVE",
  "COPY",
] as const;

export const DAV_CLASS = "1, 2, 3, extended-mkcol";
