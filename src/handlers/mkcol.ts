import { Effect } from 'effect'
import type { R2Bucket } from '@cloudflare/workers-types'
import { headObject, putObject } from '../r2/operations'
import { makeResourcePath } from '../utils/path'

export const handleMkcol = (
	request: Request,
	bucket: R2Bucket
): Effect.Effect<Response, Error> =>
	Effect.gen(function* () {
		// Check if request has body content (RFC 4918 requires 415 if body present)
		const contentLength = request.headers.get('Content-Length')
		if (contentLength !== null && parseInt(contentLength, 10) > 0) {
			return new Response('Unsupported Media Type', { status: 415 })
		}

		const resourcePath = makeResourcePath(request)

		// Check if the resource already exists
		const resource = yield* headObject(bucket, resourcePath)
		if (resource !== null) {
			return new Response('Method Not Allowed', { status: 405 })
		}

		// Check if the parent directory exists
		const parentDir = resourcePath.split('/').slice(0, -1).join('/')

		if (parentDir !== '') {
			const parent = yield* headObject(bucket, parentDir)
			if (!parent) {
				return new Response('Conflict', { status: 409 })
			}
		}

		yield* putObject(bucket, resourcePath, new Uint8Array(), {
			httpMetadata: request.headers,
			customMetadata: { resourcetype: '<collection />' },
		})

		return new Response('', { status: 201 })
	})
