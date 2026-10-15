/**
 * The shop's media library in the prototype: the bundled photos and recordings stand in for
 * uploads (M17). Only the file names are read here; lib/photos.ts and lib/audio.ts resolve
 * them to URLs, so a chosen file always renders on C20.
 */
const fileName = (path: string, ext: string) =>
  path.slice(path.lastIndexOf("/") + 1, -ext.length);

export const libraryPhotos: string[] = Object.keys(
  import.meta.glob("/src/assets/photos/*.jpg"),
)
  .map((path) => fileName(path, ".jpg"))
  .sort();

export const libraryAudio: string[] = Object.keys(
  import.meta.glob("/src/assets/audio/*.mp3"),
)
  .map((path) => fileName(path, ".mp3"))
  .sort();
