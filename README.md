## VEZcore

Internal VEZ application built with Next.js, React and TypeScript. In the Lab it
uses the primary PostgreSQL instance on Proxmox, a separate VEZvision PostgreSQL
database through private PostgREST services, Better Auth and S3-compatible MinIO.

## Local development

Install dependencies and run the development server:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Copy the variable names from `.env.example` and fill them from the Lab secret
store. Never commit database URLs, Better Auth secrets or S3 credentials.

The `develop` deployment is available at
`https://vezcoretest.vezlabs.dev`. Runtime secrets are managed in Coolify.

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
