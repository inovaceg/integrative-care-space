# AI Rules

## Tech stack
- React 19 with TypeScript; keep application code typed and place source under `src/`.
- TanStack Start provides the application runtime and server integration.
- TanStack Router owns file-based routing; route modules live in `src/routes/` and the generated route tree is not hand-edited.
- Vite is the development and build tool; Tailwind CSS 4 is integrated through Vite.
- Supabase JavaScript client is used for the configured backend and data access (`src/integrations/supabase/`).
- TanStack Query manages asynchronous server data and caching where needed.
- shadcn/ui components, built on Radix UI, are the standard accessible UI primitives.
- React Hook Form and Zod handle form state and schema validation.
- Lucide React supplies icons; Recharts supplies data visualizations.
- Domain utilities and tests live in `src/lib/`; use the existing Bun test setup for tests.

## Library and implementation rules
- Use TanStack Router for navigation, route definitions, and route-level data patterns. Do not introduce React Router or edit `src/routeTree.gen.ts` by hand.
- Build interfaces with existing components from `src/components/ui/` (shadcn/ui) and Tailwind utility classes. Do not edit generated UI primitives unless explicitly requested; compose or wrap them in focused components instead.
- Use Radix primitives only through existing shadcn/ui components when possible. Add raw Radix usage only when no existing component fits.
- Use `lucide-react` for interface icons; avoid adding another icon library.
- Use React Hook Form for non-trivial forms and Zod schemas for boundary validation. Use `@hookform/resolvers` to connect them.
- Use TanStack Query for remote/asynchronous data fetching and cache state; use local React state for transient UI state.
- Use the existing Supabase client for backend operations. Keep credentials and privileged operations out of client code; never hardcode secrets.
- Use Recharts for charts and `date-fns` for date formatting/calculation. Prefer existing domain helpers over duplicating business logic.
- Use `pdfmake` for PDF generation, `xlsx` for spreadsheet import/export, and `mammoth` for Word document extraction only in their relevant document workflows.
- Keep reusable components in `src/components/`, page/route modules in `src/routes/`, and shared business logic in `src/lib/`. Follow the existing feature folder conventions.
- Use Tailwind CSS for styling; keep custom CSS limited to effects or rules that are impractical with utilities, and avoid introducing a second styling system.
- Add dependencies only when the existing stack cannot reasonably meet the need. Do not replace established libraries or introduce overlapping tools without a clear requirement.
- Keep changes focused, accessible, and responsive. Validate user-provided data at system boundaries and avoid unsafe HTML rendering.
