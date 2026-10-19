import { memo } from "react";
export function A({ tags = [] }: { tags?: string[] }) { return <p>{tags.length}</p>; }
export function B({ tags = [] }) { return <p>{tags.length}</p>; }
export const C = memo(function C({ tags = [] }: { tags?: string[] }) { return <p>{tags.length}</p>; });
export const D = ({ tags = {} }) => <p>{String(tags)}</p>;
