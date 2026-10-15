import type { Language } from "@/contexts/locale-context";

import {
  Button,
  Description,
  FieldError,
  Form,
  Label,
  Radio,
  RadioGroup,
  TextArea,
  TextField,
} from "@heroui/react";
import { useState } from "react";

import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/features/merchant/order-detail/components/decision-block";

const MAX_TEXT = 1000;

/** Same choice card as M08, M15 and the M04 sheets: ink frame when selected. */
const choiceCard =
  "rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground";

/**
 * The shop's public reply, in the M04 sheet frame (M18 comments, M23 reviews): the text it
 * answers, an optional language choice (reviews), the reply, and one post action.
 */
export function ReplySheet({
  title,
  quote,
  quoteLanguage,
  help,
  submitLabel,
  initialText = "",
  language,
  onSubmit,
  onClose,
}: {
  title: string;
  quote: string;
  quoteLanguage: Language;
  help: string;
  submitLabel: string;
  initialText?: string;
  /** Review replies record their language, so C03 and C09 can show the language note. */
  language?: Language;
  onSubmit: (text: string, language?: Language) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [text, setText] = useState(initialText);
  const [replyLanguage, setReplyLanguage] = useState(language);
  const [tried, setTried] = useState(false);
  const invalid = tried && text.trim() === "";

  const submit = () => {
    setTried(true);
    if (text.trim() === "") return;
    onSubmit(text, replyLanguage);
  };

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button fullWidth onPress={submit}>
            {submitLabel}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t("merchantContent.back")}
          </Button>
        </>
      }
      title={title}
      onClose={onClose}
    >
      <blockquote
        className="line-clamp-4 border-s border-separator ps-3 text-sm text-muted"
        lang={quoteLanguage}
      >
        {quote}
      </blockquote>
      <Form
        className="flex flex-col gap-6"
        validationBehavior="aria"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {replyLanguage && (
          <RadioGroup
            value={replyLanguage}
            onChange={(v) => setReplyLanguage(v as Language)}
          >
            <Label className="text-heading">
              {t("merchantReviews.sheet.language")}
            </Label>
            <Description>{t("merchantReviews.sheet.languageHelp")}</Description>
            <div className="grid grid-cols-2 gap-2">
              {(["en", "de"] as const).map((lang) => (
                <Radio key={lang} className={choiceCard} value={lang}>
                  <Radio.Content>
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    {t(`merchantContent.lang.${lang}`)}
                  </Radio.Content>
                </Radio>
              ))}
            </div>
          </RadioGroup>
        )}
        <TextField
          fullWidth
          isInvalid={invalid}
          maxLength={MAX_TEXT}
          name="reply"
          value={text}
          onChange={setText}
        >
          <Label className="text-heading">
            {t("merchantComments.sheet.label")}
          </Label>
          <TextArea lang={replyLanguage ?? quoteLanguage} rows={5} />
          <Description>{help}</Description>
          <FieldError>{t("merchantComments.sheet.error")}</FieldError>
        </TextField>
      </Form>
    </SheetFrame>
  );
}
