import base from "/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end/vite.config.ts";
export default {
  ...base,
  root: "/home/ross-geller/Projects/minastik/swiss-keepsakes/front-end",
  server: { ...(base.server ?? {}), hmr: false },
};
