import { Effect, Stream } from 'effect'
import type { R2Bucket } from '@cloudflare/workers-types'
import { headObject, getObject, putObject, isR2ObjectBody, listAll } from '../r2/operations'
import { makeResourcePath } from '../utils/path'

export const handleCopy = (
	request: Request,
	bucket: R2Bucket
): Effect.Effect<Response, Error> =>
	Effect.gen(function* () {
		const resourcePath = makeResourcePath(request)
		const dontOverwrite = request.headers.get('Overwrite') === 'F'
		const destinationHeader = request.headers.get('Destination')

		if (destinationHeader === null) {
			return new Response('Bad Request', { status: 400 })
		}

		let destination = new URL(destinationHeader).pathname.slice(1)
		destination = destination.endsWith('/') ? destination.slice(0, -1) : destination

		// Check if the parent directory exists
		const destinationParent = destination
			.split('/')
			.slice(0, destination.endsWith('/') ? -2 : -1)
			.join('/')

		if (destinationParent !== '') {
			const parent = yield* headObject(bucket, destinationParent)
			if (!parent) {
				return new Response('Conflict', { status: 409 })
			}
		}

		// Check if the destination already exists
		const destinationExists = yield* headObject(bucket, destination)
		if (dontOverwrite && destinationExists) {
			return new Response('Precondition Failed', { status: 412 })
		}

		const resource = yield* headObject(bucket, resourcePath)
		if (resource === null) {
			return new Response('Not Found', { status: 404 })
		}

		const isDir = resource.customMetadata?.resourcetype === '<collection />'

		if (isDir) {
			const depth = request.headers.get('Depth') ?? 'infinity'

			switch (depth) {
				case 'infinity': {
					const prefix = `${resourcePath}/`

					// Copy root collection
					const rootSrc = yield* getObject(bucket, resource.key)
					if (rootSrc !== null && isR2ObjectBody(rootSrc)) {
						yield* putObject(bucket, destination, rootSrc.body, {
							httpMetadata: resource.httpMetadata,
							customMetadata: resource.customMetadata,
						})
					}

					// Copy all children
					yield* Stream.runForEach(listAll(bucket, prefix, true), (object) =>
						Effect.gen(function* () {
							let target = `${destination}/${object.key.slice(prefix.length)}`
							target = target.endsWith('/') ? target.slice(0, -1) : target
							const src = yield* getObject(bucket, object.key)
							if (src !== null && isR2ObjectBody(src)) {
								yield* putObject(bucket, target, src.body, {
									httpMetadata: object.httpMetadata,
									customMetadata: object.customMetadata,
								})
							}
						})
					)

					return new Response(destinationExists ? null : '', {
						status: destinationExists ? 204 : 201,
					})
				}
				case '0': {
					const object = yield* getObject(bucket, resource.key)
					if (object === null || !isR2ObjectBody(object)) {
						return new Response('Not Found', { status: 404 })
					}
					yield* putObject(bucket, destination, object.body, {
						httpMetadata: object.httpMetadata,
						customMetadata: object.customMetadata,
					})
					return new Response(destinationExists ? null : '', {
						status: destinationExists ? 204 : 201,
					})
				}
				default:
					return new Response('Bad Request', { status: 400 })
			}
		} else {
			const src = yield* getObject(bucket, resource.key)
			if (src === null || !isR2ObjectBody(src)) {
				return new Response('Not Found', { status: 404 })
			}
			yield* putObject(bucket, destination, src.body, {
				httpMetadata: src.httpMetadata,
				customMetadata: src.customMetadata,
			})
			return new Response(destinationExists ? null : '', {
				status: destinationExists ? 204 : 201,
			})
		}
	})
