import { Effect, pipe } from "effect";
import type { R2Bucket } from "@cloudflare/workers-types";
import { SUPPORT_METHODS, DAV_CLASS, type Env } from "./types";
import { isAuthorized } from "./auth";
import { PathTraversalError } from "./utils/path";
import { handlers } from "./handlers";

const EXTENDED_METHODS = [...SUPPORT_METHODS, "LOCK", "UNLOCK"] as const;
type SupportedMethod = (typeof EXTENDED_METHODS)[number];

const isSupportedMethod = (method: string): method is SupportedMethod =>
  (EXTENDED_METHODS as readonly string[]).includes(method);

const dispatchHandler = (
  request: Request,
  bucket: R2Bucket
): Effect.Effect<Response, Error> =>
  isSupportedMethod(request.method) ?
    handlers[request.method](request, bucket)
  : Effect.succeed(
      new Response("Method Not Allowed", {
        status: 405,
        headers: {
          Allow: EXTENDED_METHODS.join(", "),
          DAV: DAV_CLASS,
        },
      })
    );

const setCorsHeaders = (response: Response, request: Request): Response => {
  const origin = request.headers.get("Origin") ?? "*";
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set(
    "Access-Control-Allow-Methods",
    EXTENDED_METHODS.join(", ")
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    [
      "authorization",
      "content-type",
      "depth",
      "overwrite",
      "destination",
      "range",
      "if",
      "lock-token",
    ].join(", ")
  );
  response.headers.set(
    "Access-Control-Expose-Headers",
    [
      "content-type",
      "content-length",
      "dav",
      "etag",
      "last-modified",
      "location",
      "date",
      "content-range",
      "lock-token",
    ].join(", ")
  );
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Max-Age", "86400");
  return response;
};
const handleRequest = (
  request: Request,
  bucket: R2Bucket,
  username: string,
  password: string
): Effect.Effect<Response, Error> =>
  pipe(
    request.method === "OPTIONS" ?
      Effect.succeed(true)
    : isAuthorized(request.headers.get("Authorization"), username, password),
    Effect.flatMap((authorized) =>
      authorized ?
        dispatchHandler(request, bucket)
      : Effect.succeed(
          new Response("Unauthorized", {
            status: 401,
            headers: { "WWW-Authenticate": 'Basic realm="webdav"' },
          })
        )
    ),
    Effect.map((response) => setCorsHeaders(response, request)),
    Effect.catchAll((error) =>
      Effect.succeed(
        error instanceof PathTraversalError ?
          new Response("Bad Request: Invalid path", { status: 400 })
        : (console.error("Unhandled error:", error),
          new Response("Internal Server Error", { status: 500 }))
      )
    )
  );

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return Effect.runPromise(
      handleRequest(request, env.BUCKET, env.USERNAME, env.PASSWORD)
    );
  },
};
