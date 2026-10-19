/**
 * Audio registry: every MP3 in src/assets/audio, keyed by file name without extension.
 * Sources and licences are listed in src/assets/audio/CREDITS.txt.
 */
const files = import.meta.glob<string>('/src/assets/audio/*.mp3', {
  eager: true,
  import: 'default',
})

const byName = new Map(
  Object.entries(files).map(([path, url]) => [
    path.slice(path.lastIndexOf('/') + 1, -'.mp3'.length),
    url,
  ]),
)

/** URL for an audio file name, or undefined when the file is not in the repo. */
export function audioUrl(name: string): string | undefined {
  return byName.get(name)
}
