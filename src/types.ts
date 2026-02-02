import type { R2Bucket } from "@cloudflare/workers-types";

export interface Env {
  BUCKET: R2Bucket;
  USERNAME: string;
  PASSWORD: string;
}

export const DAV_CLASS = "1, 2, 3";
export const SUPPORT_METHODS = [
  "OPTIONS",
  "PROPFIND",
  "PROPPATCH",
  "MKCOL",
  "GET",
  "HEAD",
  "PUT",
  "DELETE",
  "COPY",
  "MOVE",
] as const;
