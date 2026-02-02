import { describe, it, expect } from "vitest";
import { sanitizeConditionalHeaders, isValidETag } from "./headers";

describe("isValidETag", () => {
  it("should validate strong ETags", () => {
    expect(isValidETag('"abc123"')).toBe(true);
    expect(isValidETag('"0"')).toBe(true);
    expect(isValidETag('""')).toBe(true); // Empty ETag is technically valid
  });

  it("should validate weak ETags", () => {
    expect(isValidETag('W/"abc123"')).toBe(true);
    expect(isValidETag('W/"0"')).toBe(true);
  });

  it("should reject invalid ETags", () => {
    expect(isValidETag("abc123")).toBe(false); // Unquoted
    expect(isValidETag('""abc123""')).toBe(false); // Double quoted
    expect(isValidETag('"abc')).toBe(false); // Unclosed quote
    expect(isValidETag('abc"')).toBe(false); // Missing opening quote
    expect(isValidETag('"W/"abc123""')).toBe(false); // Malformed weak
  });
});

describe("sanitizeConditionalHeaders", () => {
  it("should pass through valid If-None-Match headers", () => {
    const headers = new Headers({
      "If-None-Match": '"abc123"',
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-none-match"]).toBe('"abc123"');
  });

  it("should fix double-quoted ETags", () => {
    const headers = new Headers({
      "If-None-Match": '""abc123""',
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-none-match"]).toBe('"abc123"');
  });

  it("should fix malformed weak ETags", () => {
    const headers = new Headers({
      "If-None-Match": '"W/"abc123""',
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-none-match"]).toBe('W/"abc123"');
  });

  it("should add quotes to unquoted ETags", () => {
    const headers = new Headers({
      "If-None-Match": "abc123",
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-none-match"]).toBe('"abc123"');
  });

  it("should handle multiple ETags", () => {
    const headers = new Headers({
      "If-None-Match": '"abc123", "def456"',
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-none-match"]).toBe('"abc123", "def456"');
  });

  it("should handle mixed valid and invalid ETags", () => {
    const headers = new Headers({
      "If-None-Match": '"abc123", ""def456"", xyz789',
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-none-match"]).toBe('"abc123", "def456", "xyz789"');
  });

  it("should pass through If-Modified-Since", () => {
    const headers = new Headers({
      "If-Modified-Since": "Wed, 21 Oct 2015 07:28:00 GMT",
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-modified-since"]).toBe("Wed, 21 Oct 2015 07:28:00 GMT");
  });

  it("should pass through Range headers", () => {
    const headers = new Headers({
      Range: "bytes=0-1023",
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["range"]).toBe("bytes=0-1023");
  });

  it("should handle If-Match headers", () => {
    const headers = new Headers({
      "If-Match": '""abc123""',
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-match"]).toBe('"abc123"');
  });

  it("should filter out non-conditional headers", () => {
    const headers = new Headers({
      "If-None-Match": '"abc123"',
      "Content-Type": "application/json",
      "Authorization": "Bearer token",
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-none-match"]).toBe('"abc123"');
    expect(result["Content-Type"]).toBeUndefined();
    expect(result["Authorization"]).toBeUndefined();
  });

  it("should handle empty headers", () => {
    const headers = new Headers();
    const result = sanitizeConditionalHeaders(headers);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("should handle case-insensitive header names", () => {
    const headers = new Headers({
      "if-none-match": '"abc123"',
      "IF-MODIFIED-SINCE": "Wed, 21 Oct 2015 07:28:00 GMT",
    });
    const result = sanitizeConditionalHeaders(headers);
    expect(result["if-none-match"]).toBe('"abc123"');
    expect(result["if-modified-since"]).toBe("Wed, 21 Oct 2015 07:28:00 GMT");
  });
});
