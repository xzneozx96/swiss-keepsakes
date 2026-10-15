import { Button } from "@heroui/react";
import { useRef, useState } from "react";

import { preparePhoto } from "../lib/photo-upload";

import { PhotoAddIcon, UploadIcon } from "@/components/icons";
import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";
import { PhotoSheet } from "@/features/content/merchant/components/media-sheets";
import { isUploadedPhoto } from "@/lib/rich-text";

/**
 * "Upload photo": a hidden file input, downscaled to a small JPEG (lib/photo-upload.ts).
 * `open` shows the file dialog; `error` says why a file was refused.
 */
export function usePhotoInput(onPhoto: (photo: string) => void) {
  const { t } = useLocale();
  const ref = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();

  return {
    open: () => ref.current?.click(),
    error,
    input: (
      <input
        ref={ref}
        hidden
        accept="image/jpeg,image/png,image/webp"
        data-testid="photo-upload"
        type="file"
        onChange={async (event) => {
          const file = event.target.files?.[0];

          event.target.value = "";
          if (!file) return;
          const result = await preparePhoto(file);

          if (result.ok) {
            setError(undefined);
            onPhoto(result.photo);
          } else {
            setError(t(`products.photo.error.${result.reason}`));
          }
        }}
      />
    ),
  };
}

/**
 * The main photo of a gift or tour (C02, C01, C03, C08, C09): the photo, then "Upload
 * photo" and "Choose from library", ink buttons. Library photos are kept by slug.
 */
export function PhotoField({
  label,
  help,
  value,
  onChange,
  error,
}: {
  label: string;
  help: string;
  value: string | undefined;
  onChange: (photo: string) => void;
  error?: string;
}) {
  const { t } = useLocale();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const upload = usePhotoInput(onChange);
  const shownError = upload.error ?? error;

  return (
    <div
      className="flex flex-col gap-3"
      data-invalid={shownError ? "" : undefined}
    >
      <span className="text-sm font-medium">{label}</span>
      <Media alt="" className="aspect-[4/3] w-full rounded-2xl" photo={value} />
      <p className="text-xs text-pretty text-muted">
        {value
          ? isUploadedPhoto(value)
            ? t("products.photo.uploaded")
            : t("products.photo.fromLibrary")
          : t("products.photo.none")}{" "}
        {help}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          aria-invalid={shownError ? true : undefined}
          data-error-focus={error ? "true" : undefined}
          size="sm"
          variant="tertiary"
          onPress={upload.open}
        >
          <UploadIcon aria-hidden size={16} />
          {t("products.photo.upload")}
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          onPress={() => setLibraryOpen(true)}
        >
          <PhotoAddIcon aria-hidden size={16} />
          {t("products.photo.library")}
        </Button>
      </div>
      {upload.input}
      {shownError && (
        <p data-visible className="field-error" role="alert">
          {shownError}
        </p>
      )}
      {libraryOpen && (
        <PhotoSheet
          value={value && !isUploadedPhoto(value) ? value : ""}
          onChoose={(slug) => {
            setLibraryOpen(false);
            onChange(slug);
          }}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}
