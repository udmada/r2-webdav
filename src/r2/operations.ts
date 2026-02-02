import { Effect, Stream, Chunk, Option } from "effect";
import type {
  R2Object,
  R2ObjectBody,
  R2Bucket,
  R2HTTPMetadata,
  R2Conditional,
} from "@cloudflare/workers-types";
import { chunkArray } from "../utils/batch";

const R2_DELETE_BATCH_SIZE = 1000;
const MAX_LIST_PAGES = 10; // Maximum number of paginated list() calls to prevent rate limiting

export const isR2ObjectBody = (
  obj: R2Object | R2ObjectBody | null
): obj is R2ObjectBody => obj !== null && "body" in obj;

export const listAll = (
  bucket: R2Bucket,
  prefix: string,
  isRecursive = false
): Stream.Stream<R2Object, Error> => {
  let pageCount = 0;

  return Stream.unfoldChunkEffect(undefined as string | undefined, (cursor) => {
    // Stop if we've exceeded the maximum number of pages
    if (pageCount >= MAX_LIST_PAGES) {
      return Effect.succeed(Option.none());
    }

    pageCount++;

    return Effect.tryPromise({
      try: () =>
        bucket.list({
          prefix,
          delimiter: isRecursive ? undefined : "/",
          cursor,
        }),
      catch: (error) => new Error(`Failed to list objects: ${String(error)}`),
    }).pipe(
      Effect.map((result) =>
        result.objects.length === 0 && !result.truncated ?
          Option.none()
        : Option.some([
            Chunk.fromIterable(result.objects),
            result.truncated ? result.cursor : undefined,
          ] as const)
      )
    );
  });
};

export const headObject = (
  bucket: R2Bucket,
  key: string
): Effect.Effect<R2Object | null, Error> =>
  Effect.tryPromise({
    try: () => bucket.head(key),
    catch: (error) => new Error(`Failed to head object: ${String(error)}`),
  });

export const getObject = (
  bucket: R2Bucket,
  key: string,
  options?: { onlyIf?: Headers; range?: Headers }
): Effect.Effect<R2Object | R2ObjectBody | null, Error> =>
  Effect.tryPromise({
    try: () => bucket.get(key, options),
    catch: (error) => new Error(`Failed to get object: ${String(error)}`),
  });

export const putObject = (
  bucket: R2Bucket,
  key: string,
  body: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,
  options?: {
    httpMetadata?: Headers | R2HTTPMetadata;
    customMetadata?: Record<string, string>;
    onlyIf?: Headers | R2Conditional;
  }
): Effect.Effect<R2Object, Error> =>
  Effect.tryPromise({
    try: () => bucket.put(key, body, options),
    catch: (error) => new Error(`Failed to put object: ${String(error)}`),
  });

export const deleteObject = (
  bucket: R2Bucket,
  keys: string | string[]
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const keyArray = Array.isArray(keys) ? keys : [keys];

    if (keyArray.length === 0) return;

    const batches = chunkArray(keyArray, R2_DELETE_BATCH_SIZE);

    yield* Effect.all(
      batches.map((batch) =>
        Effect.tryPromise({
          try: async () => {
            await bucket.delete(batch);
          },
          catch: (error) =>
            new Error(`Failed to delete objects: ${String(error)}`),
        })
      ),
      { concurrency: 5 }
    );
  });
