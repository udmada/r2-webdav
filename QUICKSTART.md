# Quick Start Guide

## Prerequisites

- Node.js 18+
- pnpm 9+ (recommended) or npm
- Cloudflare account with Workers enabled
- R2 bucket created in your Cloudflare account

## Setup (5 minutes)

### 1. Install Dependencies

Using pnpm (recommended):

```bash
pnpm install
```

Or using npm:

```bash
npm install
```

### 2. Configure R2 Bucket

Edit `wrangler.toml`:

```toml
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "your-bucket-name"  # ← Change this
```

### 3. Set Authentication

```bash
wrangler secret put USERNAME
# Enter your username when prompted

wrangler secret put PASSWORD
# Enter your password when prompted
```

### 4. Local Development

Create `.dev.vars` for local testing:

```bash
echo "USERNAME=testuser" >> .dev.vars
echo "PASSWORD=testpass" >> .dev.vars
```

Start dev server:

```bash
pnpm dev
# or: npm run dev
```

Visit http://localhost:8787/ in your browser.

### 5. Deploy to Production

```bash
pnpm deploy
# or: npm run deploy
```

Copy your worker URL from the output (e.g., `https://r2-webdav.your-subdomain.workers.dev`)

## Connect WebDAV Clients

### macOS Finder

1. Open Finder
2. Press `Cmd+K` (or Go → Connect to Server)
3. Enter: `https://r2-webdav.your-subdomain.workers.dev/`
4. Click "Connect"
5. Enter your USERNAME and PASSWORD

### Windows Explorer

1. Right-click "This PC"
2. Select "Map network drive"
3. Choose a drive letter
4. Enter: `https://r2-webdav.your-subdomain.workers.dev/`
5. Check "Connect using different credentials"
6. Enter your USERNAME and PASSWORD

### Cyberduck

1. Click "Open Connection"
2. Select "WebDAV (HTTP/S)" from dropdown
3. Server: `r2-webdav.your-subdomain.workers.dev`
4. Port: `443`
5. Username: your USERNAME
6. Password: your PASSWORD
7. Click "Connect"

### Command Line (cadaver)

```bash
cadaver https://r2-webdav.your-subdomain.workers.dev/
# Enter username and password when prompted

# Try some commands:
ls                    # List files
put local.txt         # Upload file
get remote.txt        # Download file
mkcol myfolder        # Create folder
cd myfolder           # Change directory
```

## Verify Installation

### Test with curl

```bash
# Test authentication
curl -u username:password https://r2-webdav.your-subdomain.workers.dev/

# Test OPTIONS (WebDAV capabilities)
curl -X OPTIONS -i https://r2-webdav.your-subdomain.workers.dev/

# Should see DAV header:
# DAV: 1, 2, 3
```

### Test with litmus

```bash
# Install litmus
brew install litmus  # macOS
# or
apt-get install litmus  # Linux

# Run tests
litmus https://r2-webdav.your-subdomain.workers.dev/ username password
```

## Common Issues

### "Unauthorized" Error

- Check USERNAME and PASSWORD secrets are set
- Verify credentials in your client
- Try resetting secrets: `wrangler secret put USERNAME`

### "Not Found" Error

- Verify R2 bucket exists
- Check bucket name in `wrangler.toml`
- Ensure binding is "BUCKET" (uppercase)

### "Method Not Allowed" on MKCOL

- Some clients send Content-Length > 0
- This is expected behavior per RFC 4918
- Should work with standard clients

### Connection Timeout

- Check worker is deployed: `wrangler deployments list`
- Verify worker URL is correct
- Check Cloudflare dashboard for errors

## Next Steps

- Read [README.md](./README.md) for full documentation
- Check [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) for architecture details
- Review [CHANGELOG.md](./CHANGELOG.md) for version history

## Development Workflow

### Make Changes

1. Edit files in `src/`
2. Test locally: `npm run dev`
3. Deploy: `npm run deploy`

### Debug

Check logs:

```bash
wrangler tail
```

Or in Cloudflare dashboard:

- Workers & Pages → Your Worker → Logs

### Format Code

```bash
npm run format
```

Check formatting:

```bash
npm run format:check
```

## Support

For issues or questions:

1. Check existing GitHub issues
2. Review implementation notes
3. Test with litmus for WebDAV compliance
4. Check Cloudflare Workers documentation
