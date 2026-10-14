import type { Review } from "@/features/catalog/types";
import type { ReviewableProduct } from "../hooks/use-order-reviews";

import {
  Button,
  Description,
  Drawer,
  FieldError,
  Form,
  Label,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
} from "@heroui/react";
import { useState } from "react";

import { RatingIcon } from "@/components/icons";
import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";

const RATINGS = [1, 2, 3, 4, 5] as const;
const MAX_TEXT = 1000;

/**
 * C18 Write a review (bottom sheet): the product reviewed, 1–5 stars and text. One overall
 * rating only (decisions.tsv). Opened from a completed order on C15.
 */
export function WriteReviewSheet({
  product,
  kind = "gift",
  isOpen,
  onOpenChange,
  onSubmit,
}: {
  product: ReviewableProduct | undefined;
  kind?: "gift" | "tour";
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (rating: Review["rating"], text: string) => void;
}) {
  const { t } = useLocale();

  return (
    <Drawer.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
      <Drawer.Content className="mx-auto max-w-[430px]" placement="bottom">
        <Drawer.Dialog className="flex sheet-max flex-col">
          <Drawer.Handle />
          <Drawer.Header className="flex flex-row items-center justify-between gap-2">
            <Drawer.Heading className="font-serif text-title">
              {t("review.title")}
            </Drawer.Heading>
            <Drawer.CloseTrigger aria-label={t("review.close")} />
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-6 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+24px)] text-foreground">
            {product && (
              // Remounts per product, so a reopened sheet starts empty.
              <ReviewForm
                key={product.productId}
                kind={kind}
                product={product}
                onSubmit={onSubmit}
              />
            )}
          </Drawer.Body>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  );
}

function ReviewForm({
  product,
  kind,
  onSubmit,
}: {
  product: ReviewableProduct;
  kind: "gift" | "tour";
  onSubmit: (rating: Review["rating"], text: string) => void;
}) {
  const { t } = useLocale();
  const [rating, setRating] = useState<Review["rating"] | null>(null);
  const [text, setText] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const ratingInvalid = showErrors && rating === null;
  const textInvalid = showErrors && text.trim() === "";

  return (
    <Form
      className="flex flex-col gap-6"
      validationBehavior="aria"
      onSubmit={(e) => {
        e.preventDefault();
        if (rating === null || text.trim() === "") {
          setShowErrors(true);

          return;
        }
        onSubmit(rating, text);
      }}
    >
      <div className="flex items-center gap-3">
        <Media
          alt=""
          className="size-14 shrink-0 rounded-xl"
          photo={product.photo}
        />
        <div className="flex min-w-0 flex-col">
          <span className="font-semibold">{product.name}</span>
          <span className="text-sm text-muted">{product.detail}</span>
        </div>
      </div>

      <RadioGroup
        isInvalid={ratingInvalid}
        name="rating"
        orientation="horizontal"
        value={rating === null ? null : String(rating)}
        onChange={(value) => setRating(Number(value) as Review["rating"])}
      >
        <Label className="text-heading">{t("review.rating.label")}</Label>
        <div className="flex gap-1">
          {RATINGS.map((n) => (
            <Radio key={n} className="gap-0" value={String(n)}>
              <Radio.Content className="flex size-11 cursor-pointer items-center justify-center rounded-full outline-none transition-transform active:scale-90 data-[focus-visible=true]:focus-ring">
                <RatingIcon
                  aria-hidden
                  className={
                    rating !== null && n <= rating
                      ? "text-foreground"
                      : "text-foreground opacity-20"
                  }
                  size={32}
                  weight="Filled"
                />
                <span className="sr-only">
                  {t("review.rating.option", { rating: n })}
                </span>
              </Radio.Content>
            </Radio>
          ))}
        </div>
        <FieldError>{t("review.rating.error")}</FieldError>
      </RadioGroup>

      <TextField
        fullWidth
        isInvalid={textInvalid}
        maxLength={MAX_TEXT}
        name="text"
        value={text}
        onChange={setText}
      >
        <Label className="text-heading">{t("review.text.label")}</Label>
        <TextArea rows={5} />
        <Description>
          {t(kind === "tour" ? "tourReviews.textHelp" : "review.text.help")}
        </Description>
        <FieldError>
          {t(kind === "tour" ? "tourReviews.textError" : "review.text.error")}
        </FieldError>
      </TextField>

      <div className="flex flex-col gap-2">
        <Button fullWidth size="lg" type="submit">
          {t("review.submit")}
        </Button>
        <p className="text-sm text-muted">
          {t(
            kind === "tour"
              ? "tourReviews.verifiedNote"
              : "review.verifiedNote",
          )}
        </p>
      </div>
    </Form>
  );
}
