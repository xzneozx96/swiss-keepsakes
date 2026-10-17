import type { MediaTarget } from "./article-sections";
import type { ArticleEditor as Editor } from "../hooks/use-article-editor";
import type { Language } from "@/contexts/locale-context";
import type { StoryCategory } from "../../types";

import {
  Button,
  Description,
  Label,
  Radio,
  RadioGroup,
  buttonVariants,
  toast,
} from "@heroui/react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";

import { STORY_CATEGORIES } from "../../types";
import { useArticleEditor } from "../hooks/use-article-editor";

import { LinkSheet, LinksCard, RelatedCard, StorySheet } from "./article-links";
import { ArticleSections } from "./article-sections";
import { ERROR_SELECTOR, Field, PickerField } from "./editor-fields";
import { AudioSheet, PhotoSheet } from "./media-sheets";

import { useConfirm } from "@/components/confirm-dialog";
import {
  BackIcon,
  ContentIcon,
  LanguageIcon,
  StatusSuccessIcon,
} from "@/components/icons";
import { MerchantBackBar } from "@/components/layout/merchant-back-bar";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import {
  ActionPanel,
  DetailCard,
} from "@/features/merchant/order-detail/components/detail-card";
import { useIsWide } from "@/features/merchant/order-detail/hooks/use-is-wide";
import { formatDate } from "@/lib/format";

/** Same choice card as M08, M15 and the M04 sheets: ink frame when selected. */
const choiceCard =
  "rounded-2xl border border-separator p-3 data-[selected=true]:border-foreground data-[selected=true]:ring-1 data-[selected=true]:ring-foreground";

type Status = "new" | "draft" | "published";

function Header({ editor, status }: { editor: Editor; status: Status }) {
  const { t } = useLocale();
  const { form, stored } = editor;

  return (
    <header className="flex flex-col gap-3">
      <MerchantBackBar
        label={t("merchantArticles.back")}
        title={stored?.title || t("merchantArticles.newTitle")}
        to="/store/content"
      />
      <Link
        className="hidden w-fit items-center gap-1.5 rounded-lg text-sm text-muted outline-none hover:text-foreground focus-visible:focus-ring lg:flex"
        to="/store/content"
      >
        <BackIcon aria-hidden size={16} />
        {t("merchantArticles.back")}
      </Link>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            className="text-title text-pretty [overflow-wrap:anywhere] max-lg:sr-only"
            lang={stored ? form.language : undefined}
          >
            {stored?.title || t("merchantArticles.newTitle")}
          </h1>
          <p className="text-sm text-muted">
            {t(`merchantContent.lang.${form.language}`)}
            {stored &&
              ` · ${stored.author.name} · ${t("merchantArticles.readTime", {
                minutes: stored.readMinutes,
              })}`}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2 lg:justify-end [&_svg]:shrink-0">
          <StatusChip tone={status === "published" ? "success" : "neutral"}>
            {t(
              status === "published"
                ? "merchantArticles.status.published"
                : "merchantArticles.status.draft",
            )}
          </StatusChip>
          {stored && !editor.otherVersion && (
            <StatusChip tone="neutral">
              {t(`merchantArticles.missing.${editor.otherLanguage}`)}
            </StatusChip>
          )}
        </div>
      </div>
    </header>
  );
}

/** Save draft and Publish, or Save changes and Unpublish: one red action at a time. */
function Actions({
  status,
  dirty,
  onPublish,
  onSaveDraft,
  onSaveChanges,
  onUnpublish,
}: {
  status: Status;
  dirty: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
  onSaveChanges: () => void;
  onUnpublish: () => void;
}) {
  const { t } = useLocale();

  return status === "published" ? (
    <div className="flex flex-col gap-2">
      <Button fullWidth isDisabled={!dirty} onPress={onSaveChanges}>
        {t("merchantArticles.action.save")}
      </Button>
      <Button fullWidth variant="tertiary" onPress={onUnpublish}>
        {t("merchantArticles.action.unpublish")}
      </Button>
    </div>
  ) : (
    <div className="flex flex-col gap-2">
      <Button fullWidth onPress={onPublish}>
        {t("merchantArticles.action.publish")}
      </Button>
      <Button fullWidth variant="tertiary" onPress={onSaveDraft}>
        {t("merchantArticles.action.saveDraft")}
      </Button>
    </div>
  );
}

