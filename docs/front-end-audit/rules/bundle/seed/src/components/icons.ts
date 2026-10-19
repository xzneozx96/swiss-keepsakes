// bundle-barrel-imports: one module wraps every icon, so lazy-only icons ship in the first load.
import { memo } from "react";
import * as Lib from "fakelib";

function stable<T extends object>(Base: T, name: string): T {
  const Memoized = memo(Base as never) as unknown as T & { displayName?: string };

  Memoized.displayName = name;

  return Memoized;
}

export const OneIcon = stable(Lib.One, "OneIcon");
export const TwoIcon = stable(Lib.Two, "TwoIcon");
export const ThreeIcon = stable(Lib.Three, "ThreeIcon");
export const FourIcon = stable(Lib.Four, "FourIcon");
export const FiveIcon = stable(Lib.Five, "FiveIcon");
export const SixIcon = stable(Lib.Six, "SixIcon");
export const SevenIcon = stable(Lib.Seven, "SevenIcon");
export const EightIcon = stable(Lib.Eight, "EightIcon");
export const NineIcon = stable(Lib.Nine, "NineIcon");
export const TenIcon = stable(Lib.Ten, "TenIcon");
