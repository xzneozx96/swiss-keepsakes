import { createApiClient } from '@sk/api-contract'

/**
 * The generated API client (D11) for a feature's API `DataClient`. Before each request it asks
 * `getToken` for the signed-in user's JWT and sends it as `Authorization: Bearer`. Pass
 * `getAccessToken` from `features/auth/lib/neon-auth`, which reads the token from the Neon Auth
 * SDK's memory, so the token is never stored.
 */
export function createSignedApiClient(
  baseUrl: string,
  getToken: () => Promise<string | null>,
) {
  const client = createApiClient(baseUrl)

  client.use({
    async onRequest({ request }) {
      const token = await getToken()

      if (token)
        request.headers.set('Authorization', `Bearer ${token}`)

      return request
    },
  })

  return client
}
