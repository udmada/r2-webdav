# Implementation Notes

## Project Overview

This is a production-ready WebDAV server implementation for Cloudflare Workers + R2, refactored with Effect-TS for enhanced reliability, security, and maintainability.

## Acceptable Criteria

- Same functionality as the [original script](https://raw.githubusercontent.com/abersheeran/r2-webdav/refs/heads/main/src/index.ts)
- Full TypeScript type safety with Cloudflare Workers types
- Functional-programming over Class-based programming
- Complete WebDAV method support (OPTIONS, PROPFIND, GET, PUT, DELETE, MKCOL, MOVE, COPY)
- Basic authentication
- Modern ES2024+ syntax
- Proper error handling
- R2 bucket integration
- Uses `pnpm`
- type casting using any shall be eliminated in this project
- ESlint shall not allow it to happen
- Bonus point if you can intergrate Effect into this project for maybe pattern maching and error handling

## Key Architectural Decisions

### Effect-TS Integration

**Why Effect-TS?**

1. **Type-safe error handling**: All errors are tracked at the type level
2. **Composable operations**: Easy to chain and compose async operations
3. **Stream processing**: Memory-efficient handling of large datasets
4. **Controlled concurrency**: Built-in support for concurrent operations with limits

**Usage Patterns:**

```typescript
// Basic effect
Effect.sync(() => {
	/* sync code */
});

// Async effect
Effect.tryPromise({
	try: () => asyncOperation(),
	catch: (error) => new Error(String(error)),
});

// Stream processing
Stream.unfoldChunkEffect(cursor, fetchNextPage);
```

### Directory Structure

```
src/
├── index.ts              # Entry point, routing, CORS
├── types.ts              # Shared types
├── auth.ts               # Authentication
├── utils/                # Utility functions
│   ├── path.ts          # Path validation
│   ├── xml.ts           # XML processing
│   └── batch.ts         # Array chunking
├── r2/                   # R2 operations layer
│   └── operations.ts
└── handlers/             # WebDAV method handlers
    ├── options.ts
    ├── get.ts
    ├── put.ts
    ├── delete.ts
    ├── mkcol.ts
    ├── propfind.ts
    ├── proppatch.ts
    ├── copy.ts
    ├── move.ts
    └── lock.ts
```

**Benefits:**

- Clear separation of concerns
- Easy to test individual components
- Scalable for future enhancements
- Easy to understand and maintain

### Security Improvements

#### 1. Path Traversal Protection

```typescript
// Segment-based normalization
const segments = path.split("/").filter(Boolean);
const normalized: string[] = [];

for (const segment of segments) {
	if (segment === "..") {
		normalized.pop();
	} else if (segment !== ".") {
		normalized.push(segment);
	}
}
```

**Why this approach?**

- Handles `..` and `.` correctly
- Prevents escaping the root directory
- Validates against null bytes
- Works with URL-encoded paths

#### 2. Timing-Safe Authentication

```typescript
crypto.subtle.timingSafeEqual(header, expected);
```

**Why this matters?**

- Prevents timing attacks
- Constant-time comparison
- No information leakage

#### 3. XML Injection Protection

```typescript
export const escapeXml = (str: string): string =>
	str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
```

**Critical for:**

- Preventing XSS in directory listings
- Protecting WebDAV responses
- Ensuring XML validity

### R2 API Handling

#### Return Type Complexity

R2's `get()` method can return:

1. `null` - Object doesn't exist
2. `R2Object` - Conditional request not met (no body)
3. `R2ObjectBody` - Success with body

**Implementation:**

```typescript
export const isR2ObjectBody = (
	obj: R2Object | R2ObjectBody | null
): obj is R2ObjectBody => obj !== null && "body" in obj;

// Usage
if (object === null) {
	return new Response("Not Found", { status: 404 });
}

if (!isR2ObjectBody(object)) {
	// Handle 304 or 412
	const ifNoneMatch = request.headers.get("If-None-Match");
	if (ifNoneMatch && ifNoneMatch === object.etag) {
		return new Response(null, { status: 304, headers: { ETag: object.etag } });
	}
	return new Response("Precondition Failed", { status: 412 });
}

// Now we have R2ObjectBody with body stream
return new Response(object.body, { status: 200, headers });
```

#### Batch Delete Limits

R2 has a 1000-key limit per delete operation:

```typescript
const R2_DELETE_BATCH_SIZE = 1000;

const batches = chunkArray(keyArray, R2_DELETE_BATCH_SIZE);

yield *
	Effect.all(
		batches.map((batch) =>
			Effect.tryPromise({
				try: async () => {
					await bucket.delete(batch);
				},
				catch: (error) => new Error(`Failed to delete: ${String(error)}`),
			})
		),
		{ concurrency: 5 }
	);
```

**Benefits:**

- Respects R2 API limits
- Concurrent processing (5 batches at a time)
- Proper error handling per batch

### Stream Processing

**Why Streams?**

- Memory efficient for large directories
- Can handle millions of objects
- Early termination on limits

**Example:**

```typescript
Stream.runForEach(listAll(bucket, prefix, false), (object) =>
	Effect.sync(() => {
		if (count >= MAX_LISTING_ITEMS) {
			throw new Error("Directory listing limit exceeded");
		}
		// Process object
	})
);
```

### XML Processing Improvements

#### CDATA Handling

```typescript
// Remove CDATA sections before parsing
const cleanXml = xml.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");
```

#### Namespace Support

```typescript
const propRegex = /<(?:(\w+):)?(\w+)(?:\s[^>]*)?>([^<]*)<\/(?:\1:)?\2>/g;

// Handles both:
// <displayname>value</displayname>
// <D:displayname>value</D:displayname>
```

### Performance Optimizations

1. **Lazy Evaluation**: Effect-TS delays execution until `runPromise`
2. **Streaming**: Large operations don't load into memory
3. **Concurrent Batching**: Multiple batch operations run in parallel
4. **Early Termination**: Directory listings stop at 10,000 items

### Testing Recommendations

#### Unit Tests

- Path normalization edge cases
- XML parsing with various inputs
- Batch chunking logic
- Error handling paths

#### Integration Tests

- Full WebDAV operation sequences
- Large file uploads/downloads
- Directory operations
- Range requests

#### Client Tests

Use these clients for real-world testing:

- macOS Finder
- Windows Explorer
- Cyberduck
- Transmit
- cadaver CLI
- litmus test suite

### Known Limitations

1. **LOCK/UNLOCK**: Dummy implementation (no actual locking)
   - Returns valid responses
   - Satisfies client requirements
   - No state persistence

2. **Directory Listing**: 10,000 item limit
   - Prevents DoS
   - May truncate very large directories
   - Consider pagination for production

3. **Concurrent Modifications**: No transaction support
   - R2 doesn't support transactions
   - Race conditions possible
   - Acceptable for most use cases

### Future Enhancements

1. **Caching Layer**: Add CloudFlare KV for metadata caching
2. **Pagination**: Implement for large directories
3. **Real Locking**: Use Durable Objects for distributed locks
4. **Compression**: Support for gzip/brotli
5. **Versioning**: Track file versions in R2
6. **Search**: Full-text search with Workers AI
7. **Thumbnails**: Generate thumbnails for images
8. **Quota Management**: Per-user storage limits

### Deployment Checklist

- [ ] Install dependencies: `npm install`
- [ ] Update `wrangler.toml` with your R2 bucket name
- [ ] Set secrets: `wrangler secret put USERNAME` and `PASSWORD`
- [ ] Test locally: `npm run dev`
- [ ] Deploy: `npm run deploy`
- [ ] Test with WebDAV client
- [ ] Monitor logs in Cloudflare dashboard
- [ ] Set up alerts for errors

### Troubleshooting

**TypeScript errors:**

- Ensure Effect version is ^3.10.0
- Check @cloudflare/workers-types is latest
- Verify tsconfig.json settings

**R2 errors:**

- Check bucket name in wrangler.toml
- Verify R2 binding is "BUCKET"
- Ensure bucket exists in your account

**Authentication failures:**

- Verify secrets are set correctly
- Check Authorization header format
- Test with curl first

**WebDAV client issues:**

- Try different clients to isolate issues
- Check CORS headers in response
- Verify DAV header is present
- Use browser dev tools to inspect requests
