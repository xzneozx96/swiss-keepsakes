import sharp from 'sharp'

// Test images are built here, so no binary is committed.
const gps = { GPSLatitudeRef: 'N', GPSLatitude: '47/1 3/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '8/1 18/1 0/1' }

// A JPEG that carries GPS EXIF, and with `orientation` 1 to 8 the EXIF orientation tag too.
export async function jpegWithGps(width: number, height: number, orientation?: number): Promise<Uint8Array> {
  return sharp({ create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } } })
    .withExif({ IFD3: gps })
    .jpeg()
    // withExif does not carry an Orientation tag through, withMetadata sets it.
    .withMetadata(orientation === undefined ? {} : { orientation })
    .toBuffer()
}

export async function pngImage(width: number, height: number): Promise<Uint8Array> {
  return sharp({ create: { width, height, channels: 3, background: { r: 10, g: 120, b: 200 } } }).png().toBuffer()
}

// Starts like a JPEG, so the sniff accepts it, but no decoder can read it.
export const undecodableJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 5, 6, 7, 8])
