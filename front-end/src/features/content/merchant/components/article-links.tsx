import type {
  ArticleEditor,
  LinkOption,
  StoryOption,
} from "../hooks/use-article-editor";

import { Button } from "@heroui/react";

import { OrderActions } from "./editor-fields";

import {
  ExploreIcon,
  GiftIcon,
  PlusIcon,
  SelectedIcon,
} from "@/components/icons";
import { InfoNote } from "@/components/info-note";
import { Media } from "@/components/media";
import { StatusChip } from "@/components/status-chip";
import { useLocale } from "@/contexts/locale-context";
import { DetailCard } from "@/features/merchant/order-detail/components/detail-card";
import { SheetFrame } from "@/features/merchant/order-detail/components/decision-block";

const count = "text-sm text-muted tabular-nums";

function ItemLine({
  photo,
  name,
  meta,
  lang,
}: {
  photo?: string;
  name: string;
  meta: string;
  lang?: string;
}) {
  return (
    <>
      <Media alt="" className="size-12 shrink-0 rounded-lg" photo={photo} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span
          className="text-sm leading-snug font-semibold [overflow-wrap:anywhere]"
          lang={lang}
        >
          {name}
        </span>
        <span className="text-xs text-muted">{meta}</span>
      </div>
    </>
  );
}

/**
 * Gifts and tours linked from this language version (R16, AC31): the shop's order, at most 6,
 * only published ones can be added. A link whose item was unpublished later stays listed with
 * a warning (C20 hides it); a sold-out gift shows as sold out on C20, so it says so here too.
 */
