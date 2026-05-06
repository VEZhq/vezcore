# 🔐 SECURITY ALERT - SECRETS ROTATION REQUIRED

## ⚠️ CRITICAL: Your secrets have been exposed!

The following secrets were found in `.env.local` and MUST be rotated IMMEDIATELY:

---

## 1. Supabase Service Role Key

**What it exposes:** Full admin access to your entire Supabase database, bypassing all RLS policies.

### Steps to rotate:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `glgldtfuvahmrlkywdoy`
3. Navigate to: **Settings** → **API** → **Service Role Key**
4. Click **Reset Service Role Key** (if available) or regenerate
5. Copy the NEW key
6. Update `.env.local` with the new key
7. **Restart your application**

> ⚠️ **Note:** If Supabase doesn't allow key rotation, you may need to:
> - Create a new Supabase project
> - Migrate all data
> - Update all references

---

## 2. Discord Bot Token

**What it exposes:** Full access to your Discord bot, can read messages, send messages, modify channels.

### Steps to rotate:

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your application (bot)
3. Navigate to: **Bot** → **Token**
4. Click **Reset Token**
5. Copy the NEW token
6. Update `.env.local` with the new token
7. **Restart your application**

---

## 3. After Rotation

1. **Never commit `.env.local`** - it's already in `.gitignore`
2. Use environment variables in production (Vercel, Netlify, etc.)
3. Consider using a secrets manager (Vault, AWS Secrets Manager)
4. Audit logs for any suspicious activity during exposure period

---

## Prevention

Add to `.gitignore`:
```gitignore
# Environment files
.env
.env.*
.env.local
.env.*.local
!.env.example
```

---

**Created:** 2025-03-26
**Severity:** CRITICAL
**Status:** ACTION REQUIRED
