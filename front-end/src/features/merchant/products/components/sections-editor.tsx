import type { TourEdit } from "../hooks/use-tour-editor";
import type { Language } from "@/contexts/locale-context";
import type { LocalizedText } from "@/features/catalog/types";
import type {
  TourSection,
  TourSectionItem,
  TourSectionLayout,
} from "@/features/tours/types";

import {
  Button,
  Description,
  Input,
  Label,
  ListBox,
  Select,
  Switch,
  TextField,
} from "@heroui/react";
import { useEffect, useRef, useState } from "react";

import { LANGUAGES } from "../lib/completeness";
import { newId } from "../lib/records";

import { LocalizedField } from "./editor-parts";
import { useStopDrag } from "./itinerary/use-stop-drag";
import { Group, NavRow, SheetLanguage, rowHairline } from "./settings-rows";

import {
  ChevronDownIcon,
  ClockIcon,
  ContentIcon,
  GiftIcon,
  GripIcon,
  InfoIcon,
  PlusIcon,
  SelectedIcon,
  TrashIcon,
} from "@/components/icons";
import { useConfirm } from "@/components/confirm-dialog";
import { Media } from "@/components/media";
import { useLocale } from "@/contexts/locale-context";
import { isPublished } from "@/features/catalog/lib/publish";
import { fromPrice, isSoldOut } from "@/features/catalog/lib/stock";
import { useDemoSelector } from "@/features/demo";
import { MAX_TOUR_KEEPSAKES } from "@/features/tours/discovery/tour-keepsakes";
import { SheetFrame } from "@/components/sheet-frame";
import { formatDate, formatMoney, calendarDay } from "@/lib/format";
import { pickText } from "@/lib/localized";

export interface SectionsEditor {
  edit: TourEdit;
  change: (patch: Partial<TourEdit>) => void;
  textError: (
    id: "sections",
    language: Language,
    value: LocalizedText,
  ) => string | undefined;
}

const LAYOUTS: TourSectionLayout[] = [
  "text",
  "list",
  "timeline",
  "facts",
  "notice",
];

/** Moves the entry at `index` by `delta` places; out of range changes nothing. */
function move<T>(list: T[], index: number, delta: number): T[] {
  const to = index + delta;

  if (to < 0 || to >= list.length) return list;
  const next = [...list];

  [next[index], next[to]] = [next[to], next[index]];

  return next;
}

/** The entry at `from` taken out and put back at `to`. */
function reorder<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [moved] = next.splice(from, 1);

  next.splice(to, 0, moved);

  return next;
}

function PlainField({
  label,
  value,
  onChange,
  type = "text",
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "email" | "tel" | "url";
  help?: string;
}) {
  return (
    <TextField fullWidth value={value} onChange={onChange}>
      <Label>{label}</Label>
      <Input type={type} />
      {help && <Description>{help}</Description>}
    </TextField>
  );
}

