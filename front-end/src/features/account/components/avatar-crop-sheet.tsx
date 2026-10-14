import type { AvatarCrop } from "../lib/avatar";

import { Button, Drawer, Label, Slider } from "@heroui/react";
import { useRef, useState } from "react";

import { clampCrop, cropLimits, renderAvatar } from "../lib/avatar";

import { useLocale } from "@/contexts/locale-context";

const VIEW = 248;
const KEY_STEP = 0.04;

/**
 * Position and zoom a picked photo inside the round frame (1.12s), then save it as the 256px
 * avatar. Drag or arrow keys move the photo; the slider zooms. The photo always covers the
 * circle, so the saved avatar never shows an empty edge.
 */
export function AvatarCropSheet({
  image,
  onCancel,
  onSave,
}: {
  image: HTMLImageElement;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}) {
  const { t } = useLocale();
  const [crop, setCrop] = useState<AvatarCrop>({ zoom: 1, x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(
    null,
  );
  const { w, h } = cropLimits(image, crop.zoom);
  const move = (next: AvatarCrop) => setCrop(clampCrop(image, next));

  return (
    <Drawer.Backdrop isOpen onOpenChange={(open) => !open && onCancel()}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog className="flex max-h-[92dvh] flex-col">
          <Drawer.Handle />
          <Drawer.Header className="flex items-center justify-between">
            <Drawer.Heading className="text-title">
              {t("account.edit.crop.title")}
            </Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t("account.edit.crop.cancel")} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col items-center gap-6 overflow-y-auto py-2">
            <button
              aria-label={t("account.edit.crop.frame")}
              className="relative shrink-0 cursor-grab touch-none overflow-hidden rounded-full bg-default shadow-surface ring-4 ring-surface outline-none select-none focus-visible:focus-ring active:cursor-grabbing"
              style={{ width: VIEW, height: VIEW }}
              type="button"
              onKeyDown={(e) => {
                const step = {
                  ArrowLeft: [-KEY_STEP, 0],
                  ArrowRight: [KEY_STEP, 0],
                  ArrowUp: [0, -KEY_STEP],
                  ArrowDown: [0, KEY_STEP],
                }[e.key];

                if (!step) return;
                e.preventDefault();
                move({ ...crop, x: crop.x + step[0], y: crop.y + step[1] });
              }}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                drag.current = {
                  px: e.clientX,
                  py: e.clientY,
                  x: crop.x,
                  y: crop.y,
                };
              }}
              onPointerMove={(e) => {
                const from = drag.current;

                if (!from) return;
                move({
                  ...crop,
                  x: from.x + (e.clientX - from.px) / VIEW,
                  y: from.y + (e.clientY - from.py) / VIEW,
                });
              }}
              onPointerUp={() => (drag.current = null)}
            >
              <img
                alt=""
                className="pointer-events-none absolute max-w-none"
                draggable={false}
                src={image.src}
                style={{
                  width: w * VIEW,
                  height: h * VIEW,
                  left: ((1 - w) / 2 + crop.x) * VIEW,
                  top: ((1 - h) / 2 + crop.y) * VIEW,
                }}
              />
            </button>
            <p className="text-center text-sm text-muted">
              {t("account.edit.crop.hint")}
            </p>
            <Slider
              className="w-full"
              maxValue={3}
              minValue={1}
              step={0.01}
              value={crop.zoom}
              onChange={(v) => move({ ...crop, zoom: v as number })}
            >
              <Label>{t("account.edit.crop.zoom")}</Label>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
          </Drawer.Body>
          <Drawer.Footer className="flex flex-col gap-2 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
            <Button
              fullWidth
              className="h-14 text-base"
              onPress={() => onSave(renderAvatar(image, crop))}
            >
              {t("account.edit.crop.save")}
            </Button>
            <Button fullWidth variant="tertiary" onPress={onCancel}>
              {t("account.edit.crop.cancel")}
            </Button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}
