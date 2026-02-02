import { Effect } from 'effect'

export const isAuthorized = (
	authHeader: string | null,
	username: string,
	password: string
): Effect.Effect<boolean> =>
	Effect.sync(() => {
		if (authHeader === null) return false

		const encoder = new TextEncoder()
		const header = encoder.encode(authHeader)
		const expected = encoder.encode(`Basic ${btoa(`${username}:${password}`)}`)

		return (
			header.byteLength === expected.byteLength &&
			crypto.subtle.timingSafeEqual(header, expected)
		)
	})
