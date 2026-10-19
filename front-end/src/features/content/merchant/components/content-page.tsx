import type { CommentAction } from "./comment-rows";
import type {
  CommentFilter,
  CommentRowProps,
} from "../hooks/use-merchant-comments";
import type {
  ReviewFilter,
  ReviewRowProps,
} from "../hooks/use-merchant-reviews";
import type { Language } from "@/contexts/locale-context";
import type { MessageKey } from "@/i18n/en";
import type { ArticleFilter } from "@/features/content/merchant/lib/search-params";

import { buttonVariants, toast } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useMerchantArticles } from "../hooks/use-merchant-articles";
import { useMerchantComments } from "../hooks/use-merchant-comments";
import { useMerchantReviews } from "../hooks/use-merchant-reviews";

import { ArticleRows } from "./article-rows";
import { CommentRows } from "./comment-rows";
import { ReplySheet } from "./reply-sheet";
import { ReviewRows } from "./review-rows";

import { useConfirm } from "@/components/confirm-dialog";
import { MerchantPageHeader } from "@/components/layout/merchant-page-header";
import {
  FilterToolbar,
  filterGroup,
  selectedLabels,
} from "@/components/filter-bar";
import {
  ContentIcon,
  MessageIcon,
  PlusIcon,
  RatingIcon,
} from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

export type ContentTab = "articles" | "comments" | "reviews";

/** The page's one filter: its options with counts, any number ticked, as on M15. */
function Filters<Id extends string>({
  filters,
  selected,
  onChange,
}: {
  filters: { id: Id; label: string; count: number }[];
  selected: Id[];
  onChange: (ids: Id[]) => void;
}) {
  const { t } = useLocale();

  return (
    <FilterToolbar
      groups={[
        filterGroup({
          id: "filter",
          label: t("merchantContent.filtersLabel"),
          options: filters,
          selected,
          onChange,
        }),
      ]}
    />
  );
}

/** The empty-list wording of the one filter ticked, else of the whole list. */
const emptyKey = (prefix: string, filter: string[]) =>
  `${prefix}.${filter.length === 1 ? filter[0] : "all"}` as MessageKey;

/** M17 list: every language version, filtered by language (spec §3.2 "by language"). */
function ArticlesPanel({
  filter,
  onFilterChange,
  isLoading,
}: {
  filter: ArticleFilter[];
  onFilterChange: (filter: ArticleFilter[]) => void;
  isLoading: boolean;
}) {
  const { t } = useLocale();
  const { rows, filters, total } = useMerchantArticles(filter);
  const allLabel = t("merchantArticles.filter.all");
  const selectedLabel = selectedLabels(filters, filter, allLabel);
  const emptyState = {
    icon: ContentIcon,
    message: t(
      total === 0
        ? "merchantArticles.empty.all"
        : emptyKey("merchantArticles.empty", filter),
    ),
  };

  return (
    <>
      <Filters filters={filters} selected={filter} onChange={onFilterChange} />
      <ArticleRows
        empty={emptyState}
        isLoading={isLoading}
        label={selectedLabel}
        resetKey={selectedLabel}
        rows={rows}
      />
    </>
  );
}

/** M18: hide, show again, delete through the shared dialog, and reply as the shop. */
function CommentsPanel({ isLoading }: { isLoading: boolean }) {
  const { t, intlLocale } = useLocale();
  const [filter, setFilter] = useState<CommentFilter[]>([]);
  const comments = useMerchantComments(filter);
  const { confirm, dialog } = useConfirm();
  const [replyTo, setReplyTo] = useState<CommentRowProps | null>(null);
  const allLabel = t("merchantComments.filter.all");
  const selectedLabel = selectedLabels(comments.filters, filter, allLabel);

  const onAction = async (row: CommentRowProps, action: CommentAction) => {
    if (action === "reply") {
      setReplyTo(row);

      return;
    }
    if (action === "hide" || action === "show") {
      comments.setHidden(row.id, action === "hide");
      toast.success(
        t(
          action === "hide"
            ? "merchantComments.hiddenToast"
            : "merchantComments.shownToast",
        ),
      );

      return;
    }
    const ok = await confirm({
      title: t("merchantComments.delete.title", { name: row.authorName }),
      body:
        row.canReply && row.replies > 0
          ? t(
              new Intl.PluralRules(intlLocale).select(row.replies) === "one"
                ? "merchantComments.delete.bodyReplies.one"
                : "merchantComments.delete.bodyReplies.other",
              { count: row.replies },
            )
          : t("merchantComments.delete.body"),
      confirmLabel: t("merchantComments.delete.confirm"),
    });

    if (!ok) return;
    comments.remove(row.id);
    toast.success(t("merchantComments.deletedToast"));
  };

  const emptyState = {
    icon: MessageIcon,
    message: t(
      comments.total === 0
        ? "merchantComments.empty.all"
        : emptyKey("merchantComments.empty", filter),
    ),
  };

  return (
    <>
      <Filters
        filters={comments.filters}
        selected={filter}
        onChange={setFilter}
      />
      <CommentRows
        empty={emptyState}
        isLoading={isLoading}
        label={selectedLabel}
        resetKey={selectedLabel}
        rows={comments.rows}
        onAction={(row, action) => void onAction(row, action)}
      />
      {replyTo && (
        <ReplySheet
          help={t("merchantComments.sheet.help", { name: comments.staffName })}
          quote={replyTo.text}
          quoteLanguage={replyTo.article.language}
          submitLabel={t("merchantComments.sheet.post")}
          title={t("merchantComments.replyTo", { name: replyTo.authorName })}
          onClose={() => setReplyTo(null)}
          onSubmit={(text) => {
            comments.reply(replyTo.id, text);
            setReplyTo(null);
            toast.success(t("merchantComments.postedToast"));
          }}
        />
      )}
      {dialog}
    </>
  );
}

