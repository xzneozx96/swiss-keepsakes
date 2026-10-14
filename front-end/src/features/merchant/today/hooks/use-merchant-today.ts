import type { CollectStatus, TodayTaskId } from "../lib/today";
import type {
  CollectPart,
  PickupRow,
  TaskTile,
} from "../components/merchant-today";
import type { MessageKey } from "@/i18n/en";

import {
  TODAY_TASKS,
  nextPickups,
  todayNumbers,
  todayTasks,
} from "../lib/today";

import { useLocale } from "@/contexts/locale-context";
import { zurichDate } from "@/features/catalog/lib/pickup";
import { useDemo, useDemoNow } from "@/features/demo";
import { formatLabel, progressLabel } from "@/features/orders/lib/labels";
import { formatMoney, formatShortDate } from "@/lib/format";
import { pickText } from "@/lib/localized";

const taskTitle: Record<TodayTaskId, MessageKey> = {
  "awaiting-confirmation": "merchantToday.task.awaitingConfirmation",
  "awaiting-payment": "merchantToday.task.awaitingPayment",
  "to-prepare": "merchantToday.task.toPrepare",
  ready: "merchantToday.task.ready",
  overdue: "merchantToday.task.overdue",
  owing: "merchantToday.task.owing",
};

const alertHint: Partial<Record<TodayTaskId, MessageKey>> = {
  overdue: "merchantToday.task.overdue.hint",
  owing: "merchantToday.task.owing.hint",
};

/** The M03 tab names, so the breakdown reads like the tabs it leads to. */
const collectLabel: Record<CollectStatus, MessageKey> = {
  accepted: "merchantOrders.tab.awaitingPayment",
  preparing: "merchantOrders.tab.preparing",
  ready: "merchantOrders.tab.ready",
  handed_over: "merchantOrders.tab.owing",
};

const PICKUP_ROWS = 5;

/** M02 Today: task tiles, money widgets and next pickups, all derived from the demo orders. */
export function useMerchantToday() {
  const { t, language, intlLocale } = useLocale();
  const { state } = useDemo();
  const now = useDemoNow();
  const { orders, guests } = state.data;
  const today = zurichDate(now);
  const plural = new Intl.PluralRules(intlLocale);
  const isOne = (n: number) => plural.select(n) === "one";
  const numbers = todayNumbers(orders, now);
  const money = (rappen: number) => formatMoney(rappen / 100, intlLocale);
  const orderCount = (count: number) =>
    t(
      isOne(count) ? "merchantToday.orders.one" : "merchantToday.orders.other",
      {
        count,
      },
    );
  const datePart = (iso: string, option: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, { ...option, timeZone: "UTC" }).format(
      new Date(`${iso}T12:00:00Z`),
    );

  const found = new Map(todayTasks(orders, now).map((task) => [task.id, task]));
  const tiles: TaskTile[] = TODAY_TASKS.map((id) => {
    const task = found.get(id);
    const count = task?.count ?? 0;
    const title = t(taskTitle[id]);

    return {
      id,
      // A tile with nothing in it is not a link: it would open an empty tab.
      tab: task?.tab ?? null,
      title,
      hint: alertHint[id] ? t(alertHint[id]) : "",
      count,
      label: t(
        isOne(count)
          ? "merchantToday.task.label.one"
          : "merchantToday.task.label.other",
        { title, count },
      ),
    };
  });

  const collectBy: CollectPart[] = numbers.toCollectBy.map((part) => ({
    id: part.status,
    label: t(collectLabel[part.status]),
    amount: money(part.amount),
    orders: orderCount(part.count),
    share: numbers.toCollect ? part.amount / numbers.toCollect : 0,
  }));

  const pickups: PickupRow[] = nextPickups(orders)
    .slice(0, PICKUP_ROWS)
    .map((order) => {
      const [first] = order.lines;
      const progress = progressLabel(order, "staff");

      return {
        id: order.id,
        reference: order.ref,
        guestName: guests.find((g) => g.id === order.guestId)?.name ?? "",
        gift: first
          ? `${first.quantity} × ${pickText(first.productName, language).text}`
          : "",
        isToday: order.pickupDate === today,
        day: {
          weekday:
            order.pickupDate === today
              ? t("merchantToday.pickups.today")
              : datePart(order.pickupDate, { weekday: "short" }),
          day: datePart(order.pickupDate, { day: "numeric" }),
          month: datePart(order.pickupDate, { month: "short" }),
        },
        status: {
          text: formatLabel(progress, t, intlLocale),
          tone: progress.tone,
        },
      };
    });

  return {
    date: formatShortDate(today, today, intlLocale),
    tiles,
    collect: {
      title: t("merchantToday.number.toCollect"),
      total: money(numbers.toCollect),
      hint: t("merchantToday.number.toCollect.hint"),
      none: t("merchantToday.number.toCollect.none"),
      parts: collectBy,
    },
    pickups: {
      title: t("merchantToday.pickups.title"),
      allLabel: t("merchantToday.pickups.all"),
      empty: t("merchantToday.pickups.empty"),
      rows: pickups,
    },
  };
}
