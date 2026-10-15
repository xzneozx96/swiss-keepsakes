import type { AdviceAnswerType, AdviceQuestion } from "../../types";
import type { LocalizedText } from "@/features/catalog/types";

import {
  Button,
  Description,
  FieldError,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextArea,
  TextField,
} from "@heroui/react";
import { useState } from "react";

import { isChoice, newId } from "../lib/question-set";

import { useConfirm } from "@/components/confirm-dialog";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { SheetFrame } from "@/features/merchant/order-detail/components/decision-block";

const TYPES: AdviceAnswerType[] = ["number", "single", "multi", "date", "text"];

interface OptionDraft {
  id: string;
  en: string;
  de: string;
}

const blankOption = (): OptionDraft => ({ id: newId("o"), en: "", de: "" });

/** Only the languages that have text, so a blank field counts as missing (D7). */
function localized(en: string, de: string): LocalizedText {
  return {
    ...(en.trim() ? { en: en.trim() } : {}),
    ...(de.trim() ? { de: de.trim() } : {}),
  };
}

/**
 * Add or edit one trip-assistant question (spec M19) in the M08 sheet frame: the EN and DE
 * wording (one may be missing, with a warning), the answer type, the options of a choice
 * question in both languages, and whether guests must answer. Save replaces the question in
 * the shop's set; errors show after the first save attempt. The sheet also deletes, through
 * the shared confirmation, as long as another question remains.
 */
