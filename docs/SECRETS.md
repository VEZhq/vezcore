# Secrets Manager Setup

## Overview
vezCore uses environment variables for sensitive configuration. In production, these should be stored in a secrets manager rather than `.env.local`.

## Required Secrets

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)

### Discord
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_SECURITY_CHANNEL_ID` - Security alerts channel
- `DISCORD_AUDIT_CHANNEL_ID` - Audit log channel
- `DISCORD_USERS_CHANNEL_ID` - Users activity channel

## Production Setup

### Vercel
1. Go to Project Settings → Environment Variables
2. Add each secret with production value
3. Mark sensitive values as "Sensitive"

### Docker
Use Docker secrets or mount a secrets volume:
```bash
docker run -e SUPABASE_SERVICE_ROLE_KEY=$(cat /run/secrets/supabase_key) ...
```

### AWS
Use AWS Secrets Manager or Parameter Store:
```typescript
import { SecretsManager } from '@aws-sdk/client-secrets-manager'

const client = new SecretsManager({ region: 'eu-west-1' })
const secret = await client.getSecretValue({ SecretId: 'vezcore-prod' })
```

### Google Cloud
Use Google Secret Manager:
```typescript
import { SecretManagerServiceClient } from '@google-cloud/secret-manager'

const client = new SecretManagerServiceClient()
const [version] = await client.accessSecretVersion({
  name: 'projects/PROJECT/secrets/SUPABASE_KEY/versions/latest',
})
```

## Security Best Practices

1. **Never commit secrets to git**
2. **Rotate keys regularly**
3. **Use different keys for dev/staging/prod**
4. **Audit access to secrets**
5. **Use least-privilege principle**

## Local Development

For local development, use `.env.local` (gitignored):
```bash
cp .env.example .env.local
# Edit .env.local with your values
```

## Verification

Run this to verify all required secrets are set:
```bash
npm run check-env
```