/** M23: reply or edit the reply; reviews are never deleted (AC17). */
function ReviewsPanel({ isLoading }: { isLoading: boolean }) {
  const { t } = useLocale();
  const [filter, setFilter] = useState<ReviewFilter[]>([]);
  const reviews = useMerchantReviews(filter);
  const [replyTo, setReplyTo] = useState<ReviewRowProps | null>(null);
  const allLabel = t("merchantReviews.filter.all");
  const selectedLabel = selectedLabels(reviews.filters, filter, allLabel);
  const emptyState = {
    icon: RatingIcon,
    message: t(
      reviews.total === 0
        ? "merchantReviews.empty.all"
        : emptyKey("merchantReviews.empty", filter),
    ),
  };

  return (
    <>
      <Filters
        filters={reviews.filters}
        selected={filter}
        onChange={setFilter}
      />
      <p className="text-sm text-muted">{t("merchantReviews.rule")}</p>
      <ReviewRows
        empty={emptyState}
        isLoading={isLoading}
        label={selectedLabel}
        resetKey={selectedLabel}
        rows={reviews.rows}
        onReply={setReplyTo}
      />
      {replyTo && (
        <ReplySheet
          help={t("merchantReviews.sheet.help", { name: reviews.staffName })}
          initialText={replyTo.reply?.text}
          language={replyTo.reply?.language ?? replyTo.replyLanguage}
          quote={replyTo.text}
          quoteLanguage={replyTo.textLanguage}
          submitLabel={t(
            replyTo.reply
              ? "merchantReviews.sheet.save"
              : "merchantReviews.sheet.post",
          )}
          title={t(
            replyTo.reply
              ? "merchantReviews.sheet.titleEdit"
              : "merchantReviews.sheet.titleNew",
            { name: replyTo.guestName },
          )}
          onClose={() => setReplyTo(null)}
          onSubmit={(text, language?: Language) => {
            reviews.saveReply(
              replyTo.id,
              text,
              language ?? replyTo.replyLanguage,
            );
            setReplyTo(null);
            toast.success(
              t(
                replyTo.reply
                  ? "merchantReviews.savedToast"
                  : "merchantReviews.postedToast",
              ),
            );
          }}
        />
      )}
    </>
  );
}

/**
 * Content (spec §3.2): Articles (M17), Comments (M18) and Reviews (M23), each its own page
 * under Content (/store/content, /comments, /reviews). Each has M15's filter, phone cards
 * and, from 1024px, a table.
 */
export function ContentPage({
  tab,
  articleFilter,
  onArticleFilterChange,
}: {
  tab: ContentTab;
  articleFilter: ArticleFilter[];
  onArticleFilterChange: (filter: ArticleFilter[]) => void;
}) {
  const { t } = useLocale();
  const isLoading = useSimulatedLoading();

  return (
    <div className="flex flex-col gap-4">
      <MerchantPageHeader
        action={
          tab === "articles" && (
            <Link
              className={`${buttonVariants({ size: "sm" })} shrink-0`}
              params={{ articleId: "new" }}
              search={
                articleFilter.length === 1 ? { lang: articleFilter[0] } : {}
              }
              to="/store/content/articles/$articleId"
            >
              <PlusIcon aria-hidden size={16} />
              {t("merchantArticles.new")}
            </Link>
          )
        }
        description={t("merchantContent.intro")}
        title={t(`merchantContent.tab.${tab}`)}
      />
      {tab === "articles" && (
        <ArticlesPanel
          filter={articleFilter}
          isLoading={isLoading}
          onFilterChange={onArticleFilterChange}
        />
      )}
      {tab === "comments" && <CommentsPanel isLoading={isLoading} />}
      {tab === "reviews" && <ReviewsPanel isLoading={isLoading} />}
    </div>
  );
}
