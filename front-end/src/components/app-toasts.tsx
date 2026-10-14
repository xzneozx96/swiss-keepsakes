import { Toast } from "@heroui/react";

import { useLocale } from "@/contexts/locale-context";

/**
 * The one toast region, mounted at the app root. Bottom placement, lifted above the
 * guest bottom bar and tab bar, and no wider than the 430px guest frame. Renders the
 * HeroUI default toast with translated labels (HeroUI's close label is English only).
 * Action sits under the text, as on phones.
 */
export function AppToasts() {
  const { t } = useLocale();

  return (
    <Toast.Provider
      aria-label={t("cartToast.region")}
      className="bottom-[calc(env(safe-area-inset-bottom,0px)+96px)] w-[min(398px,calc(100vw-2rem))] sm:min-w-0"
      placement="bottom"
    >
      {({ toast: item }) => {
        const { title, description, actionProps, variant } = item.content;

        return (
          <Toast placement="bottom" toast={item} variant={variant}>
            <Toast.Indicator variant={variant} />
            <Toast.Content>
              {title && <Toast.Title>{title}</Toast.Title>}
              {description && (
                <Toast.Description>{description}</Toast.Description>
              )}
              {actionProps?.children && <Toast.ActionButton {...actionProps} />}
            </Toast.Content>
            <Toast.CloseButton aria-label={t("cartToast.close")} />
          </Toast>
        );
      }}
    </Toast.Provider>
  );
}
