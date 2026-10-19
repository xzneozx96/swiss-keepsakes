import { useState } from "react";
export function Bad({ count, list }: { count: number; list: string[] }) {
  const [isLoading, setIsLoading] = useState(false);
  const s = <div className="x" />;
  return <div>{count && <span>{count}</span>}{list.length && <b />}{isLoading && <i />}<svg className="animate-spin" d="M1.123456 2.123456" /><path d="M1.123456 2.123456" />{s}</div>;
}
