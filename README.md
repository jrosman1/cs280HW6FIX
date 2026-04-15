# Hello App

Minimal hello-world scaffold for the final homework in Full-Stack JavaScript.

The repo keeps the course stack in place:

- React 19 + Vite
- TanStack Router
- Convex
- Tailwind CSS + a small set of shadcn-style UI primitives

The app is intentionally stripped down to a minimal hello-world page with:

- a public Convex query
- a minimal route/layout structure
- Vite, TanStack Router, and Convex already wired together
- a GitHub Actions workflow for automated GitHub Pages deployment

Authentication, schema design, data modeling, CRUD operations, authorization, pagination, seeding, and the actual application itself are intentionally left for you to implement.

## Run locally

1. Install dependencies with `pnpm install`.
2. The first time you run the project, run `npx convex dev` and complete the Convex project setup.
3. After that, start everything together with:

```bash
pnpm run dev
```

4. Open the app at `http://localhost:5173/`.
