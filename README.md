# R2 WebDAV

A production-ready WebDAV server implementation built on Cloudflare Workers and R2 storage, refactored with Effect-TS for robust error handling and functional programming patterns.

This is a refactored version of [r2-webdav](https://github.com/abersheeran/r2-webdav) with enhanced error handling, security improvements, and Effect-TS integration.

## Features

- ✅ Full WebDAV protocol support (RFC 4918)
- ✅ Path traversal protection with segment-based validation
- ✅ Proper R2 return type handling (R2Object | R2ObjectBody | null)
- ✅ Advanced XML parsing with CDATA/comment handling
- ✅ HTTP range request support (including suffix ranges)
- ✅ CORS support with credentials
- ✅ LOCK/UNLOCK support for Windows/macOS clients
- ✅ Directory listing limits (10,000 items) to prevent DoS
- ✅ Batch delete operations (1000-key chunks per R2 API limits)
- ✅ Memory-safe streaming throughout
- ✅ Effect-TS for type-safe error handling

## Project Structure

```
src/
├── index.ts                 # Main entry point with request routing
├── types.ts                 # TypeScript type definitions
├── auth.ts                  # Basic authentication handler
├── utils/
│   ├── path.ts             # Path normalization & validation
│   ├── xml.ts              # XML escaping & parsing utilities
│   └── batch.ts            # Array chunking for batch operations
├── r2/
│   └── operations.ts       # R2 bucket operations (list, get, put, delete)
└── handlers/
    ├── options.ts          # OPTIONS method handler
    ├── get.ts              # GET/HEAD method handlers
    ├── put.ts              # PUT method handler
    ├── delete.ts           # DELETE method handler
    ├── mkcol.ts            # MKCOL (create collection) handler
    ├── propfind.ts         # PROPFIND (get properties) handler
    ├── proppatch.ts        # PROPPATCH (set properties) handler
    ├── copy.ts             # COPY method handler
    ├── move.ts             # MOVE method handler
    └── lock.ts             # LOCK/UNLOCK method handlers
```

## Installation

1. Install dependencies (pnpm recommended):

```bash
pnpm install
# or: npm install
```

2. Configure environment variables in `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "webdav"
```

3. Set authentication credentials:

```bash
wrangler secret put USERNAME
wrangler secret put PASSWORD
```

4. Deploy to Cloudflare Workers:

```bash
pnpm deploy
# or: npm run deploy
```

## Development

Start local development server:

```bash
pnpm dev
# or: npm run dev
```

Type checking:

```bash
pnpm typecheck
```

Linting:

```bash
pnpm lint
pnpm lint:fix
```

Testing:

```bash
pnpm test         # Run tests in watch mode
pnpm test:run     # Run tests once
```

### Git Hooks (hk)

This project uses [hk](https://github.com/jdx/hk) for git hooks managed via pkl configuration:

```bash
# Install hk (if not already installed)
mise install hk

# Initialize hooks
hk init

# The following hooks are configured:
# - pre-commit: Runs format, lint, typecheck, and regenerates workflows from pkl
# - pre-push: Runs tests
```

### GitHub Actions Workflows

Workflows are defined using [pkl](https://pkl-lang.org/) in `.github/pkl-workflows/` and automatically generated to YAML:

```bash
# Regenerate workflow YAML files from pkl (done automatically by pre-commit hook)
pkl eval .github/pkl-workflows/*.pkl -o ".github/workflows/%{moduleName}.yml"
```

**Workflows:**

- `ci.yml` - Runs tests, linting, type checking on all PRs and pushes
- `deploy-cloudflare.yml` - Deploys to Cloudflare Workers on pushes to main

For local development, you can also set environment variables in `.dev.vars`:

```
USERNAME=your-username
PASSWORD=your-password
```

## Supported WebDAV Clients

This implementation has been tested with:

- macOS Finder (Connect to Server)
- Windows Explorer (Map Network Drive)
- Cyberduck
- Transmit
- `cadaver` CLI tool

## Security Features

### Path Traversal Protection

The server implements segment-based path normalization to prevent directory traversal attacks:

- Handles `..` and `.` segments correctly
- Validates against null bytes (`\0`, `\x00`)
- Normalizes all paths before processing

### Authentication

Basic HTTP authentication with timing-safe string comparison to prevent timing attacks.

### CORS Configuration

- Supports credentials for authenticated requests
- Configurable allowed origins
- Proper header exposure for WebDAV operations

## Implementation Details

### Effect-TS Integration

The codebase uses Effect-TS for:

- Type-safe error handling
- Functional composition of async operations
- Stream processing for large listings
- Batched operations with controlled concurrency

### R2 API Handling

- Proper handling of `R2Object` vs `R2ObjectBody` return types
- 304 Not Modified responses for conditional requests
- 412 Precondition Failed for unmet conditions
- Batch delete operations limited to 1000 keys per R2 API constraints

### XML Processing

- Escapes special characters (`&`, `<`, `>`, `"`, `'`)
- Handles CDATA sections and comments
- Namespace-aware property parsing
- Robust parsing for PROPPATCH operations

## API Limits

- **Directory listings**: Maximum 10,000 items per directory
- **Batch deletes**: Chunks of 1000 keys per operation
- **Concurrent deletes**: Up to 5 concurrent batch operations

## Environment Variables

| Variable   | Description                    | Required                          |
| ---------- | ------------------------------ | --------------------------------- |
| `USERNAME` | WebDAV authentication username | Yes                               |
| `PASSWORD` | WebDAV authentication password | Yes                               |
| `BUCKET`   | R2 bucket binding name         | Yes (configured in wrangler.toml) |

## Testing

### Unit Tests

The project uses Vitest 3.2.4 for unit testing with Cloudflare Workers integration. Tests are located alongside source files with `.test.ts` extension.

Run unit tests:

```bash
pnpm test         # Watch mode
pnpm test:run     # Single run (useful for CI)
```

**Important:** Vitest and related packages are pinned to version 3.2.4 for compatibility with `@cloudflare/vitest-pool-workers`. Do not upgrade to Vitest 4.x as it has breaking changes that are incompatible with the Cloudflare Workers pool.

Current test coverage includes:

- **Path utilities** (`src/utils/path.test.ts`): Path normalization, directory traversal protection, null byte validation
- **XML utilities** (`src/utils/xml.test.ts`): XML escaping, property parsing, CDATA/comment handling
- **Batch utilities** (`src/utils/batch.test.ts`): Array chunking for R2 batch operations

### WebDAV Compliance Testing with Litmus

[Litmus](https://github.com/notroj/litmus) is a comprehensive WebDAV server test suite. To test full WebDAV protocol compliance:

1. Install litmus:

```bash
# macOS
brew install litmus

# Ubuntu/Debian
sudo apt-get install litmus

# Build from source
git clone https://github.com/notroj/litmus.git
cd litmus
./configure && make && sudo make install
```

2. Start your WebDAV server:

```bash
pnpm dev  # Local development server
```

3. Run litmus tests:

```bash
litmus http://localhost:8787/ username password
```

Expected test suites:

- **basic**: OPTIONS, PUT, GET, HEAD, DELETE, MKCOL
- **copymove**: COPY, MOVE operations
- **props**: PROPFIND, PROPPATCH property handling
- **locks**: LOCK, UNLOCK support (with caveats - in-memory only)

Note: Some litmus tests may fail due to R2 storage constraints (e.g., atomic operations, lock persistence).

## License

MIT
