## VEZcore

Internal VEZ application built with Next.js, React, TypeScript, and Supabase.

## Local development

Install dependencies and run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a local `.env.local` with the Supabase values required by the application. Do not commit credentials or service-role keys.

## Quality checks

Run these before opening a pull request:

```bash
npm run lint
npm run test:security
npm run build
```

GitHub Actions runs the same checks for pull requests and commits to `develop` and `main`.

## Branches

- `main` is the production branch.
- `develop` is the pre-production integration branch.
- Use short-lived branches and merge through pull requests.
