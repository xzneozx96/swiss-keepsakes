import type { IconComponent } from "@/components/icons";
import type { Language } from "@/contexts/locale-context";
import type { MessageKey } from "@/i18n/en";

import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  TextArea,
  TextField,
} from "@heroui/react";
import { useId } from "react";

import {
  ChevronDownIcon,
  StatusDangerIcon,
  TrashIcon,
} from "@/components/icons";
import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";

/** Marks a custom control with an error, so the editor can move focus to the first one. */
export const ERROR_SELECTOR =
  'input[aria-invalid="true"], textarea[aria-invalid="true"], [data-error="true"]';

/** One text field of the M17 editor, with its inline error after a save attempt. */
export function Field({
  label,
  value,
  onChange,
  error,
  description,
  rows,
  lang,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: MessageKey;
  description?: string;
  /** Multi-line when set. */
  rows?: number;
  lang?: Language;
}) {
  const { t } = useLocale();

  return (
    <TextField fullWidth isInvalid={!!error} value={value} onChange={onChange}>
      <Label>{label}</Label>
      {rows ? <TextArea lang={lang} rows={rows} /> : <Input lang={lang} />}
      {description && <Description>{description}</Description>}
      <FieldError>{error ? t(error) : ""}</FieldError>
    </TextField>
  );
}

/** A photo or recording chosen from the library: a preview, the choose button, the error. */
export function PickerField({
  label,
  photo,
  fileName,
  emptyLabel,
  chooseLabel,
  changeLabel,
  error,
  onChoose,
}: {
  label: string;
  /** Photo preview; omitted for audio. */
  photo?: string;
  /** The chosen file, shown as text (audio) or under the preview. */
  fileName?: string;
  emptyLabel: string;
  chooseLabel: string;
  changeLabel: string;
  error?: MessageKey;
  onChoose: () => void;
}) {
  const { t } = useLocale();
  const id = useId();
  const chosen = photo ?? fileName;

  return (
    <div className="flex flex-col gap-2" data-error={error ? true : undefined}>
      <span
        className={`text-sm font-medium ${error ? "text-danger" : ""}`}
        id={`${id}-label`}
      >
        {label}
      </span>
      <div className="flex items-center gap-3">
        {photo !== undefined && (
          <Media
            alt=""
            className="aspect-[4/3] w-28 shrink-0 rounded-xl"
            photo={photo || undefined}
          />
        )}
        <div className="flex min-w-0 flex-col items-start gap-2">
          <span className="text-sm text-muted [overflow-wrap:anywhere]">
            {chosen ? (fileName ?? `${photo}.jpg`) : emptyLabel}
          </span>
          <Button
            aria-describedby={error ? `${id}-error` : undefined}
            aria-label={`${chosen ? changeLabel : chooseLabel}: ${label}`}
            size="sm"
            variant="tertiary"
            onPress={onChoose}
          >
            {chosen ? changeLabel : chooseLabel}
          </Button>
        </div>
      </div>
      {error && (
        <p
          className="flex items-start gap-1.5 text-sm text-danger"
          id={`${id}-error`}
        >
          <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {t(error)}
        </p>
      )}
    </div>
  );
}

/** Small ink icon button for move and remove. */
export function IconAction({
  label,
  icon: Icon,
  isDisabled,
  className,
  buttonProps,
  onPress,
}: {
  label: string;
  icon: IconComponent;
  isDisabled?: boolean;
  className?: string;
  /** Extra class (a tone, a taller hit area) and data attribute for the button itself. */
  buttonProps?: { className?: string; "data-move"?: "up" | "down" };
  onPress: () => void;
}) {
  return (
    <Button
      isIconOnly
      aria-label={label}
      isDisabled={isDisabled}
      size="sm"
      variant="tertiary"
      onPress={onPress}
      {...buttonProps}
    >
      <Icon aria-hidden className={className} size={18} />
    </Button>
  );
}

/** Up, down and remove for one item of an ordered list (sections, blocks, links, stories). */
export function OrderActions({
  name,
  index,
  count,
  onMove,
  onRemove,
}: {
  name: string;
  index: number;
  count: number;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="flex shrink-0 items-center">
      <IconAction
        className="rotate-180"
        icon={ChevronDownIcon}
        isDisabled={index === 0}
        label={t("merchantArticles.moveUp", { name })}
        onPress={() => onMove(-1)}
      />
      <IconAction
        icon={ChevronDownIcon}
        isDisabled={index === count - 1}
        label={t("merchantArticles.moveDown", { name })}
        onPress={() => onMove(1)}
      />
      <IconAction
        icon={TrashIcon}
        label={t("merchantArticles.remove", { name })}
        onPress={onRemove}
      />
    </div>
  );
}
