const WWW_PREFIX = /^(www\.|m\.)/
const HTTP_SCHEME = /^https?:\/\//i
const ID = /^[\w-]{11}$/

/**
 * The 11-character video id from what a merchant pastes: a bare id, or a youtu.be,
 * youtube.com/watch?v=, /embed/, /shorts/ or /live/ link. Null when it is neither.
 */
export function parseYoutubeId(input: string): string | null {
  const value = input.trim()

  if (ID.test(value))
    return value
  let url: URL

  try {
    url = new URL(HTTP_SCHEME.test(value) ? value : `https://${value}`)
  }
  catch {
    return null
  }
  const host = url.hostname.replace(WWW_PREFIX, '')
  const parts = url.pathname.split('/').filter(Boolean)
  let id: string | null | undefined

  if (host === 'youtu.be') {
    id = parts[0]
  }
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id
      = parts[0] === 'watch'
        ? url.searchParams.get('v')
        : ['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')
            ? parts[1]
            : undefined
  }

  return id && ID.test(id) ? id : null
}
