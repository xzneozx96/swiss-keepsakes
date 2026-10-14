import { createFileRoute, redirect } from "@tanstack/react-router";

// C10 became a sheet on C09 (2.4-r5): the old address opens it there, in place of this entry.
export const Route = createFileRoute("/_guest/tours/$slug_/book")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/tours/$slug",
      params,
      search: { book: true },
      replace: true,
    });
  },
});
