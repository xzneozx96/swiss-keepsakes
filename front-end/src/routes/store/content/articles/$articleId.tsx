import type { Language } from "@/contexts/locale-context";

import { createFileRoute } from "@tanstack/react-router";

import { EmptyState } from "@/components/empty-state";
import { EditorFormSkeleton } from "@/components/layout/detail-skeletons";
import { ContentIcon } from "@/components/icons";
import { useLocale } from "@/contexts/locale-context";
import { ArticleEditor } from "@/features/content/merchant/components/article-editor";
import { useDemo } from "@/features/demo";
import { useSimulatedLoading } from "@/hooks/use-simulated-loading";

interface EditorSearch {
  /** Language of a new article; absent = the interface language. */
  lang?: Language;
}

// M17 article editor (step 4.12). `new` opens an empty draft that is stored on its first save.
export const Route = createFileRoute("/store/content/articles/$articleId")({
  validateSearch: (search: Record<string, unknown>): EditorSearch => ({
    lang:
      search.lang === "en" || search.lang === "de" ? search.lang : undefined,
  }),
  component: ArticleEditorPage,
});

function ArticleEditorPage() {
  const { articleId } = Route.useParams();
  const { lang } = Route.useSearch();
  const { t, language } = useLocale();
  const { state } = useDemo();
  const isLoading = useSimulatedLoading();
  const exists =
    articleId === "new" || state.data.articles.some((a) => a.id === articleId);

  if (isLoading) {
    return <EditorFormSkeleton cards={3} />;
  }

  if (!exists) {
    return (
      <EmptyState
        action={{ label: t("merchantArticles.back"), to: "/store/content" }}
        icon={ContentIcon}
        message={t("merchantArticles.notFound")}
      />
    );
  }

  // Keyed by article, so a save of a new article or a jump to the other version starts fresh.
  return (
    <ArticleEditor
      key={articleId}
      articleId={articleId}
      newLanguage={lang ?? language}
    />
  );
}
