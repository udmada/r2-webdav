import { describe, it, expect } from "vitest";
import { makeResourcePath, isDirectory } from "./path";

describe("makeResourcePath", () => {
  it("should normalize basic paths", () => {
    const request = new Request("http://example.com/foo/bar");
    expect(makeResourcePath(request)).toBe("foo/bar");
  });

  it("should handle trailing slashes", () => {
    const request = new Request("http://example.com/foo/bar/");
    expect(makeResourcePath(request)).toBe("foo/bar");
  });

  it("should handle root path", () => {
    const request = new Request("http://example.com/");
    expect(makeResourcePath(request)).toBe("");
  });

  it("should resolve .. segments", () => {
    const request = new Request("http://example.com/foo/bar/../baz");
    expect(makeResourcePath(request)).toBe("foo/baz");
  });

  it("should handle multiple .. segments", () => {
    const request = new Request("http://example.com/foo/bar/baz/../../qux");
    expect(makeResourcePath(request)).toBe("foo/qux");
  });

  it("should handle . segments", () => {
    const request = new Request("http://example.com/foo/./bar");
    expect(makeResourcePath(request)).toBe("foo/bar");
  });

  it("should handle .. at the start", () => {
    const request = new Request("http://example.com/../foo");
    expect(makeResourcePath(request)).toBe("foo");
  });

  it("should handle multiple leading ..", () => {
    const request = new Request("http://example.com/../../foo");
    expect(makeResourcePath(request)).toBe("foo");
  });

  it("should handle URL-encoded null bytes", () => {
    // Note: URL constructor URL-encodes null bytes as %00
    // This test documents that behavior - null bytes in URLs are encoded by the browser/runtime
    const request = new Request("http://example.com/foo\0bar");
    // The null byte is URL-encoded as %00
    expect(makeResourcePath(request)).toBe("foo%00bar");
  });

  it("should handle URL-encoded hex null bytes", () => {
    // Same as above - URL constructor encodes hex null bytes as %00
    const request = new Request("http://example.com/foo\x00bar");
    expect(makeResourcePath(request)).toBe("foo%00bar");
  });

  it("should handle complex path traversal attempts", () => {
    const request = new Request("http://example.com/foo/../../../etc/passwd");
    expect(makeResourcePath(request)).toBe("etc/passwd");
  });

  it("should handle encoded paths", () => {
    const request = new Request("http://example.com/foo%2Fbar");
    expect(makeResourcePath(request)).toBe("foo%2Fbar");
  });
});

describe("isDirectory", () => {
  it("should return true for paths ending with /", () => {
    expect(isDirectory("foo/bar/")).toBe(true);
    expect(isDirectory("/")).toBe(true);
  });

  it("should return false for paths not ending with /", () => {
    expect(isDirectory("foo/bar")).toBe(false);
    expect(isDirectory("")).toBe(false);
  });
});
