import type { RowAction } from "@/components/row-actions";
import type { Subcategory } from "@/features/catalog/types";

import { Button, toast } from "@heroui/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { useSubcategories } from "../hooks/use-subcategories";

import { SubcategorySheet } from "./subcategory-sheet";

import { useConfirm } from "@/components/confirm-dialog";
import {
  ChevronDownIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/icons";
import { MerchantPageHeader } from "@/components/layout/merchant-page-header";
import { RowActions } from "@/components/row-actions";
import { categories } from "@/features/catalog/categories";
import { useLocale } from "@/contexts/locale-context";
import { pickText } from "@/lib/localized";

const card = "flex flex-col gap-3 rounded-3xl bg-surface p-4 shadow-surface";

type SheetState = { kind: "add" } | { kind: "edit"; row: Subcategory } | null;

function RowMenu({
  name,
  isFirst,
  isLast,
  canDelete,
  onAction,
}: {
  name: string;
  isFirst: boolean;
  isLast: boolean;
  canDelete: boolean;
  onAction: (action: "edit" | "up" | "down" | "delete") => void;
}) {
  const { t } = useLocale();
  const actions: RowAction<"edit" | "up" | "down" | "delete">[] = [
    { id: "edit", label: t("categories.action.edit"), icon: EditIcon },
    {
      id: "up",
      label: t("categories.action.up"),
      icon: ChevronDownIcon,
      flip: true,
      isDisabled: isFirst,
    },
    {
      id: "down",
      label: t("categories.action.down"),
      icon: ChevronDownIcon,
      isDisabled: isLast,
    },
    {
      id: "delete",
      label: t("categories.action.delete"),
      icon: TrashIcon,
      isDisabled: !canDelete,
    },
  ];

  return (
    <RowActions
      actions={actions}
      label={t("categories.action.more", { name })}
      onAction={onAction}
    />
  );
}

/**
 * M26 Categories (PRD §7.0): the four fixed categories, and under Keepsakes the store's own
 * sub-categories. The merchant adds, renames, reorders and deletes those; guests browse and
 * filter the Keepsakes list by them, and each keepsake is filed under one in M12.
 */
export function CategoriesPage() {
  const { t, language, intlLocale } = useLocale();
  const subs = useSubcategories();
  const { confirm, dialog } = useConfirm();
  const [sheet, setSheet] = useState<SheetState>(null);
  const plural = new Intl.PluralRules(intlLocale);
  const nameOf = (row: Subcategory) => pickText(row.name, language).text;
  const hasLocked = subs.keepsakes.some((row) => subs.countOf(row.id) > 0);

  const onAction = async (
    row: Subcategory,
    action: "edit" | "up" | "down" | "delete",
  ) => {
    if (action === "edit") return setSheet({ kind: "edit", row });
    if (action === "up" || action === "down") {
      return subs.move(row.id, action === "up" ? -1 : 1);
    }
    const ok = await confirm({
      title: t("categories.delete.title", { name: nameOf(row) }),
      body: t("categories.delete.body"),
      confirmLabel: t("categories.action.delete"),
    });

    if (!ok) return;
    subs.remove(row.id);
    toast.success(t("categories.deleted", { name: nameOf(row) }));
  };

  return (
    <div className="flex flex-col gap-4">
      <MerchantPageHeader
        action={
          <Button
            className="shrink-0"
            size="sm"
            onPress={() => setSheet({ kind: "add" })}
          >
            <PlusIcon aria-hidden size={16} />
            {t("categories.add")}
          </Button>
        }
        back={{ label: t("products.title"), to: "/store/products" }}
        description={t("categories.intro")}
        title={t("categories.title")}
      />

      {categories.map((category) => {
        const name = pickText(category.name, language).text;

        if (category.id === "keepsakes") {
          return (
            <section key={category.id} aria-label={name} className={card}>
              <div className="flex flex-col gap-0.5">
                <h2 className="text-heading">{name}</h2>
                <p className="text-sm text-muted">
                  {t("categories.keepsakes.note")}
                </p>
              </div>
              {subs.keepsakes.length ? (
                <ul className="flex flex-col divide-y divide-separator">
                  {subs.keepsakes.map((row, index) => {
                    const count = subs.countOf(row.id);
                    const other = pickText(
                      row.name,
                      language === "en" ? "de" : "en",
                    );

                    return (
                      <li
                        key={row.id}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium">
                            {nameOf(row)}
                          </span>
                          <span className="truncate text-sm text-muted">
                            {t(
                              plural.select(count) === "one"
                                ? "categories.count.one"
                                : "categories.count.other",
                              { count },
                            )}
                            {!other.isFallback && ` · ${other.text}`}
                          </span>
                        </div>
                        <RowMenu
                          canDelete={count === 0}
                          isFirst={index === 0}
                          isLast={index === subs.keepsakes.length - 1}
                          name={nameOf(row)}
                          onAction={(action) => void onAction(row, action)}
                        />
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-2xl bg-default px-3 py-4 text-sm text-muted">
                  {t("categories.keepsakes.empty")}
                </p>
              )}
              {hasLocked && (
                <p className="text-xs text-muted">
                  {t("categories.keepsakes.locked")}
                </p>
              )}
            </section>
          );
        }

        return (
          <section key={category.id} aria-label={name} className={card}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-heading">{name}</h2>
            </div>
            <p className="text-sm text-muted">{t("categories.tours.note")}</p>
            {category.id === "tours" && (
              <Link
                className="w-fit rounded-lg text-sm font-medium text-accent outline-none hover:underline focus-visible:focus-ring"
                to="/store/products/tours"
              >
                {t("categories.tours.link")}
              </Link>
            )}
          </section>
        );
      })}

      {sheet && (
        <SubcategorySheet
          existing={sheet.kind === "edit" ? sheet.row : undefined}
          others={subs.keepsakes
            .filter((row) => sheet.kind === "add" || row.id !== sheet.row.id)
            .map((row) => row.name)}
          onClose={() => setSheet(null)}
          onSave={(next) => {
            if (sheet.kind === "edit") subs.rename(sheet.row.id, next);
            else subs.add(next);
            toast.success(
              t(
                sheet.kind === "edit"
                  ? "categories.renamed"
                  : "categories.added",
                { name: pickText(next, language).text },
              ),
            );
            setSheet(null);
          }}
        />
      )}
      {dialog}
    </div>
  );
}
