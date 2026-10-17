import clsx from "clsx";

/** Tool parameters, after the agentic-rag ToolInput. */
export function ToolInput({
  input,
  className,
}: {
  input: unknown;
  className?: string;
}) {
  return (
    <div className={clsx("min-w-0 space-y-1", className)}>
      <h4 className="text-[11px] font-medium tracking-wide text-muted uppercase">
        Parameters
      </h4>
      <Json value={input} />
    </div>
  );
}

/** Tool result, after the agentic-rag ToolOutput. */
export function ToolOutput({
  output,
  className,
}: {
  output: unknown;
  className?: string;
}) {
  if (output == null) return null;

  return (
    <div className={clsx("min-w-0 space-y-1", className)}>
      <h4 className="text-[11px] font-medium tracking-wide text-muted uppercase">
        Result
      </h4>
      <Json tall value={output} />
    </div>
  );
}

function Json({ value, tall = false }: { value: unknown; tall?: boolean }) {
  return (
    <pre
      className={clsx(
        "overflow-auto rounded-lg bg-surface-secondary p-2 font-mono text-[11px] leading-snug text-muted",
        tall ? "max-h-56" : "max-h-40",
      )}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}
