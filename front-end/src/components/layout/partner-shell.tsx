import { useLocale } from "@/contexts/locale-context";
import { shop } from "@/features/catalog/seed";

/** Partner report frame (UX spec §3.3): one page, no navigation; P01 and P02 share it. */
export function PartnerShell({
  partnerName,
  children,
}: {
  /** Absent on an invalid link, where nobody is known yet. */
  partnerName?: string;
  children: React.ReactNode;
}) {
  const { t } = useLocale();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-separator bg-surface">
        <div className="mx-auto flex max-w-3xl flex-col gap-0.5 px-4 py-4">
          <span className="text-label text-muted">{shop.name}</span>
          <h1 className="text-heading">
            {partnerName
              ? `${partnerName} · ${t("partner.reportTitle")}`
              : t("partner.reportTitle")}
          </h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
