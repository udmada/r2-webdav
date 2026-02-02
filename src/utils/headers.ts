/**
 * Sanitizes conditional headers (If-None-Match, If-Match) to work with R2's strict ETag parsing.
 * R2 expects ETags in the exact format: "abc123" or W/"abc123"
 * Some clients send improperly formatted ETags like ""abc123"" or "W/"abc123""
 */
export const sanitizeConditionalHeaders = (
  headers: Headers
): Record<string, string> => {
  const sanitized: Record<string, string> = {};

  for (const [key, value] of headers.entries()) {
    const lowerKey = key.toLowerCase();

    if (lowerKey === "if-none-match" || lowerKey === "if-match") {
      // Parse and clean ETags
      const etags = value
        .split(",")
        .map((etag) => {
          let cleaned = etag.trim();

          // Remove double-quoting: ""abc"" -> "abc"
          if (cleaned.startsWith('""') && cleaned.endsWith('""')) {
            cleaned = cleaned.slice(1, -1);
          }

          // Fix malformed weak validators: "W/"abc"" -> W/"abc"
          if (cleaned.startsWith('"W/') && cleaned.endsWith('"')) {
            cleaned = "W/" + cleaned.slice(3, -1);
            if (!cleaned.endsWith('"')) {
              cleaned = cleaned + '"';
            }
          }

          // Ensure strong ETags are properly quoted
          if (
            !cleaned.startsWith("W/") &&
            !cleaned.startsWith('"') &&
            cleaned.length > 0
          ) {
            cleaned = `"${cleaned}"`;
          }

          return cleaned;
        })
        .filter((etag) => etag.length > 0)
        .join(", ");

      if (etags) {
        sanitized[lowerKey] = etags;
      }
    } else if (
      lowerKey === "if-modified-since" ||
      lowerKey === "if-unmodified-since" ||
      lowerKey === "range"
    ) {
      sanitized[lowerKey] = value;
    }
  }

  return sanitized;
};

/**
 * Validates if an ETag is properly formatted for R2.
 * Valid formats: "abc123" or W/"abc123"
 */
export const isValidETag = (etag: string): boolean => {
  const trimmed = etag.trim();
  const strongETagPattern = /^"[^"]*"$/;
  const weakETagPattern = /^W\/"[^"]*"$/;
  return strongETagPattern.test(trimmed) || weakETagPattern.test(trimmed);
};
