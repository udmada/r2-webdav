import { Effect, Stream } from 'effect'
import type { R2Bucket } from '@cloudflare/workers-types'
import { headObject, deleteObject, listAll } from '../r2/operations'
import { makeResourcePath } from '../utils/path'

export const handleDelete = (
	request: Request,
	bucket: R2Bucket
): Effect.Effect<Response, Error> =>
	Effect.gen(function* () {
		const resourcePath = makeResourcePath(request)

		// Delete root - delete all objects
		if (resourcePath === '') {
			const keys = yield* Stream.runCollect(
				Stream.map(listAll(bucket, '', true), (object) => object.key)
			)
			const keyArray = Array.from(keys)

			if (keyArray.length > 0) {
				yield* deleteObject(bucket, keyArray)
			}

			return new Response(null, { status: 204 })
		}

		const resource = yield* headObject(bucket, resourcePath)
		if (resource === null) {
			return new Response('Not Found', { status: 404 })
		}

		yield* deleteObject(bucket, resourcePath)

		// If it's a collection, delete all children
		if (resource.customMetadata?.resourcetype === '<collection />') {
			const keys = yield* Stream.runCollect(
				Stream.map(
					listAll(bucket, `${resourcePath}/`, true),
					(object) => object.key
				)
			)
			const keyArray = Array.from(keys)

			if (keyArray.length > 0) {
				yield* deleteObject(bucket, keyArray)
			}
		}

		return new Response(null, { status: 204 })
	})
