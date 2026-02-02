import { Effect, Stream } from "effect";
import type { R2Bucket } from "@cloudflare/workers-types";
import { getObject, listAll, isR2ObjectBody } from "../r2/operations";
import { makeResourcePath, isDirectory } from "../utils/path";
import { escapeXml } from "../utils/xml";

const MAX_LISTING_ITEMS = 10000;

const handleDirectoryListing = (
	_request: Request,
	bucket: R2Bucket,
	resourcePath: string
): Effect.Effect<Response, Error> =>
	Effect.gen(function* () {
		let page = "";
		let count = 0;
		const prefix = resourcePath === "" ? "" : `${resourcePath}/`;

		if (resourcePath !== "") {
			page += '<a href="../">..</a><br>';
		}

		yield* Stream.runForEach(listAll(bucket, prefix, false), (object) =>
			Effect.sync(() => {
				if (count >= MAX_LISTING_ITEMS) {
					throw new Error("Directory listing limit exceeded");
				}

				if (object.key === resourcePath) return;

				count++;
				const isCollection =
					object.customMetadata?.resourcetype === "<collection />";
				const href = `/${escapeXml(object.key)}${isCollection ? "/" : ""}`;
				const displayName =
					object.httpMetadata?.contentDisposition ??
					object.key.slice(prefix.length);
				page += `<a href="${href}">${escapeXml(displayName)}</a><br>`;
			})
		);

		const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>R2Storage</title><style>*{box-sizing:border-box;}body{padding:10px;font-family:'Segoe UI','Circular','Roboto','Lato','Helvetica Neue','Arial Rounded MT Bold','sans-serif';}a{display:inline-block;width:100%;color:#000;text-decoration:none;padding:5px 10px;cursor:pointer;border-radius:5px;}a:hover{background-color:#60C590;color:white;}a[href="../"]{background-color:#cbd5e1;}</style></head><body><h1>R2 Storage</h1><div>${page}</div></body></html>`;

		return new Response(html, {
			status: 200,
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});
	});

const handleFileDownload = (
	request: Request,
	bucket: R2Bucket,
	resourcePath: string
): Effect.Effect<Response, Error> =>
	Effect.gen(function* () {
		const object = yield* getObject(bucket, resourcePath, {
			onlyIf: request.headers,
			range: request.headers,
		});

		if (object === null) {
			return new Response("Not Found", { status: 404 });
		}

		// Handle conditional requests that return R2Object without body
		if (!isR2ObjectBody(object)) {
			// Object exists but conditions not met (304 Not Modified or 412 Precondition Failed)
			const ifNoneMatch = request.headers.get("If-None-Match");
			if (ifNoneMatch !== null && ifNoneMatch === object.etag) {
				return new Response(null, {
					status: 304,
					headers: { ETag: object.etag },
				});
			}
			return new Response("Precondition Failed", { status: 412 });
		}

		const headers: Record<string, string> = {
			"Content-Type":
				object.httpMetadata?.contentType ?? "application/octet-stream",
			"ETag": object.etag,
			"Last-Modified": object.uploaded.toUTCString(),
		};

		if (object.httpMetadata?.contentDisposition !== undefined) {
			headers["Content-Disposition"] = object.httpMetadata.contentDisposition;
		}
		if (object.httpMetadata?.contentEncoding !== undefined) {
			headers["Content-Encoding"] = object.httpMetadata.contentEncoding;
		}
		if (object.httpMetadata?.contentLanguage !== undefined) {
			headers["Content-Language"] = object.httpMetadata.contentLanguage;
		}
		if (object.httpMetadata?.cacheControl !== undefined) {
			headers["Cache-Control"] = object.httpMetadata.cacheControl;
		}

		// Handle range responses
		if (object.range) {
			if ("suffix" in object.range) {
				const length = object.range.suffix;
				const start = object.size - length;
				headers["Content-Range"] =
					`bytes ${String(start)}-${String(object.size - 1)}/${String(object.size)}`;
				headers["Content-Length"] = length.toString();
			} else if ("offset" in object.range) {
				const start = object.range.offset ?? 0;
				const length =
					"length" in object.range && object.range.length !== undefined ?
						object.range.length
					:	object.size - start;
				const end = Math.min(start + length - 1, object.size - 1);
				headers["Content-Range"] = `bytes ${String(start)}-${String(end)}/${String(object.size)}`;
				headers["Content-Length"] = (end - start + 1).toString();
			}

			return new Response(object.body, { status: 206, headers });
		}

		headers["Content-Length"] = object.size.toString();
		return new Response(object.body, { status: 200, headers });
	});

export const handleGet = (
	request: Request,
	bucket: R2Bucket
): Effect.Effect<Response, Error> => {
	const resourcePath = makeResourcePath(request);
	const isDir = isDirectory(request.url);

	return isDir ?
			handleDirectoryListing(request, bucket, resourcePath)
		:	handleFileDownload(request, bucket, resourcePath);
};

export const handleHead = (
	request: Request,
	bucket: R2Bucket
): Effect.Effect<Response, Error> =>
	Effect.gen(function* () {
		const response = yield* handleGet(request, bucket);
		return new Response(null, {
			status: response.status,
			statusText: response.statusText,
			headers: response.headers,
		});
	});
