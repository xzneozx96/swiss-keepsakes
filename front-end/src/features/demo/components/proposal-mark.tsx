import { Description, Switch } from "@heroui/react";

import { setShowProposals, useShowProposals } from "../proposals";

import { useLocale } from "@/contexts/locale-context";

/**
 * Wraps an element that rests on an undecided UX proposal (spec §7). Invisible until the
 * presenter turns on "Show proposals"; then a dashed outline and a tag naming the proposal.
 */
export function ProposalMark({
  name,
  children,
  className = "",
}: {
  /** Short name of the proposal, e.g. "5 code attempts". */
  name: string;
  children: React.ReactNode;
  className?: string;
}) {
  const show = useShowProposals();
  const { t } = useLocale();

  if (!show) return <div className={className}>{children}</div>;

  return (
    <div
      className={`relative rounded-lg pt-3 outline-2 outline-offset-4 outline-[#7C3AED] outline-dashed ${className}`}
    >
      <span className="absolute -top-2 right-1 z-10 rounded-full bg-[#7C3AED] px-2 py-0.5 font-mono text-[10px] leading-4 text-white">
        {t("proto.proposal", { name })}
      </span>
      {children}
    </div>
  );
}

/** Prototype-bar switch for the proposal markers. */
export function ProposalsToggle() {
  const show = useShowProposals();

  return (
    <Switch isSelected={show} onChange={setShowProposals}>
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        Show proposals
      </Switch.Content>
      <Description>
        Outlines elements that rest on an undecided UX proposal (spec §7). So
        far: the 5 sign-in code tries.
      </Description>
    </Switch>
  );
}