function SaveNotes({ editor }: { editor: Editor }) {
  const { t, intlLocale } = useLocale();
  const { attempt, errorCount, dirty } = editor;

  return (
    <>
      {dirty && (
        <p className="flex items-center gap-2 text-sm font-medium text-warning">
          <span
            aria-hidden
            className="size-1.5 shrink-0 rounded-full bg-current"
          />
          {t("merchantArticles.unsaved")}
        </p>
      )}
      {attempt && errorCount > 0 && (
        <p className="text-sm text-danger" role="alert">
          {attempt === "draft"
            ? t("merchantArticles.errors.save")
            : t(
                new Intl.PluralRules(intlLocale).select(errorCount) === "one"
                  ? "merchantArticles.errors.publish.one"
                  : "merchantArticles.errors.publish.other",
                { count: errorCount },
              )}
        </p>
      )}
    </>
  );
}

/** Title, summary, lead, byline and cover: what C19 and the C20 cover show. */
function DetailsCard({
  editor,
  onPickCover,
}: {
  editor: Editor;
  onPickCover: () => void;
}) {
  const { t } = useLocale();
  const { form, errors, patch, isNew } = editor;
  const lang = form.language;

  return (
    <DetailCard
      icon={ContentIcon}
      id="m17-details"
      title={t("merchantArticles.details")}
    >
      {isNew && (
        <RadioGroup
          value={form.language}
          onChange={(v) => editor.setLanguage(v as Language)}
        >
          <Label>{t("merchantArticles.language")}</Label>
          <Description>{t("merchantArticles.languageHelp")}</Description>
          <div className="grid grid-cols-2 gap-2">
            {(["en", "de"] as const).map((l) => (
              <Radio key={l} className={choiceCard} value={l}>
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  {t(`merchantContent.lang.${l}`)}
                </Radio.Content>
              </Radio>
            ))}
          </div>
        </RadioGroup>
      )}
      <Field
        error={errors.title}
        label={t("merchantArticles.field.title")}
        lang={lang}
        value={form.title}
        onChange={(title) => patch({ title })}
      />
      <Field
        description={t("merchantArticles.field.excerptHelp")}
        error={errors.excerpt}
        label={t("merchantArticles.field.excerpt")}
        lang={lang}
        rows={2}
        value={form.excerpt}
        onChange={(excerpt) => patch({ excerpt })}
      />
      <Field
        description={t("merchantArticles.field.introHelp")}
        error={errors.intro}
        label={t("merchantArticles.field.intro")}
        lang={lang}
        rows={4}
        value={form.intro}
        onChange={(intro) => patch({ intro })}
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">
          {t("merchantArticles.author")}
        </legend>
        <p className="-mt-1 text-sm text-muted">
          {t("merchantArticles.author.help")}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            error={errors["author.name"]}
            label={t("merchantArticles.field.authorName")}
            value={form.author.name}
            onChange={(name) => patch({ author: { ...form.author, name } })}
          />
          <Field
            error={errors["author.role"]}
            label={t("merchantArticles.field.authorRole")}
            lang={lang}
            value={form.author.role}
            onChange={(role) => patch({ author: { ...form.author, role } })}
          />
        </div>
      </fieldset>
      <PickerField
        changeLabel={t("merchantArticles.photo.change")}
        chooseLabel={t("merchantArticles.photo.choose")}
        emptyLabel={t("merchantArticles.photo.none")}
        error={errors.photo}
        label={t("merchantArticles.cover")}
        photo={form.photo}
        onChoose={onPickCover}
      />
      <RadioGroup
        value={form.category}
        onChange={(v) => patch({ category: v as StoryCategory })}
      >
        <Label>{t("merchantArticles.category")}</Label>
        <Description>{t("merchantArticles.categoryHelp")}</Description>
        <div className="grid grid-cols-2 gap-2">
          {STORY_CATEGORIES.map((category) => (
            <Radio key={category} className={choiceCard} value={category}>
              <Radio.Content>
                <Radio.Control>
                  <Radio.Indicator />
                </Radio.Control>
                {t(`stories.category.${category}`)}
              </Radio.Content>
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <Field
        description={t("merchantArticles.field.placeHelp")}
        error={errors.place}
        label={t("merchantArticles.field.place")}
        lang={lang}
        value={form.place}
        onChange={(place) => patch({ place })}
      />
    </DetailCard>
  );
}

/** The other language version: open it, or start it as a draft copy (R02, side path "DE missing"). */
function VersionCard({ editor, onAdd }: { editor: Editor; onAdd: () => void }) {
  const { t } = useLocale();
  const { otherVersion, otherLanguage } = editor;

  return (
    <DetailCard
      icon={LanguageIcon}
      id="m17-version"
      title={t("merchantArticles.version.title")}
    >
      {otherVersion ? (
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-2 [&_svg]:shrink-0">
            <span className="text-sm font-semibold" lang={otherLanguage}>
              {otherVersion.title}
            </span>
            <StatusChip
              tone={
                otherVersion.publication.status === "published"
                  ? "success"
                  : "neutral"
              }
            >
              {t(
                otherVersion.publication.status === "published"
                  ? "merchantArticles.status.published"
                  : "merchantArticles.status.draft",
              )}
            </StatusChip>
          </div>
          <Link
            className={buttonVariants({ size: "sm", variant: "tertiary" })}
            params={{ articleId: otherVersion.id }}
            to="/store/content/articles/$articleId"
          >
            {t(`merchantArticles.version.open.${otherLanguage}`)}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm">
            {t(`merchantArticles.version.missing.${otherLanguage}`)}
          </p>
          <Button size="sm" variant="tertiary" onPress={onAdd}>
            {t(`merchantArticles.version.add.${otherLanguage}`)}
          </Button>
          <p className="text-xs text-muted">
            {t("merchantArticles.version.addHelp")}
          </p>
        </div>
      )}
    </DetailCard>
  );
}

/**
 * M17 article editor (spec §4.11, R16–R18; outline step 12): the M04 frame with the
 * publication panel first, then details, sections, linked gifts and tours, "More to
 * discover" and the other language version. From 1024px the work sits on the left and the
 * panel, links and stories in a 320px column on the right. Nothing is stored until a save.
 */
export function ArticleEditor({
  articleId,
  newLanguage,
}: {
  articleId: string;
  newLanguage: Language;
}) {
  const { t, intlLocale } = useLocale();
  const editor = useArticleEditor(articleId, newLanguage);
  const navigate = useNavigate();
  const isWide = useIsWide();
  const { confirm, dialog } = useConfirm();
  const rootRef = useRef<HTMLDivElement>(null);
  const [media, setMedia] = useState<MediaTarget | null>(null);
  const [sheet, setSheet] = useState<"links" | "stories" | null>(null);

  const { form, stored } = editor;
  const status: Status = !stored
    ? "new"
    : editor.publishedAt
      ? "published"
      : "draft";
  const languageName = t(`merchantContent.lang.${form.language}`);

  const focusFirstError = () =>
    requestAnimationFrame(() => {
      const el = rootRef.current?.querySelector<HTMLElement>(ERROR_SELECTOR);
      const target = el?.matches("input, textarea, [tabindex]")
        ? el
        : (el?.querySelector<HTMLElement>("button") ?? el);

      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    });

  const openSaved = (id: string) => {
    if (id !== articleId)
      void navigate({
        to: "/store/content/articles/$articleId",
        params: { articleId: id },
        replace: true,
      });
  };

  const onSaveDraft = () => {
    const id = editor.save("draft");

    if (!id) return focusFirstError();
    toast.success(t("merchantArticles.toast.saved"));
    openSaved(id);
  };
  const onPublish = () => {
    const id = editor.publish();

    if (!id) return focusFirstError();
    toast.success(
      t("merchantArticles.toast.published", { language: languageName }),
    );
    openSaved(id);
  };
  const onSaveChanges = () => {
    if (!editor.save("publish")) return focusFirstError();
    toast.success(t("merchantArticles.toast.savedPublished"));
  };
  const onUnpublish = async () => {
    const ok = await confirm({
      title: t("merchantArticles.unpublish.title", {
        title: stored?.title ?? "",
      }),
      body: t("merchantArticles.unpublish.body"),
      confirmLabel: t("merchantArticles.action.unpublish"),
    });

    if (!ok) return;
    if (!editor.unpublish()) return focusFirstError();
    toast.success(t("merchantArticles.toast.unpublished"));
  };
  const onAddVersion = () => {
    const id = editor.addOtherVersion();

    if (!id) return;
    toast.success(
      t(`merchantArticles.toast.versionAdded.${editor.otherLanguage}`),
    );
    void navigate({
      to: "/store/content/articles/$articleId",
      params: { articleId: id },
    });
  };

  const actions = (
    <Actions
      dirty={editor.dirty}
      status={status}
      onPublish={onPublish}
      onSaveChanges={onSaveChanges}
      onSaveDraft={onSaveDraft}
      onUnpublish={() => void onUnpublish()}
    />
  );

  const panel = (
    <ActionPanel
      eyebrow={t("merchantArticles.publication.eyebrow")}
      icon={status === "published" ? StatusSuccessIcon : ContentIcon}
      title={
        status === "published"
          ? t("merchantArticles.publication.published", {
              language: languageName,
            })
          : status === "draft"
            ? t("merchantArticles.publication.draft")
            : t("merchantArticles.publication.new")
      }
      tone={status === "published" ? "success" : "neutral"}
    >
      <p className="text-sm text-pretty text-muted">
        {editor.publishedAt
          ? t("merchantArticles.publication.publishedBody", {
              language: languageName,
              date: formatDate(new Date(editor.publishedAt), intlLocale),
            })
          : t("merchantArticles.publication.draftBody", {
              language: languageName,
            })}
      </p>
      <SaveNotes editor={editor} />
      {actions}
    </ActionPanel>
  );

  const side = (
    <>
      <LinksCard editor={editor} onAdd={() => setSheet("links")} />
      <RelatedCard
        editor={editor}
        languageName={languageName}
        onAdd={() => setSheet("stories")}
      />
      {stored && <VersionCard editor={editor} onAdd={onAddVersion} />}
    </>
  );

  const mediaValue =
    media?.kind === "cover"
      ? form.photo
      : media
        ? (() => {
            const block = form.sections
              .find((s) => s.key === media.sectionKey)
              ?.blocks.find((b) => b.key === media.blockKey);

            return block?.type === "image"
              ? block.photo
              : block?.type === "audio"
                ? block.audio
                : "";
          })()
        : "";
  const chooseMedia = (value: string) => {
    if (media?.kind === "cover") editor.patch({ photo: value });
    else if (media?.kind === "image")
      editor.blocks.update(media.sectionKey, media.blockKey, { photo: value });
    else if (media?.kind === "audio")
      editor.blocks.update(media.sectionKey, media.blockKey, { audio: value });
    setMedia(null);
  };

  return (
    <div ref={rootRef} className="flex flex-col gap-5 lg:gap-6">
      <Header editor={editor} status={status} />
      <div
        className={
          isWide
            ? "grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6"
            : "flex flex-col gap-5"
        }
      >
        <div className="flex min-w-0 flex-col gap-5 lg:gap-6">
          {!isWide && panel}
          <DetailsCard
            editor={editor}
            onPickCover={() => setMedia({ kind: "cover" })}
          />
          <ArticleSections
            confirmRemove={confirm}
            editor={editor}
            onPick={setMedia}
          />
          {!isWide && (
            <>
              {side}
              <div className="flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface">
                <SaveNotes editor={editor} />
                {actions}
              </div>
            </>
          )}
        </div>
        {isWide && (
          <div className="flex min-w-0 flex-col gap-6">
            {panel}
            {side}
          </div>
        )}
      </div>

      {media &&
        (media.kind === "audio" ? (
          <AudioSheet
            value={mediaValue}
            onChoose={chooseMedia}
            onClose={() => setMedia(null)}
          />
        ) : (
          <PhotoSheet
            value={mediaValue}
            onChoose={chooseMedia}
            onClose={() => setMedia(null)}
          />
        ))}
      {sheet === "links" && (
        <LinkSheet editor={editor} onClose={() => setSheet(null)} />
      )}
      {sheet === "stories" && (
        <StorySheet
          editor={editor}
          languageName={languageName}
          onClose={() => setSheet(null)}
        />
      )}
      {dialog}
    </div>
  );
}
