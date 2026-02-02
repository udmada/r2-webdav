import { Effect } from 'effect'
import type { R2Bucket } from '@cloudflare/workers-types'
import { headObject, putObject } from '../r2/operations'
import { makeResourcePath } from '../utils/path'

export const handlePut = (
	request: Request,
	bucket: R2Bucket
): Effect.Effect<Response, Error> =>
	Effect.gen(function* () {
		if (request.url.endsWith('/')) {
			return new Response('Method Not Allowed', { status: 405 })
		}

		const resourcePath = makeResourcePath(request)

		// Check if the parent directory exists
		const dirpath = resourcePath.split('/').slice(0, -1).join('/')
		if (dirpath !== '') {
			const dir = yield* headObject(bucket, dirpath)
			if (!(dir && dir.customMetadata?.resourcetype === '<collection />')) {
				return new Response('Conflict', { status: 409 })
			}
		}

		const body = yield* Effect.promise(() => request.arrayBuffer())

		yield* putObject(bucket, resourcePath, body, {
			onlyIf: request.headers,
			httpMetadata: request.headers,
		})

		return new Response('', { status: 201 })
	})
