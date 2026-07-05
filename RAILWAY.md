# Railway Deployment

Dieses Repository wird auf Railway am einfachsten als drei Services betrieben:

1. `PostgreSQL` ueber Railway Plugin
2. `formularservice-api` als Node Service
3. `formularservice-web` als Node Service fuer das gebaute React-Frontend

## API Service

Source: dieses GitHub Repository

Build command:

```sh
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @formularservice/api prisma:generate && pnpm --filter @formularservice/api build
```

Start command:

```sh
pnpm --filter @formularservice/api prisma:deploy && pnpm --filter @formularservice/api start
```

Wichtige Variablen:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
NODE_ENV=production
OIDC_ISSUER_URL=https://<dein-oidc-provider>/realms/formularservice
OIDC_AUDIENCE=formularservice-api
PUBLIC_APP_URL=https://<deine-web-domain>
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM=no-reply@<deine-domain>
```

Railway setzt `PORT` automatisch. Die API liest `PORT`, wenn `API_PORT` nicht gesetzt ist.

## Web Service

Source: dieses GitHub Repository

Build command:

```sh
corepack enable && pnpm install --frozen-lockfile && pnpm --filter @formularservice/web build
```

Start command:

```sh
pnpm --filter @formularservice/web start
```

Wichtige Variablen:

```env
VITE_API_URL=https://<deine-api-domain>/api
VITE_OIDC_AUTHORITY=https://<dein-oidc-provider>/realms/formularservice
VITE_OIDC_CLIENT_ID=formularservice-web
```

## OIDC Redirects

Im OIDC Provider muessen mindestens diese Redirect URIs erlaubt sein:

```text
https://<deine-web-domain>
https://<deine-web-domain>/
```

## Nach dem Deploy

- API Health: `https://<deine-api-domain>/api/health`
- Swagger: `https://<deine-api-domain>/docs`
- Web: `https://<deine-web-domain>`