export function QuestionSheet({
  question,
  canDelete,
  onSave,
  onDelete,
  onClose,
}: {
  /** Null adds a new question at the end. */
  question: AdviceQuestion | null;
  canDelete: boolean;
  onSave: (question: AdviceQuestion) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { confirm, dialog } = useConfirm();
  const [en, setEn] = useState(question?.text.en ?? "");
  const [de, setDe] = useState(question?.text.de ?? "");
  const [type, setType] = useState<AdviceAnswerType>(question?.type ?? "text");
  const [required, setRequired] = useState(question?.required ?? false);
  const [options, setOptions] = useState<OptionDraft[]>(
    question?.options?.map((o) => ({
      id: o.id,
      en: o.label.en ?? "",
      de: o.label.de ?? "",
    })) ?? [],
  );
  const [tried, setTried] = useState(false);
  const choice = isChoice({ type });

  const textError =
    !en.trim() && !de.trim() ? t("adviceQuestions.sheet.textError") : null;
  const optionsError =
    choice && options.length < 2
      ? t("adviceQuestions.sheet.optionsError")
      : null;
  const optionError = (o: OptionDraft) =>
    !o.en.trim() && !o.de.trim()
      ? t("adviceQuestions.sheet.optionError")
      : null;
  const isValid =
    !textError && !optionsError && (!choice || !options.some(optionError));

  const changeType = (next: AdviceAnswerType) => {
    setType(next);
    // A choice question starts with two empty options to fill in.
    if (isChoice({ type: next }) && options.length === 0)
      setOptions([blankOption(), blankOption()]);
  };

  const editOption = (id: string, patch: Partial<OptionDraft>) =>
    setOptions((list) =>
      list.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );

  const save = () => {
    setTried(true);
    if (!isValid) return;
    onSave({
      id: question?.id ?? newId("q"),
      text: localized(en, de),
      type,
      required,
      // A number keeps its lowest value; other types drop it, and only choices keep options.
      ...(type === "number" &&
      question?.type === "number" &&
      question.min !== undefined
        ? { min: question.min }
        : {}),
      ...(choice
        ? {
            options: options.map((o) => ({
              id: o.id,
              label: localized(o.en, o.de),
            })),
          }
        : {}),
    });
  };

  const remove = async () => {
    if (!question) return;
    const name = question.text.en || question.text.de || "";
    const ok = await confirm({
      title: t("adviceQuestions.delete.title", { question: name }),
      body: t("adviceQuestions.delete.body"),
      confirmLabel: t("adviceQuestions.sheet.delete"),
    });

    if (ok) onDelete(question.id);
  };

  const missingNote = (
    text: string,
    other: string,
    key: "missingEn" | "missingDe",
  ) =>
    !text.trim() && other.trim() ? (
      <Description className="text-warning">
        {t(`adviceQuestions.sheet.${key}`)}
      </Description>
    ) : null;

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button fullWidth onPress={save}>
            {t("adviceQuestions.sheet.save")}
          </Button>
          <Button fullWidth variant="tertiary" onPress={onClose}>
            {t("merchantOrder.sheet.back")}
          </Button>
        </>
      }
      title={t(
        question
          ? "adviceQuestions.sheet.editTitle"
          : "adviceQuestions.sheet.addTitle",
      )}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        <TextField
          fullWidth
          isInvalid={tried && !!textError}
          value={en}
          onChange={setEn}
        >
          <Label className="text-heading">
            {t("adviceQuestions.sheet.textEn")}
          </Label>
          <TextArea lang="en" rows={2} />
          {missingNote(en, de, "missingEn")}
          <FieldError>{textError}</FieldError>
        </TextField>
        <TextField
          fullWidth
          isInvalid={tried && !!textError}
          value={de}
          onChange={setDe}
        >
          <Label className="text-heading">
            {t("adviceQuestions.sheet.textDe")}
          </Label>
          <TextArea lang="de" rows={2} />
          {missingNote(de, en, "missingDe")}
          <FieldError>{textError}</FieldError>
        </TextField>
      </div>

      <Select
        className="w-full"
        selectedKey={type}
        onSelectionChange={(key) =>
          key !== null && changeType(String(key) as AdviceAnswerType)
        }
      >
        <Label className="text-heading">
          {t("adviceQuestions.sheet.type")}
        </Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {TYPES.map((id) => (
              <ListBox.Item
                key={id}
                id={id}
                textValue={t(`adviceQuestions.type.${id}`)}
              >
                {t(`adviceQuestions.type.${id}`)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>

      {choice && (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-heading">
            {t("adviceQuestions.sheet.options")}
          </legend>
          {options.map((o, i) => {
            const error = tried ? optionError(o) : null;
            const missing = !error
              ? (["en", "de"] as const).filter((l) => !o[l].trim())
              : [];

            return (
              <div
                key={o.id}
                className="flex flex-col gap-2 rounded-2xl border border-separator p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {t("adviceQuestions.sheet.option", { n: i + 1 })}
                  </span>
                  <Button
                    isIconOnly
                    aria-label={t("adviceQuestions.sheet.optionRemove", {
                      n: i + 1,
                    })}
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      setOptions((list) => list.filter((x) => x.id !== o.id))
                    }
                  >
                    <TrashIcon aria-hidden size={18} />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["en", "de"] as const).map((l) => (
                    <TextField
                      key={l}
                      fullWidth
                      isInvalid={!!error}
                      value={o[l]}
                      onChange={(v) => editOption(o.id, { [l]: v })}
                    >
                      <Label className="text-xs text-muted">
                        {t(
                          l === "en"
                            ? "adviceQuestions.sheet.optionEn"
                            : "adviceQuestions.sheet.optionDe",
                        )}
                      </Label>
                      <Input lang={l} />
                    </TextField>
                  ))}
                </div>
                {error && (
                  <p className="text-sm text-danger" role="alert">
                    {error}
                  </p>
                )}
                {missing.length === 1 && (
                  <p className="text-sm text-warning">
                    {t("adviceQuestions.sheet.optionMissing", {
                      language: missing[0].toUpperCase(),
                    })}
                  </p>
                )}
              </div>
            );
          })}
          {tried && optionsError && (
            <p className="text-sm text-danger" role="alert">
              {optionsError}
            </p>
          )}
          <Button
            className="w-fit"
            size="sm"
            variant="tertiary"
            onPress={() => setOptions((list) => [...list, blankOption()])}
          >
            <PlusIcon aria-hidden size={16} />
            {t("adviceQuestions.sheet.optionAdd")}
          </Button>
        </fieldset>
      )}

      <Switch isSelected={required} onChange={setRequired}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          {t("adviceQuestions.sheet.required")}
        </Switch.Content>
        <Description>{t("adviceQuestions.sheet.requiredHelp")}</Description>
      </Switch>

      {question && (
        <div className="flex flex-col gap-1 border-t border-separator pt-4">
          <Button
            className="w-fit"
            isDisabled={!canDelete}
            variant="tertiary"
            onPress={() => void remove()}
          >
            <TrashIcon aria-hidden size={18} />
            {t("adviceQuestions.sheet.delete")}
          </Button>
          {!canDelete && (
            <p className="text-sm text-muted">
              {t("adviceQuestions.sheet.lastQuestion")}
            </p>
          )}
        </div>
      )}
      {dialog}
    </SheetFrame>
  );
}
