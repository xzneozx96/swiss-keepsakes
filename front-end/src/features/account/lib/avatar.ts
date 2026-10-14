export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
/** Stored size: big enough for the 112px Edit profile circle at 2x, small enough for localStorage. */
const AVATAR_OUT = 256;

export type AvatarPickError = "type" | "size" | "decode";

/** Where the crop circle sits on the photo: zoom ≥ 1 over a cover fit, offset in circle widths. */
export interface AvatarCrop {
  zoom: number;
  x: number;
  y: number;
}

export function avatarPickError(file: File): AvatarPickError | null {
  if (!file.type.startsWith("image/")) return "type";
  if (file.size > AVATAR_MAX_BYTES) return "size";

  return null;
}

/** Decodes the picked file. The caller frees it with {@link releaseImage} when done. */
export function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    image.src = url;
  });
}

export const releaseImage = (image: HTMLImageElement) =>
  URL.revokeObjectURL(image.src);

/**
 * How far the photo may move before the circle shows an edge, in circle widths.
 * The photo covers the circle at zoom 1, so the slack is what overhangs each side.
 */
export function cropLimits(image: HTMLImageElement, zoom: number) {
  const cover = Math.max(1 / image.naturalWidth, 1 / image.naturalHeight);
  const w = image.naturalWidth * cover * zoom;
  const h = image.naturalHeight * cover * zoom;

  return { x: (w - 1) / 2, y: (h - 1) / 2, w, h };
}

export function clampCrop(image: HTMLImageElement, crop: AvatarCrop) {
  const limit = cropLimits(image, crop.zoom);
  const clamp = (v: number, max: number) => Math.min(max, Math.max(-max, v));

  return { ...crop, x: clamp(crop.x, limit.x), y: clamp(crop.y, limit.y) };
}

/** Draws the visible circle's square to a 256px JPEG data URL for the demo store. */
export function renderAvatar(image: HTMLImageElement, crop: AvatarCrop) {
  const canvas = document.createElement("canvas");
  const { w, h } = cropLimits(image, crop.zoom);

  canvas.width = AVATAR_OUT;
  canvas.height = AVATAR_OUT;
  canvas
    .getContext("2d")
    ?.drawImage(
      image,
      ((1 - w) / 2 + crop.x) * AVATAR_OUT,
      ((1 - h) / 2 + crop.y) * AVATAR_OUT,
      w * AVATAR_OUT,
      h * AVATAR_OUT,
    );

  return canvas.toDataURL("image/jpeg", 0.85);
}
