# Project Guidance

## Tech stack
- React 19 with TypeScript; keep application code typed and in `src/`.
- Vite provides the development server and build pipeline, with TanStack Start for the app runtime.
- TanStack Router owns file-based routing; route modules live in `src/routes/`, with the generated route tree in `src/routeTree.gen.ts` (do not hand-edit generated files).
- TanStack Query manages server/async data caching and synchronization.
- Tailwind CSS v4 is the styling system; shared global styles are in `src/styles.css`.
- shadcn/ui components are in `src/components/ui/` and use Radix UI primitives.
- Supabase JS is the backend client; use the existing client in `src/integrations/supabase/client.ts`.
- React Hook Form and Zod are the standard form and input-validation tools.
- Lucide React supplies icons; Recharts supplies charts.
- Bun runs tests and scripts; Vitest is not configured, so follow existing Bun test patterns.

## Library and implementation rules
- Use TanStack Router for navigation, route definitions, links, and route parameters. Add pages as route modules under `src/routes/`; do not introduce React Router or a second routing system.
- Use TanStack Query for async/server state. Keep transient UI state in React state; avoid duplicating query data in component state.
- For UI, prefer existing shadcn/ui components from `src/components/ui/`, composing Radix primitives through them. Do not modify generated shadcn/ui files unless the requested change specifically requires it; build app-specific components in `src/components/`.
- Use Tailwind utility classes for component styling and `src/styles.css` for global styles. Avoid introducing another CSS framework or styling system.
- Use React Hook Form with Zod for forms that need structured validation; use native controlled inputs for simple forms. Keep validation at user-input boundaries.
- Use the existing Supabase client for database/auth access. Keep credentials and privileged operations out of client code; never hardcode secrets.
- Use `date-fns` for date operations, `lucide-react` for icons, and Recharts for data visualizations rather than adding alternatives.
- Use `pdfmake` for PDF generation, `xlsx` for spreadsheet import/export, and `mammoth` for DOCX extraction, matching existing project utilities.
- Put reusable domain logic in `src/lib/` and shared UI in `src/components/`; keep route files focused on route composition and data flow.
- Follow existing Bun test conventions and keep tests alongside related logic. Do not add dependencies when an installed library already covers the need.
- Keep changes narrowly scoped, accessible, and consistent with the existing Portuguese-language product and code patterns.
