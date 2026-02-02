import { SUPPORT_METHODS } from "../types";
import { handleOptions } from "./options";
import { handleGet, handleHead } from "./get";
import { handlePut } from "./put";
import { handleDelete } from "./delete";
import { handleMkcol } from "./mkcol";
import { handlePropfind } from "./propfind";
import { handleProppatch } from "./proppatch";
import { handleCopy } from "./copy";
import { handleMove } from "./move";
import { handleLock, handleUnlock } from "./lock";
import type { R2Bucket } from "@cloudflare/workers-types";
import { Effect } from "effect";

type SupportedMethod = (typeof SUPPORT_METHODS)[number] | "LOCK" | "UNLOCK";
type Handler = (
  request: Request,
  bucket: R2Bucket
) => Effect.Effect<Response, Error>;

// Handler map with exhaustive type checking
export const handlers: Record<SupportedMethod, Handler> = {
  OPTIONS: () => handleOptions(),
  HEAD: (req, bucket) => handleHead(req, bucket),
  GET: (req, bucket) => handleGet(req, bucket),
  PUT: (req, bucket) => handlePut(req, bucket),
  DELETE: (req, bucket) => handleDelete(req, bucket),
  MKCOL: (req, bucket) => handleMkcol(req, bucket),
  PROPFIND: (req, bucket) => handlePropfind(req, bucket),
  PROPPATCH: (req, bucket) => handleProppatch(req, bucket),
  COPY: (req, bucket) => handleCopy(req, bucket),
  MOVE: (req, bucket) => handleMove(req, bucket),
  LOCK: (req) => handleLock(req),
  UNLOCK: () => handleUnlock(),
};