export function LinksCard({
  editor,
  onAdd,
}: {
  editor: ArticleEditor;
  onAdd: () => void;
}) {
  const { t } = useLocale();
  const { links, form } = editor;
  const kind = (option: LinkOption) =>
    t(
      option.link.kind === "tour"
        ? "merchantArticles.kind.tour"
        : "merchantArticles.kind.gift",
    );

  return (
    <DetailCard
      icon={GiftIcon}
      id="m17-links"
      title={t("merchantArticles.links")}
      trailing={
        <span className={count}>
          {t("merchantArticles.links.count", { count: form.links.length })}
        </span>
      }
    >
      <p className="text-sm text-muted">{t("merchantArticles.links.help")}</p>
      {links.items.length === 0 ? (
        <p className="text-sm">{t("merchantArticles.links.empty")}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-separator">
          {links.items.map((option, i) => (
            <li
              key={`${option.link.kind}-${option.link.id}`}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-center text-sm font-semibold text-muted tabular-nums">
                  {i + 1}
                </span>
                <ItemLine
                  lang={form.language}
                  meta={kind(option)}
                  name={option.name}
                  photo={option.photo}
                />
              </div>
              {/* Chips and the order controls share a line, so names keep their width. */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 ps-7 [&_svg]:shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {option.hidden && (
                    <StatusChip tone="warning">
                      {t("merchantArticles.links.unpublished")}
                    </StatusChip>
                  )}
                  {option.soldOut && !option.hidden && (
                    <StatusChip tone="neutral">
                      {t("merchantArticles.links.soldOut")}
                    </StatusChip>
                  )}
                </div>
                <div className="ms-auto">
                  <OrderActions
                    count={links.items.length}
                    index={i}
                    name={option.name}
                    onMove={(by) => links.move(i, by)}
                    onRemove={() => links.remove(i)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {links.isFull && <InfoNote text={t("merchantArticles.links.limit")} />}
      <Button
        className="self-start"
        isDisabled={links.isFull}
        size="sm"
        variant="tertiary"
        onPress={onAdd}
      >
        <PlusIcon aria-hidden size={16} />
        {t("merchantArticles.links.add")}
      </Button>
    </DetailCard>
  );
}

/** "More to discover" (R18, AC33): up to 3 published stories in this language, in order. */
export function RelatedCard({
  editor,
  languageName,
  onAdd,
}: {
  editor: ArticleEditor;
  languageName: string;
  onAdd: () => void;
}) {
  const { t } = useLocale();
  const { related, form } = editor;

  return (
    <DetailCard
      icon={ExploreIcon}
      id="m17-related"
      title={t("merchantArticles.related.title")}
      trailing={
        <span className={count}>
          {t("merchantArticles.related.count", { count: form.related.length })}
        </span>
      }
    >
      <p className="text-sm text-muted">
        {t("merchantArticles.related.help", { language: languageName })}
      </p>
      {related.items.length === 0 ? (
        <p className="text-sm">
          {t("merchantArticles.related.empty", { language: languageName })}
        </p>
      ) : (
        <ol className="flex flex-col divide-y divide-separator">
          {related.items.map((story, i) => (
            <li
              key={story.slug}
              className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-center text-sm font-semibold text-muted tabular-nums">
                  {i + 1}
                </span>
                <ItemLine
                  lang={form.language}
                  meta={t("merchantArticles.readTime", {
                    minutes: story.readMinutes,
                  })}
                  name={story.title}
                  photo={story.photo}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1.5 ps-7 [&_svg]:shrink-0">
                <div className="flex flex-wrap gap-1.5">
                  {story.hidden && (
                    <StatusChip tone="warning">
                      {t("merchantArticles.links.unpublished")}
                    </StatusChip>
                  )}
                </div>
                <div className="ms-auto">
                  <OrderActions
                    count={related.items.length}
                    index={i}
                    name={story.title}
                    onMove={(by) => related.move(i, by)}
                    onRemove={() => related.remove(i)}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {related.isFull && (
        <InfoNote text={t("merchantArticles.related.limit")} />
      )}
      <Button
        className="self-start"
        isDisabled={related.isFull}
        size="sm"
        variant="tertiary"
        onPress={onAdd}
      >
        <PlusIcon aria-hidden size={16} />
        {t("merchantArticles.related.add")}
      </Button>
    </DetailCard>
  );
}

function AddRow({
  name,
  isAdded,
  isDisabled,
  onAdd,
  children,
}: {
  name: string;
  isAdded: boolean;
  isDisabled: boolean;
  onAdd: () => void;
  children: React.ReactNode;
}) {
  const { t } = useLocale();

  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      {children}
      {isAdded ? (
        <span className="flex shrink-0 items-center gap-1 text-sm text-muted">
          <SelectedIcon aria-hidden size={16} weight="Filled" />
          {t("merchantArticles.linkSheet.added")}
        </span>
      ) : (
        <Button
          aria-label={t("merchantArticles.linkSheet.addItem", { name })}
          className="shrink-0"
          isDisabled={isDisabled}
          size="sm"
          variant="tertiary"
          onPress={onAdd}
        >
          {t("merchantArticles.linkSheet.add")}
        </Button>
      )}
    </li>
  );
}

/** Published gifts and tours to link; the sheet stays open so several can be added in order. */
export function LinkSheet({
  editor,
  onClose,
}: {
  editor: ArticleEditor;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { links, form } = editor;
  const groups = [
    { kind: "gift", title: t("merchantArticles.linkSheet.gifts") },
    { kind: "tour", title: t("merchantArticles.linkSheet.tours") },
  ] as const;

  return (
    <SheetFrame
      isOpen
      footer={
        <Button fullWidth onPress={onClose}>
          {t("merchantArticles.linkSheet.done")}
        </Button>
      }
      title={t("merchantArticles.linkSheet.title")}
      onClose={onClose}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">
          {t("merchantArticles.linkSheet.note")}
        </p>
        <span className={`${count} shrink-0`}>
          {t("merchantArticles.links.count", { count: form.links.length })}
        </span>
      </div>
      {links.isFull && <InfoNote text={t("merchantArticles.links.limit")} />}
      {groups.map((group) => (
        <section key={group.kind} className="flex flex-col gap-3">
          <h3 className="text-heading">{group.title}</h3>
          <ul className="flex flex-col divide-y divide-separator">
            {links.candidates
              .filter((c) => c.link.kind === group.kind)
              .map((option) => (
                <AddRow
                  key={option.link.id}
                  isAdded={links.has(option.link)}
                  isDisabled={links.isFull}
                  name={option.name}
                  onAdd={() => links.add(option.link)}
                >
                  <ItemLine
                    lang={form.language}
                    meta={
                      option.soldOut
                        ? t("merchantArticles.links.soldOut")
                        : t(`merchantArticles.kind.${group.kind}`)
                    }
                    name={option.name}
                    photo={option.photo}
                  />
                </AddRow>
              ))}
          </ul>
        </section>
      ))}
    </SheetFrame>
  );
}

/** Published stories in the same language for "More to discover", never this story. */
export function StorySheet({
  editor,
  languageName,
  onClose,
}: {
  editor: ArticleEditor;
  languageName: string;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { related, form } = editor;
  const toMeta = (story: StoryOption) =>
    t("merchantArticles.readTime", { minutes: story.readMinutes });

  return (
    <SheetFrame
      isOpen
      footer={
        <Button fullWidth onPress={onClose}>
          {t("merchantArticles.linkSheet.done")}
        </Button>
      }
      title={t("merchantArticles.relatedSheet.title")}
      onClose={onClose}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted">
          {t("merchantArticles.related.help", { language: languageName })}
        </p>
        <span className={`${count} shrink-0`}>
          {t("merchantArticles.related.count", { count: form.related.length })}
        </span>
      </div>
      {related.isFull && (
        <InfoNote text={t("merchantArticles.related.limit")} />
      )}
      {related.candidates.length === 0 ? (
        <p className="text-sm">
          {t("merchantArticles.relatedSheet.none", { language: languageName })}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-separator">
          {related.candidates.map((story) => (
            <AddRow
              key={story.slug}
              isAdded={form.related.includes(story.slug)}
              isDisabled={related.isFull}
              name={story.title}
              onAdd={() => related.add(story.slug)}
            >
              <ItemLine
                lang={form.language}
                meta={toMeta(story)}
                name={story.title}
                photo={story.photo}
              />
            </AddRow>
          ))}
        </ul>
      )}
    </SheetFrame>
  );
}
