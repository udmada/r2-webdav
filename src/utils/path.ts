export class PathTraversalError extends Error {
  readonly _tag = "PathTraversalError";
  constructor(message: string) {
    super(message);
    this.name = "PathTraversalError";
  }
}

export const makeResourcePath = (request: Request): string => {
  const raw = new URL(request.url).pathname.slice(1);

  // Normalize path segments
  const segments = raw.split("/").filter(Boolean);
  const normalized: string[] = [];

  for (const segment of segments) {
    if (segment === "..") {
      normalized.pop();
    } else if (segment !== ".") {
      normalized.push(segment);
    }
  }

  const clean = normalized.join("/");

  // Additional validation
  if (clean.includes("\0") || clean.includes("\x00")) {
    throw new PathTraversalError("Invalid path: null bytes detected");
  }

  return clean;
};

export const isDirectory = (url: string): boolean => url.endsWith("/");
