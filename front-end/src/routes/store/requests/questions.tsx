import { createFileRoute } from "@tanstack/react-router";

import { SectionFrame } from "@/components/layout/section-frame";
import { useLocale } from "@/contexts/locale-context";
import { MerchantRequests } from "@/features/requests/merchant/components/merchant-requests";

// M19 Inquiries › Questions.
export const Route = createFileRoute("/store/requests/questions")({
  component: Page,
});

function Page() {
  const { t } = useLocale();

  return (
    <SectionFrame
      hasOwnTitle
      page="questions"
      section="requests"
      title={t("nav.requests")}
    >
      <MerchantRequests tab="questions" />
    </SectionFrame>
  );
}
