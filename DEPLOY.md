# Deploy Configuration

## Vercel Environment Variables

Configure these in the Vercel Dashboard (Settings > Environment Variables):

### Required

| Variable | Value | Description |
|----------|-------|-------------|
| `MISSION_CONTROL_PASSWORD` | `mc-marcel-2024` | Password for login |
| `AUTH_SECRET` | `jarbas-mission-control-secret-key-change-me` | Secret for session tokens |
| `NEXT_PUBLIC_CONVEX_URL` | `https://basic-platypus-34.convex.cloud` | Convex backend URL |

### Optional

| Variable | Value | Description |
|----------|-------|-------------|
| `CONVEX_DEPLOY_KEY` | (from .env.local) | For Convex deploy |

## How to Configure

1. Go to: https://vercel.com/jarbas-mxm/mission-control/settings/environment-variables
2. Add each variable above
3. Select all environments (Production, Preview, Development)
4. Redeploy: `vercel --prod` or trigger from GitHub

## Local Development

Copy `.env.local.example` to `.env.local` and fill in values:

```bash
cp .env.local.example .env.local
```

## Current Status

- ✅ Mobile responsive layout implemented
- ✅ Task management (create, move, delete)
- ✅ Auth system (login page, middleware, logout)
- ⚠️ Vercel needs ENV vars configured
