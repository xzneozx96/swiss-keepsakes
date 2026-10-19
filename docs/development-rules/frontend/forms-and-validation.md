# Forms and validation

Read this before you build a form. Check `front-end/package.json` first and use the library the project already has.

## State of this repo

There is no form library and no Zod in `front-end/` today. Zod is planned with the API contract (`docs/architecture/backend.md` D11). Forms are written by hand with `useState` and validation helpers. Examples: `front-end/src/features/merchant/products/hooks/use-gift-editor.ts` and `front-end/src/features/tours/booking/tour-review-page.tsx`. Do not add a form library or Zod before the backend work starts, and ask first.

## If `react-hook-form` and `zod` are in the project

- Define the schema with `z.object(...)`. Keep it next to the form or in a `schemas.ts` file.
- Derive the type from the schema with `z.infer<typeof schema>`. Do not write the type by hand.
- Connect them with `zodResolver(schema)`.
- Show a field's error next to the field, from `formState.errors`. Do not show field errors in a toast.

```tsx
const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
type FormData = z.infer<typeof schema>;
const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

## If a shared schema package or generated API client exists

The backend design plans Zod schemas in `packages/api-contract` (see `docs/architecture/backend.md`). When that package exists, a form validates with the shared schema. Do not redefine the same shape in the front-end.

## Rules for any form

- A simple input (a search box, a filter) does not need a form library. Use `useState`. For a search box that drives the URL, use `front-end/src/hooks/use-url-input.ts`.
- Validation messages go through the translation function `t()` and are added to both English and German message files. See `stack-notes.md`.
- Guidance. Disable the submit button while a request is pending, and show the result with the patterns in `error-handling.md`.
- Guidance. Validate on the server too once there is one. The front-end check is for the user, not for security.
