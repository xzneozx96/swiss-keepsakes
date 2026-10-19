const IMAGE_MIME = /^image\/(?:jpeg|png|webp)$/
/**
 * Demo state lives in localStorage (about 5 million characters for the whole app), so an
 * uploaded photo is downscaled to at most 1200px and kept as a JPEG data URL of at most
 * this many characters (about 220 KB).
 */
export const MAX_PHOTO_CHARS = 300_000
const MAX_SIDE = 1200
const QUALITIES = [0.82, 0.72, 0.62, 0.52]

export type UploadResult
  = { ok: true, photo: string } | { ok: false, reason: 'type' | 'size' | 'read' }

function load(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('unreadable image'))
    }
    image.src = url
  })
}

/**
 * Reads an image file, scales it to fit 1200 × 1200 and encodes it as JPEG, lowering the
 * quality until it fits {@link MAX_PHOTO_CHARS}. A photo that still does not fit is refused.
 */
export async function preparePhoto(file: File): Promise<UploadResult> {
  if (!IMAGE_MIME.test(file.type))
    return { ok: false, reason: 'type' }

  let image: HTMLImageElement

  try {
    image = await load(file)
  }
  catch {
    return { ok: false, reason: 'read' }
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')

  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  const context = canvas.getContext('2d')

  if (!context)
    return { ok: false, reason: 'read' }
  // JPEG has no transparency: a white ground instead of black for PNGs.
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  for (const quality of QUALITIES) {
    const photo = canvas.toDataURL('image/jpeg', quality)

    if (photo.length <= MAX_PHOTO_CHARS)
      return { ok: true, photo }
  }

  return { ok: false, reason: 'size' }
}

/** The demo state this app may keep in localStorage before a save is refused. */
export const STORAGE_BUDGET = 4_500_000
