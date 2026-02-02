import { Effect, Stream } from "effect";
import type { R2Bucket, R2Object } from "@cloudflare/workers-types";
import { headObject, listAll } from "../r2/operations";
import { makeResourcePath } from "../utils/path";
import { escapeXml } from "../utils/xml";

const MAX_PROPFIND_ITEMS = 1000;

interface DavProperties {
  creationdate: string | undefined;
  displayname: string | undefined;
  getcontentlanguage: string | undefined;
  getcontentlength: string | undefined;
  getcontenttype: string | undefined;
  getetag: string | undefined;
  getlastmodified: string | undefined;
  resourcetype: string;
}

const fromR2Object = (object: R2Object | null): DavProperties => {
  if (object === null) {
    return {
      creationdate: new Date().toUTCString(),
      displayname: undefined,
      getcontentlanguage: undefined,
      getcontentlength: "0",
      getcontenttype: undefined,
      getetag: undefined,
      getlastmodified: new Date().toUTCString(),
      resourcetype: "<collection />",
    };
  }

  return {
    creationdate: object.uploaded.toUTCString(),
    displayname: object.httpMetadata?.contentDisposition,
    getcontentlanguage: object.httpMetadata?.contentLanguage,
    getcontentlength: String(object.size || 0),
    getcontenttype: object.httpMetadata?.contentType,
    getetag: object.etag,
    getlastmodified: object.uploaded.toUTCString(),
    resourcetype: object.customMetadata?.resourcetype ?? "",
  };
};

const generatePropfindResponse = (object: R2Object | null): string => {
  if (object === null) {
    return `
	<response>
		<href>/</href>
		<propstat>
			<prop>
			${Object.entries(fromR2Object(null))
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `<${key}>${escapeXml(String(value))}</${key}>`)
        .join("\n\t\t\t")}
			</prop>
			<status>HTTP/1.1 200 OK</status>
		</propstat>
	</response>`;
  }

  const href = `/${object.key}${object.customMetadata?.resourcetype === "<collection />" ? "/" : ""}`;
  return `
	<response>
		<href>${escapeXml(href)}</href>
		<propstat>
			<prop>
			${Object.entries(fromR2Object(object))
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => `<${key}>${escapeXml(String(value))}</${key}>`)
        .join("\n\t\t\t")}
			</prop>
			<status>HTTP/1.1 200 OK</status>
		</propstat>
	</response>`;
};

export const handlePropfind = (
  request: Request,
  bucket: R2Bucket
): Effect.Effect<Response, Error> =>
  Effect.gen(function* () {
    const resourcePath = makeResourcePath(request);

    let isCollection: boolean;
    let page = `<?xml version="1.0" encoding="utf-8"?>
<multistatus xmlns="DAV:">`;

    if (resourcePath === "") {
      page += generatePropfindResponse(null);
      isCollection = true;
    } else {
      const object = yield* headObject(bucket, resourcePath);
      if (object === null) {
        return new Response("Not Found", { status: 404 });
      }
      isCollection = object.customMetadata?.resourcetype === "<collection />";
      page += generatePropfindResponse(object);
    }

    if (isCollection) {
      const depth = request.headers.get("Depth") ?? "infinity";
      const prefix = resourcePath === "" ? resourcePath : `${resourcePath}/`;

      let count = 0;
      const limited = Stream.takeWhile(
        listAll(bucket, prefix, depth === "infinity"),
        () => {
          if (count >= MAX_PROPFIND_ITEMS) {
            return false;
          }
          count++;
          return true;
        }
      );

      switch (depth) {
        case "0":
          break;
        case "1":
        case "infinity":
          yield* Stream.runForEach(limited, (object) =>
            Effect.sync(() => {
              page += generatePropfindResponse(object);
            })
          );
          break;
        default:
          return new Response("Forbidden", { status: 403 });
      }
    }

    page += "\n</multistatus>\n";

    return new Response(page, {
      status: 207,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
      },
    });
  });
