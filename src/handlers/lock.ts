import { Effect } from "effect";
import { escapeXml } from "../utils/xml";

const generateLockToken = (): string =>
  `opaquelocktoken:${crypto.randomUUID()}`;

export const handleLock = (request: Request): Effect.Effect<Response> =>
  Effect.sync(() => {
    const lockToken = generateLockToken();
    const path = new URL(request.url).pathname;

    const lockResponse = `<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:">
  <D:lockdiscovery>
    <D:activelock>
      <D:locktype><D:write/></D:locktype>
      <D:lockscope><D:exclusive/></D:lockscope>
      <D:depth>0</D:depth>
      <D:owner>
        <D:href>${escapeXml(path)}</D:href>
      </D:owner>
      <D:timeout>Second-3600</D:timeout>
      <D:locktoken>
        <D:href>${lockToken}</D:href>
      </D:locktoken>
      <D:lockroot>
        <D:href>${escapeXml(path)}</D:href>
      </D:lockroot>
    </D:activelock>
  </D:lockdiscovery>
</D:prop>`;

    return new Response(lockResponse, {
      status: 200,
      headers: {
        "Content-Type": 'application/xml; charset="utf-8',
        "Lock-Token": `<${lockToken}>`,
      },
    });
  });

export const handleUnlock = (): Effect.Effect<Response> =>
  Effect.succeed(new Response(null, { status: 204 }));
