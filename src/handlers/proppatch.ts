import { Effect, pipe } from "effect";
import type { R2Bucket, R2ObjectBody } from "@cloudflare/workers-types";
import {
	headObject,
	getObject,
	putObject,
	isR2ObjectBody,
} from "../r2/operations";
import { makeResourcePath } from "../utils/path";
import {
	extractSetRemoveProperties,
	escapeXml,
	type XmlPropertyName,
} from "../utils/xml";

const buildProppatchResponse = (
	objectKey: string,
	setProps: ReadonlyMap<XmlPropertyName, string>,
	removeProps: ReadonlyArray<XmlPropertyName>
): string => {
	const allProps: XmlPropertyName[] = [
		...Array.from(setProps.keys()),
		...removeProps,
	];

	const responses = allProps
		.map(
			(propName) => `
<response>
  <href>/${escapeXml(objectKey)}</href>
  <propstat>
    <prop>
      <${escapeXml(propName)} />
    </prop>
    <status>HTTP/1.1 200 OK</status>
  </propstat>
</response>`
		)
		.join("\n");

	return `<?xml version="1.0" encoding="utf-8"?>
<multistatus xmlns="DAV:">
${responses}
</multistatus>`;
};

const applyPropertyChanges = (
	currentMetadata: Record<string, string> | undefined,
	setProps: ReadonlyMap<XmlPropertyName, string>,
	removeProps: ReadonlyArray<XmlPropertyName>
): Record<string, string> => {
	const updated = { ...currentMetadata };

	for (const [propName, value] of setProps.entries()) {
		updated[propName] = value;
	}

	const removeSet = new Set<string>(removeProps);
	return Object.fromEntries(
		Object.entries(updated).filter(([key]) => !removeSet.has(key))
	);
};

export const handleProppatch = (
	request: Request,
	bucket: R2Bucket
): Effect.Effect<Response, Error> =>
	pipe(
		Effect.succeed(makeResourcePath(request)),
		Effect.flatMap((resourcePath) =>
			pipe(
				headObject(bucket, resourcePath),
				Effect.filterOrFail(
					(obj): obj is NonNullable<typeof obj> => obj !== null,
					() => new Error("Not Found")
				),
				Effect.flatMap((object) =>
					pipe(
						Effect.promise(() => request.text()),
						Effect.flatMap((body) =>
							Effect.try({
								try: () => extractSetRemoveProperties(body),
								catch: (error) => new Error(`Invalid XML: ${String(error)}`),
							})
						),
						Effect.flatMap(({ set: setProps, remove: removeProps }) =>
							pipe(
								getObject(bucket, object.key),
								Effect.filterOrFail(
									(src): src is R2ObjectBody =>
										src !== null && isR2ObjectBody(src),
									() => new Error("Not Found")
								),
								Effect.flatMap((src) =>
									putObject(bucket, object.key, src.body, {
										httpMetadata: object.httpMetadata,
										customMetadata: applyPropertyChanges(
											object.customMetadata,
											setProps,
											removeProps
										),
									})
								),
								Effect.map(
									() =>
										new Response(
											buildProppatchResponse(object.key, setProps, removeProps),
											{
												status: 207,
												headers: {
													"Content-Type": 'application/xml; charset="utf-8"',
												},
											}
										)
								)
							)
						)
					)
				)
			)
		),
		Effect.catchAll((error) =>
			Effect.succeed(
				new Response(error.message, {
					status: error.message === "Not Found" ? 404 : 500,
				})
			)
		)
	);
