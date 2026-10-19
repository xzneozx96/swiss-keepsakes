// bundle-preload: a lazy boundary with no hover or focus preload.
import { lazy } from "react";

const Heavy = lazy(() => import("./heavy"));

export const Panel = () => <Heavy />;
