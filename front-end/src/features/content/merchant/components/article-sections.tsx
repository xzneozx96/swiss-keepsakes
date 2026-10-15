import type { ArticleEditor } from "../hooks/use-article-editor";
import type { BlockType, FormBlock, FormSection } from "../lib/article-form";
import type { MessageKey } from "@/i18n/en";

import { Button, Dropdown, Label } from "@heroui/react";

import { parseYoutubeId } from "../lib/youtube";

import { Field, OrderActions, PickerField } from "./editor-fields";

import { PlusIcon, StatusDangerIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";

export type MediaTarget =
  | { kind: "cover" }
  | { kind: "image" | "audio"; sectionKey: string; blockKey: string };

const blockLabel: Record<BlockType, MessageKey> = {
  paragraph: "merchantArticles.block.paragraph",
  image: "merchantArticles.block.image",
  video: "merchantArticles.block.video",
  audio: "merchantArticles.block.audio",
};

const hasContent = (block: FormBlock) =>
  block.type === "paragraph"
    ? block.text.trim() !== ""
    : block.type === "image"
      ? !!block.photo || block.caption.trim() !== ""
      : block.type === "video"
        ? block.youtube.trim() !== "" || block.title.trim() !== ""
        : !!block.audio || block.title.trim() !== "";

/** One content block's fields: text, photo and caption, video link and title, or recording. */
function BlockFields({
  block,
  editor,
  sectionKey,
  onPick,
}: {
  block: FormBlock;
  editor: ArticleEditor;
  sectionKey: string;
  onPick: (target: MediaTarget) => void;
}) {
  const { t } = useLocale();
  const { errors, form } = editor;
  const lang = form.language;
  const set = (next: Partial<FormBlock>) =>
    editor.blocks.update(sectionKey, block.key, next);
  const error = (field: string) => errors[`${block.key}.${field}`];

  switch (block.type) {
    case "paragraph":
      return (
        <Field
          error={error("text")}
          label={t("merchantArticles.field.text")}
          lang={lang}
          rows={4}
          value={block.text}
          onChange={(text) => set({ text })}
        />
      );
    case "image":
      return (
        <>
          <PickerField
            changeLabel={t("merchantArticles.photo.change")}
            chooseLabel={t("merchantArticles.photo.choose")}
            emptyLabel={t("merchantArticles.photo.none")}
            error={error("photo")}
            label={t("merchantArticles.block.image")}
            photo={block.photo}
            onChoose={() =>
              onPick({ kind: "image", sectionKey, blockKey: block.key })
            }
          />
          <Field
            error={error("caption")}
            label={t("merchantArticles.field.caption")}
            lang={lang}
            value={block.caption}
            onChange={(caption) => set({ caption })}
          />
        </>
      );
    case "video": {
      const id = parseYoutubeId(block.youtube);

      return (
        <>
          <Field
            description={
              // A pasted link shows the id it found, so the merchant sees it worked.
              id && id !== block.youtube.trim()
                ? `${t("merchantArticles.field.youtubeHelp")} ID: ${id}`
                : t("merchantArticles.field.youtubeHelp")
            }
            error={error("youtube")}
            label={t("merchantArticles.field.youtube")}
            value={block.youtube}
            onChange={(youtube) => set({ youtube })}
          />
          <Field
            error={error("title")}
            label={t("merchantArticles.field.videoTitle")}
            lang={lang}
            value={block.title}
            onChange={(title) => set({ title })}
          />
          <Field
            label={t("merchantArticles.field.mediaCaption")}
            lang={lang}
            value={block.caption}
            onChange={(caption) => set({ caption })}
          />
        </>
      );
    }
    case "audio":
      return (
        <>
          <PickerField
            changeLabel={t("merchantArticles.audio.change")}
            chooseLabel={t("merchantArticles.audio.choose")}
            emptyLabel={t("merchantArticles.audio.none")}
            error={error("audio")}
            fileName={block.audio ? `${block.audio}.mp3` : undefined}
            label={t("merchantArticles.block.audio")}
            onChoose={() =>
              onPick({ kind: "audio", sectionKey, blockKey: block.key })
            }
          />
          <Field
            error={error("title")}
            label={t("merchantArticles.field.audioTitle")}
            lang={lang}
            value={block.title}
            onChange={(title) => set({ title })}
          />
          <Field
            label={t("merchantArticles.field.mediaCaption")}
            lang={lang}
            value={block.caption}
            onChange={(caption) => set({ caption })}
          />
        </>
      );
  }
}

/**
 * One section as an M04 card: the number tile, move and remove, the heading (a stop in the
 * C20 contents bar), then its blocks in reading order, each in an outlined inner card.
 */
function SectionCard({
  section,
  index,
  editor,
  onPick,
  onRemoveSection,
  onRemoveBlock,
}: {
  section: FormSection;
  index: number;
  editor: ArticleEditor;
  onPick: (target: MediaTarget) => void;
  onRemoveSection: (section: FormSection, n: number) => void;
  onRemoveBlock: (section: FormSection, block: FormBlock, name: string) => void;
}) {
  const { t } = useLocale();
  const { errors, form } = editor;
  const n = index + 1;
  const title = t("merchantArticles.section", { n });
  const blocksError = errors[`${section.key}.blocks`];

  return (
    <section
      aria-labelledby={`section-${section.key}`}
      className="flex flex-col gap-4 rounded-3xl bg-surface p-4 shadow-surface lg:p-5"
    >
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-secondary text-sm font-semibold text-muted tabular-nums">
          {n}
        </span>
        <h3
          className="min-w-0 flex-1 text-base font-semibold"
          id={`section-${section.key}`}
        >
          {title}
        </h3>
        <OrderActions
          count={form.sections.length}
          index={index}
          name={title}
          onMove={(by) => editor.sections.move(section.key, by)}
          onRemove={() => onRemoveSection(section, n)}
        />
      </div>
      <Field
        error={errors[`${section.key}.heading`]}
        label={t("merchantArticles.field.heading")}
        lang={form.language}
        value={section.heading}
        onChange={(heading) => editor.sections.update(section.key, { heading })}
      />
      {section.blocks.length > 0 && (
        <ol className="flex flex-col gap-3">
          {section.blocks.map((block, i) => {
            const name = t("merchantArticles.blockName", {
              block: t(blockLabel[block.type]),
              n,
            });

            return (
              <li
                key={block.key}
                className="flex flex-col gap-3 rounded-2xl border border-separator p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold">
                    {t(blockLabel[block.type])}
                  </span>
                  <OrderActions
                    count={section.blocks.length}
                    index={i}
                    name={name}
                    onMove={(by) =>
                      editor.blocks.move(section.key, block.key, by)
                    }
                    onRemove={() => onRemoveBlock(section, block, name)}
                  />
                </div>
                <BlockFields
                  block={block}
                  editor={editor}
                  sectionKey={section.key}
                  onPick={onPick}
                />
              </li>
            );
          })}
        </ol>
      )}
      {blocksError && (
        <p
          className="flex items-start gap-1.5 text-sm text-danger outline-none"
          data-error="true"
          tabIndex={-1}
        >
          <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {t(blocksError)}
        </p>
      )}
      <Dropdown>
        <Button
          aria-label={t("merchantArticles.addBlockTo", { n })}
          className="self-start"
          size="sm"
          variant="tertiary"
        >
          <PlusIcon aria-hidden size={16} />
          {t("merchantArticles.addBlock")}
        </Button>
        <Dropdown.Popover placement="bottom start">
          <Dropdown.Menu
            aria-label={t("merchantArticles.addBlockTo", { n })}
            onAction={(key) => editor.blocks.add(section.key, key as BlockType)}
          >
            {(Object.keys(blockLabel) as BlockType[]).map((type) => (
              <Dropdown.Item
                key={type}
                id={type}
                textValue={t(blockLabel[type])}
              >
                <Label>{t(blockLabel[type])}</Label>
              </Dropdown.Item>
            ))}
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </section>
  );
}

/**
 * The story body (R17): sections in reading order, each with a heading and blocks. Removing
 * a section or a block with content asks first, with the shared dialog (owner rule 13.10.2026).
 */
export function ArticleSections({
  editor,
  onPick,
  confirmRemove,
}: {
  editor: ArticleEditor;
  onPick: (target: MediaTarget) => void;
  confirmRemove: (options: {
    title: string;
    body: string;
    confirmLabel: string;
  }) => Promise<boolean>;
}) {
  const { t } = useLocale();
  const { form, errors } = editor;

  const removeSection = async (section: FormSection, n: number) => {
    const empty =
      section.heading.trim() === "" && !section.blocks.some(hasContent);

    if (
      empty ||
      (await confirmRemove({
        title: t("merchantArticles.removeSection.title", { n }),
        body: t("merchantArticles.removeSection.body"),
        confirmLabel: t("merchantArticles.removeSection.confirm"),
      }))
    )
      editor.sections.remove(section.key);
  };

  const removeBlock = async (
    section: FormSection,
    block: FormBlock,
    name: string,
  ) => {
    if (
      !hasContent(block) ||
      (await confirmRemove({
        title: t("merchantArticles.removeBlock.title", { block: name }),
        body: t("merchantArticles.removeBlock.body"),
        confirmLabel: t("merchantArticles.removeBlock.confirm"),
      }))
    )
      editor.blocks.remove(section.key, block.key);
  };

  return (
    <section aria-labelledby="m17-sections" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-base font-semibold" id="m17-sections">
          {t("merchantArticles.sections")}
        </h2>
        <p className="text-sm text-muted">
          {t("merchantArticles.sectionsHelp")}
        </p>
      </div>
      {form.sections.map((section, index) => (
        <SectionCard
          key={section.key}
          editor={editor}
          index={index}
          section={section}
          onPick={onPick}
          onRemoveBlock={(s, b, name) => void removeBlock(s, b, name)}
          onRemoveSection={(s, n) => void removeSection(s, n)}
        />
      ))}
      {errors.sections && (
        <p
          className="flex items-start gap-1.5 px-1 text-sm text-danger outline-none"
          data-error="true"
          tabIndex={-1}
        >
          <StatusDangerIcon aria-hidden className="mt-0.5 shrink-0" size={16} />
          {t(errors.sections)}
        </p>
      )}
      <Button
        className="self-start"
        variant="tertiary"
        onPress={editor.sections.add}
      >
        <PlusIcon aria-hidden size={16} />
        {t("merchantArticles.addSection")}
      </Button>
    </section>
  );
}