function ItemEditor({
  item,
  index,
  count,
  language,
  error,
  onChange,
  onMove,
  onRemove,
}: {
  item: TourSectionItem;
  index: number;
  count: number;
  language: Language;
  error: string | undefined;
  onChange: (patch: Partial<TourSectionItem>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const { t } = useLocale();
  const n = index + 1;
  const contact = item.contact ?? {};
  const setContact = (
    patch: Partial<NonNullable<TourSectionItem["contact"]>>,
  ) => onChange({ contact: { ...contact, ...patch } });

  return (
    <li className="flex flex-col gap-3 rounded-2xl bg-surface-secondary p-3">
      <div className="flex items-center justify-end gap-1">
        <Button
          isIconOnly
          aria-label={t("products.sections.rowUp", { n })}
          isDisabled={index === 0}
          size="sm"
          variant="tertiary"
          onPress={() => onMove(-1)}
        >
          <ChevronDownIcon aria-hidden className="rotate-180" size={16} />
        </Button>
        <Button
          isIconOnly
          aria-label={t("products.sections.rowDown", { n })}
          isDisabled={index === count - 1}
          size="sm"
          variant="tertiary"
          onPress={() => onMove(1)}
        >
          <ChevronDownIcon aria-hidden size={16} />
        </Button>
        <Button
          isIconOnly
          aria-label={t("products.sections.rowRemove", { n })}
          className="text-danger"
          size="sm"
          variant="tertiary"
          onPress={onRemove}
        >
          <TrashIcon aria-hidden size={16} />
        </Button>
      </div>
      <LocalizedField
        label={t("products.sections.rowLabel", { n })}
        language={language}
        value={item.label ?? {}}
        onChange={(label) => onChange({ label })}
      />
      <LocalizedField
        error={error}
        label={t("products.sections.rowText", { n })}
        language={language}
        rows={2}
        value={item.text}
        onChange={(text) => onChange({ text })}
      />
      <LocalizedField
        label={t("products.sections.rowDetail", { n })}
        language={language}
        rows={2}
        value={item.detail ?? {}}
        onChange={(detail) => onChange({ detail })}
      />
      <Switch
        isSelected={!!item.optional}
        onChange={(optional) => onChange({ optional })}
      >
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          {t("products.sections.rowOptional")}
        </Switch.Content>
      </Switch>
      <details className="rounded-xl bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">
          {t("products.sections.rowMore", { n })}
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <PlainField
            label={t("products.sections.contactAddress")}
            value={contact.address ?? ""}
            onChange={(address) => setContact({ address })}
          />
          <div className="grid grid-cols-2 gap-3">
            <PlainField
              label={t("products.sections.contactPhone")}
              type="tel"
              value={contact.phone ?? ""}
              onChange={(phone) => setContact({ phone })}
            />
            <PlainField
              label={t("products.sections.contactEmail")}
              type="email"
              value={contact.email ?? ""}
              onChange={(email) => setContact({ email })}
            />
          </div>
          <PlainField
            label={t("products.sections.contactUrl")}
            type="url"
            value={contact.url ?? ""}
            onChange={(url) => setContact({ url })}
          />
        </div>
      </details>
    </li>
  );
}

const LAYOUT_ICON = {
  text: ContentIcon,
  list: ContentIcon,
  timeline: ClockIcon,
  facts: InfoIcon,
  notice: InfoIcon,
} as const;

const isEmptySection = (section: TourSection) =>
  !Object.values(section.title).some((v) => v?.trim()) &&
  !Object.values(section.body ?? {}).some((v) => v?.trim()) &&
  !(section.items ?? []).length;

/** One section's fields, in a sheet: title, layout, text and rows. */
function SectionSheet({
  section,
  language,
  editor,
  onChange,
  onClose,
  onRemove,
}: {
  section: TourSection;
  language: Language;
  editor: SectionsEditor;
  onChange: (patch: Partial<TourSection>) => void;
  onClose: () => void;
  onRemove: () => void;
}) {
  const { t, language: interfaceLanguage } = useLocale();
  const [lang, setLang] = useState<Language>(language);
  const items = section.items ?? [];
  const isText = section.layout === "text";
  const setItems = (next: TourSectionItem[]) => onChange({ items: next });
  const setItem = (id: string, patch: Partial<TourSectionItem>) =>
    setItems(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  return (
    <SheetFrame
      isOpen
      footer={
        <>
          <Button fullWidth size="lg" onPress={onClose}>
            {t("products.sections.sheetDone")}
          </Button>
          <Button
            fullWidth
            className="text-danger"
            size="lg"
            variant="tertiary"
            onPress={onRemove}
          >
            <TrashIcon aria-hidden size={18} />
            {t("products.sections.remove")}
          </Button>
        </>
      }
      title={
        pickText(section.title, interfaceLanguage).text ||
        t("products.sections.untitled")
      }
      onClose={onClose}
    >
      <SheetLanguage language={lang} onChange={setLang} />
      <LocalizedField
        error={editor.textError("sections", lang, section.title)}
        label={t("products.sections.sectionTitle")}
        language={lang}
        value={section.title}
        onChange={(title) => onChange({ title })}
      />
      <Select
        fullWidth
        selectedKey={section.layout}
        onSelectionChange={(key) =>
          key !== null && onChange({ layout: String(key) as TourSectionLayout })
        }
      >
        <Label>{t("products.sections.layout")}</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Description>
          {t(`products.sections.layout.${section.layout}.help`)}
        </Description>
        <Select.Popover>
          <ListBox>
            {LAYOUTS.map((layout) => (
              <ListBox.Item
                key={layout}
                id={layout}
                textValue={t(`products.sections.layout.${layout}`)}
              >
                {t(`products.sections.layout.${layout}`)}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <LocalizedField
        label={t("products.sections.body")}
        language={lang}
        rows={isText ? 6 : 3}
        value={section.body ?? {}}
        onChange={(body) => onChange({ body })}
      />
      {isText ? (
        <p className="-mt-4 text-xs text-muted">
          {t("products.sections.bodyHelp")}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">
            {t("products.sections.rows")}
          </h3>
          {items.length > 0 && (
            <ul className="flex flex-col gap-3">
              {items.map((item, i) => (
                <ItemEditor
                  key={item.id}
                  count={items.length}
                  error={editor.textError("sections", lang, item.text)}
                  index={i}
                  item={item}
                  language={lang}
                  onChange={(patch) => setItem(item.id, patch)}
                  onMove={(delta) => setItems(move(items, i, delta))}
                  onRemove={() =>
                    setItems(items.filter((x) => x.id !== item.id))
                  }
                />
              ))}
            </ul>
          )}
          <Button
            className="w-fit"
            size="sm"
            variant="tertiary"
            onPress={() => setItems([...items, { id: newId("row"), text: {} }])}
          >
            <PlusIcon aria-hidden size={16} />
            {t("products.sections.rowAdd")}
          </Button>
        </div>
      )}
    </SheetFrame>
  );
}

/** The date the practical information was last verified, in a small sheet. */
function CheckedOnSheet({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();

  return (
    <SheetFrame
      isOpen
      footer={
        <Button fullWidth size="lg" onPress={onClose}>
          {t("products.sections.sheetDone")}
        </Button>
      }
      title={t("products.sections.checkedOn")}
      onClose={onClose}
    >
      <PlainField
        help={t("products.sections.checkedOnHelp")}
        label={t("products.sections.checkedOn")}
        type="date"
        value={value}
        onChange={onChange}
      />
      {value && (
        <Button
          className="w-fit text-danger"
          size="sm"
          variant="tertiary"
          onPress={() => onChange("")}
        >
          {t("products.sections.checkedOnClear")}
        </Button>
      )}
    </SheetFrame>
  );
}

/** Names, prices and visibility of the linked keepsakes, shared by the row, the list and the picker. */
function useKeepsakeInfo() {
  const { t, language, intlLocale } = useLocale();
  const orders = useDemoSelector((s) => s.data.orders);
  const demoProducts = useDemoSelector((s) => s.data.products);
  const products = demoProducts;
  const find = (id: string) => products.find((p) => p.id === id);

  return {
    products,
    find,
    name: (id: string) => {
      const product = find(id);

      return product ? pickText(product.name, language).text : id;
    },
    price: (id: string) => {
      const product = find(id);

      return product
        ? t("products.keepsakes.from", {
            price: formatMoney(fromPrice(product) / 100, intlLocale),
          })
        : "";
    },
    shown: (id: string) => {
      const product = find(id);

      return !!product && isPublished(product) && !isSoldOut(product, orders);
    },
  };
}

/** The linked keepsakes in a sheet: drag to reorder, remove, and a row that opens the picker. */
function KeepsakesListSheet({
  editor,
  onAdd,
  onClose,
}: {
  editor: SectionsEditor;
  onAdd: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const { find, name, price, shown } = useKeepsakeInfo();
  const ids = editor.edit.keepsakeIds;
  const set = (next: string[]) => editor.change({ keepsakeIds: next });
  const listRef = useRef<HTMLOListElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const refocus = useRef<string | null>(null);
  const moveTo = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || to === from) return;
    refocus.current = ids[from];
    set(reorder(ids, from, to));
  };
  const drag = useStopDrag({
    listRef,
    placeholderRef,
    onStart: () => undefined,
    onDrop: moveTo,
  });

  // The row moved in the DOM; give its handle the focus back.
  useEffect(() => {
    if (!refocus.current) return;
    listRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-keepsake="${refocus.current}"] [data-grip]`,
      )
      ?.focus();
    refocus.current = null;
  }, [ids]);

  return (
    <SheetFrame
      isOpen
      footer={
        <Button fullWidth size="lg" onPress={onClose}>
          {t("products.sections.sheetDone")}
        </Button>
      }
      title={t("products.keepsakes.title")}
      onClose={onClose}
    >
      <p className="text-sm text-pretty text-muted">
        {t("products.keepsakes.help")}
      </p>
      {ids.length === 0 ? (
        <p className="text-sm text-muted">{t("products.keepsakes.none")}</p>
      ) : (
        <div className="relative">
          <ol
            ref={listRef}
            aria-label={t("products.keepsakes.title")}
            className="flex flex-col"
          >
            {ids.map((id, index) => (
              <li key={id} className="group" data-keepsake={id}>
                <div className="flex items-center gap-2 rounded-2xl py-2.5 group-data-[lifted]:bg-surface group-data-[lifted]:px-2 group-data-[lifted]:shadow-overlay">
                  <button
                    {...drag.handleProps(index)}
                    aria-label={t("products.keepsakes.grip", {
                      name: name(id),
                    })}
                    className="relative grid size-9 shrink-0 cursor-grab place-items-center rounded-full text-muted outline-none before:absolute before:-inset-1 before:content-[''] focus-visible:focus-ring active:cursor-grabbing"
                    data-grip=""
                    // Inline: globals.css gives every button `touch-action: manipulation`.
                    style={{ touchAction: "none" }}
                    type="button"
                    onKeyDown={(event) => {
                      if (
                        event.key === "ArrowUp" ||
                        event.key === "ArrowDown"
                      ) {
                        event.preventDefault();
                        moveTo(
                          index,
                          index + (event.key === "ArrowUp" ? -1 : 1),
                        );
                      }
                      drag.handleProps(index).onKeyDown?.(event);
                    }}
                  >
                    <GripIcon aria-hidden size={18} />
                  </button>
                  <Media
                    alt=""
                    className="size-14 shrink-0 rounded-xl"
                    photo={find(id)?.photo}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-2 font-medium">{name(id)}</span>
                    <span className="text-xs text-muted">
                      {index >= MAX_TOUR_KEEPSAKES
                        ? t("products.keepsakes.beyond")
                        : shown(id)
                          ? price(id)
                          : t("products.keepsakes.hidden")}
                    </span>
                  </span>
                  <Button
                    isIconOnly
                    aria-label={t("products.keepsakes.remove", {
                      name: name(id),
                    })}
                    className="shrink-0 text-danger"
                    size="sm"
                    variant="tertiary"
                    onPress={() => set(ids.filter((x) => x !== id))}
                  >
                    <TrashIcon aria-hidden size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          {/* The slot a dragged row will land in (see useStopDrag). */}
          <div
            ref={placeholderRef}
            aria-hidden
            hidden
            className="pointer-events-none absolute inset-x-0 rounded-2xl border-2 border-dashed border-accent bg-accent/10"
          />
        </div>
      )}
      <Button className="w-fit" size="sm" variant="tertiary" onPress={onAdd}>
        <PlusIcon aria-hidden size={16} />
        {t("products.keepsakes.add")}
      </Button>
    </SheetFrame>
  );
}

/** Search the published keepsakes and tap to link or unlink them. */
function KeepsakesPickerSheet({
  editor,
  onClose,
}: {
  editor: SectionsEditor;
  onClose: () => void;
}) {
  const { t, language, intlLocale } = useLocale();
  const { products, price } = useKeepsakeInfo();
  const [query, setQuery] = useState("");
  const ids = editor.edit.keepsakeIds;
  const needle = query.trim().toLocaleLowerCase(intlLocale);
  const candidates = products.filter(
    (p) =>
      isPublished(p) &&
      (!needle ||
        LANGUAGES.some((l) =>
          (p.name[l] ?? "").toLocaleLowerCase(intlLocale).includes(needle),
        )),
  );
  const set = (next: string[]) => editor.change({ keepsakeIds: next });

  return (
    <SheetFrame
      isOpen
      footer={
        <Button fullWidth size="lg" onPress={onClose}>
          {t("products.keepsakes.done", { count: ids.length })}
        </Button>
      }
      title={t("products.keepsakes.add")}
      onClose={onClose}
    >
      <TextField
        fullWidth
        aria-label={t("products.keepsakes.search")}
        className="sticky top-0 z-10 -mt-1 bg-overlay pb-2"
        value={query}
        onChange={setQuery}
      >
        <Input
          enterKeyHint="search"
          placeholder={t("products.keepsakes.search")}
          type="search"
        />
      </TextField>
      {candidates.length > 0 ? (
        <ul
          aria-label={t("products.keepsakes.add")}
          className="-mt-3 flex flex-col"
        >
          {candidates.map((p) => {
            const added = ids.includes(p.id);

            return (
              <li key={p.id}>
                <button
                  aria-pressed={added}
                  className="flex min-h-16 w-full items-center gap-3 rounded-2xl py-2 text-start outline-none focus-visible:focus-ring"
                  type="button"
                  onClick={() =>
                    set(added ? ids.filter((x) => x !== p.id) : [...ids, p.id])
                  }
                >
                  <Media
                    alt=""
                    className="size-14 shrink-0 rounded-xl"
                    photo={p.photo}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-2 font-medium">
                      {pickText(p.name, language).text}
                    </span>
                    <span className="text-xs text-muted">{price(p.id)}</span>
                  </span>
                  <span
                    aria-hidden
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${
                      added
                        ? "bg-foreground text-background"
                        : "border border-separator text-muted"
                    }`}
                  >
                    {added ? (
                      <SelectedIcon size={18} />
                    ) : (
                      <PlusIcon size={16} />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-muted">{t("products.keepsakes.noMatch")}</p>
      )}
    </SheetFrame>
  );
}

/**
 * M13 "Practical info" as a settings-style list (the account screen's pattern): sections as
 * tappable rows that open an editing sheet, drag to reorder, then the linked keepsakes and the
 * date the information was checked, each in its own sheet.
 */
export function PracticalInfoStep({
  editor,
  language,
}: {
  editor: SectionsEditor;
  language: Language;
}) {
  const { t, language: interfaceLanguage, intlLocale } = useLocale();
  const { confirm, dialog } = useConfirm();
  const { name: keepsakeName } = useKeepsakeInfo();
  const { edit, change } = editor;
  const sections = edit.sections;
  const [openId, setOpenId] = useState<string | null>(null);
  const [view, setView] = useState<"keepsakes" | "pick" | "checked" | null>(
    null,
  );
  const listRef = useRef<HTMLOListElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const setSections = (next: TourSection[]) => change({ sections: next });
  const patch = (id: string, next: Partial<TourSection>) =>
    setSections(sections.map((s) => (s.id === id ? { ...s, ...next } : s)));
  const drag = useStopDrag({
    listRef,
    placeholderRef,
    onStart: () => undefined,
    onDrop: (from, to) => setSections(reorder(sections, from, to)),
  });
  const open = sections.find((s) => s.id === openId);
  const plural = new Intl.PluralRules(intlLocale);

  const describe = (section: TourSection) => {
    const rows = section.items?.length ?? 0;
    const layout = t(`products.sections.layout.${section.layout}`);

    if (rows)
      return `${layout} · ${t(
        plural.select(rows) === "one"
          ? "products.sections.rowCount.one"
          : "products.sections.rowCount.other",
        { count: rows },
      )}`;
    const body = pickText(section.body ?? {}, interfaceLanguage).text;

    return body ? `${layout} · ${body}` : layout;
  };
  const close = () => {
    // A section left completely empty is not kept.
    if (open && isEmptySection(open))
      setSections(sections.filter((s) => s.id !== open.id));
    setOpenId(null);
  };
  const remove = async (section: TourSection) => {
    const label =
      pickText(section.title, interfaceLanguage).text ||
      t("products.sections.untitled");
    const confirmed = await confirm({
      title: t("products.sections.confirm.title", { name: label }),
      body: t("products.sections.confirm.body"),
      confirmLabel: t("products.sections.confirm.action"),
    });

    if (!confirmed) return;
    setSections(sections.filter((s) => s.id !== section.id));
    setOpenId(null);
  };
  const add = () => {
    const section: TourSection = {
      id: newId("section"),
      layout: "text",
      title: {},
    };

    setSections([...sections, section]);
    setOpenId(section.id);
  };
  const linked = edit.keepsakeIds;
  const linkedNames = linked.slice(0, 2).map(keepsakeName).join(", ");

  return (
    <>
      <Group title={t("products.sections.title")}>
        {sections.length === 0 && (
          <p className="px-4 py-4 text-sm text-muted">
            {t("products.sections.empty")}
          </p>
        )}
        {sections.length > 0 && (
          <div className="relative">
            <ol
              ref={listRef}
              aria-label={t("products.sections.title")}
              className="flex flex-col"
            >
              {sections.map((section, index) => {
                const titleError = editor.textError(
                  "sections",
                  language,
                  section.title,
                );
                const title = pickText(section.title, interfaceLanguage).text;

                return (
                  <li
                    key={section.id}
                    className={`group ${rowHairline} bg-surface group-data-[lifted]:shadow-overlay`}
                    data-section={section.id}
                  >
                    <div className="flex items-center ps-1 group-data-[lifted]:rounded-2xl group-data-[lifted]:bg-surface group-data-[lifted]:shadow-overlay">
                      <button
                        {...drag.handleProps(index)}
                        aria-label={t("products.sections.grip", {
                          name: title || t("products.sections.untitled"),
                        })}
                        className="relative grid size-9 shrink-0 cursor-grab place-items-center rounded-full text-muted outline-none before:absolute before:-inset-1 before:content-[''] focus-visible:focus-ring active:cursor-grabbing"
                        data-grip=""
                        // Inline: globals.css gives every button `touch-action: manipulation`.
                        style={{ touchAction: "none" }}
                        type="button"
                        onKeyDown={(event) => {
                          if (
                            event.key === "ArrowUp" ||
                            event.key === "ArrowDown"
                          ) {
                            event.preventDefault();
                            const to =
                              index + (event.key === "ArrowUp" ? -1 : 1);

                            if (to >= 0 && to < sections.length)
                              setSections(reorder(sections, index, to));
                          }
                          drag.handleProps(index).onKeyDown?.(event);
                        }}
                      >
                        <GripIcon aria-hidden size={18} />
                      </button>
                      <NavRow
                        description={titleError ?? describe(section)}
                        icon={LAYOUT_ICON[section.layout]}
                        isInvalid={!!titleError}
                        title={title || t("products.sections.untitled")}
                        onPress={() => setOpenId(section.id)}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
            {/* The slot a dragged row will land in (see useStopDrag). */}
            <div
              ref={placeholderRef}
              aria-hidden
              hidden
              className="pointer-events-none absolute inset-x-0 border-2 border-dashed border-accent bg-accent/10"
            />
          </div>
        )}
        <div className={sections.length ? "border-t border-separator/70" : ""}>
          <NavRow
            icon={PlusIcon}
            title={t("products.sections.add")}
            tone="accent"
            onPress={add}
          />
        </div>
      </Group>

      <Group title={t("products.keepsakes.title")}>
        <NavRow
          description={
            linked.length
              ? `${t(
                  plural.select(linked.length) === "one"
                    ? "products.keepsakes.linked.one"
                    : "products.keepsakes.linked.other",
                  { count: linked.length },
                )} · ${linkedNames}`
              : t("products.keepsakes.none")
          }
          icon={GiftIcon}
          title={t("products.keepsakes.title")}
          onPress={() => setView("keepsakes")}
        />
      </Group>

      <Group title={t("products.sections.verification")}>
        <NavRow
          description={
            edit.checkedOn
              ? formatDate(calendarDay(edit.checkedOn), intlLocale)
              : t("products.sections.checkedOnNone")
          }
          icon={ClockIcon}
          title={t("products.sections.checkedOn")}
          onPress={() => setView("checked")}
        />
      </Group>

      {open && (
        <SectionSheet
          key={open.id}
          editor={editor}
          language={language}
          section={open}
          onChange={(next) => patch(open.id, next)}
          onClose={close}
          onRemove={() => void remove(open)}
        />
      )}
      {view === "keepsakes" && (
        <KeepsakesListSheet
          editor={editor}
          onAdd={() => setView("pick")}
          onClose={() => setView(null)}
        />
      )}
      {view === "pick" && (
        <KeepsakesPickerSheet
          editor={editor}
          onClose={() => setView("keepsakes")}
        />
      )}
      {view === "checked" && (
        <CheckedOnSheet
          value={edit.checkedOn}
          onChange={(checkedOn) => change({ checkedOn })}
          onClose={() => setView(null)}
        />
      )}
      {dialog}
    </>
  );
}
