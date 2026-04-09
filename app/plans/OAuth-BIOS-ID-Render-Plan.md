# Auth System: Email OTP + Device Trust
## Using @node-oauth/oauth2-server + jose

**Context:** geek-seo-autopilot currently uses NextAuth v5 with Google OAuth. The goal
is to replace this with a standalone auth microservice (`geek-auth-service`) that issues
OAuth 2.0 tokens via a custom OTP grant type. Any future project reuses the same service.

---

## Library Choices (researched from oauth.net)

| Layer | Library | Why |
|-------|---------|-----|
| Auth service — token server | `@node-oauth/oauth2-server` | OAuth 2.0 token server; custom grant types via `AbstractGrantType`; model interface maps to Prisma |
| Auth service — JWT signing | `jose` | Signs access + refresh tokens with HS256; same lib used on both sides |
| Auth service — OTP hashing | `bcryptjs` | Hash OTPs before storage; `bcrypt.compare()` in `getUser` model method |
| Auth service — email | `resend` | Send OTP emails |
| Auth service — BIOS ID (Electron) | `node-machine-id` | Cross-platform hardware machine ID; fallback when `wmic`/`dmidecode` unavailable |
| Auth service — Slack alerts | `@slack/bolt` | Interactive button handling with built-in signature verification; replaces deprecated `@slack/interactive-messages` |
| Consuming app — JWT verify | `jose` | Edge-compatible, no deps, OpenID Certified; verifies JWTs at Next.js middleware layer |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  geek-auth-service  (Render.com)                             │
│  Express + @node-oauth/oauth2-server + Prisma + Postgres     │
│                                                              │
│  POST /oauth/token                                           │
│    grant_type=urn:geek:otp   → verify OTP → issue JWT        │
│    grant_type=urn:geek:device → verify device → issue JWT    │
│    grant_type=refresh_token  → refresh JWT                   │
│  POST /auth/send-otp         → email OTP (not OAuth bound)   │
│  POST /auth/logout           → revoke token                  │
│  GET  /auth/me               → decode token → return user    │
└───────────────────────┬──────────────────────────────────────┘
                        │  JWT (verified locally via shared secret)
              ┌─────────▼──────────┐
              │ geek-seo-autopilot │
              │  Next.js           │
              │                    │
              │  /api/auth/*       │  ← proxy routes (AUTH_SERVICE_URL server-only)
              │  middleware.ts     │  ← jose JWT guard at edge
              │  lib/auth.ts       │  ← server-side JWT decode
              └────────────────────┘
```

---

## Auth Service — Key Implementation Detail

### TypeScript Model Interfaces

The package is **`@node-oauth/oauth2-server`** (not `express-oauth-server`, which is a
wrapper; we'll use the base library directly). The `model` object implements `BaseModel`:

```ts
import OAuthServer, { Client, Token, User, BaseModel } from '@node-oauth/oauth2-server';

interface OAuthClient extends Client {
  id: string;       // consuming app client ID (e.g. "geek-seo-autopilot")
  grants: string[];
  redirectUris: string[];
}

interface OAuthUser extends User {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

const model: BaseModel = {
  // getClient — returns registered consuming app by clientId
  // Full implementation in model.ts below
  getClient: async (clientId, clientSecret) => { /* see getClient implementation */ },
  saveToken: async (token, client, user) => { /* see saveToken implementation */ },
  getAccessToken: async (accessToken) => { /* see getAccessToken implementation */ },
  getUser: async (email, secret) => { /* see getUser implementation */ },
  revokeToken: async (token) => { /* see revokeToken implementation */ },
};

// src/grants/OtpGrantType.ts
import { AbstractGrantType, Request, Client, Token, OAuthError } from 'oauth2-server';

export class OtpGrantType extends AbstractGrantType {
  async handle(request: Request, client: Client): Promise<Token> {
    const { email, otp, biosId } = request.body;

    if (!email || !otp) {
      throw new OAuthError('Missing parameter: email or otp', { code: 400 });
    }

    // getUser verifies OTP hash against PendingVerification, upserts Device
    const user = await this.model.getUser!(email, otp);
    if (!user) {
      throw new OAuthError('Invalid email or OTP', { code: 401 });
    }

    // Pass biosId forward via token extras so saveToken() can bind it to the record
    return this.saveToken(user, client, 'urn:geek:otp', { bios_id: biosId });
  }
}

// src/grants/DeviceGrantType.ts — silent login for trusted devices
export class DeviceGrantType extends AbstractGrantType {
  async handle(request: Request, client: Client): Promise<Token> {
    const { email, biosId } = request.body;

    if (!email || !biosId) {
      throw new OAuthError('Missing parameter: email or biosId', { code: 400 });
    }

    // Custom model method — checks Device.mfaExpiresAt > now()
    const user = await (this.model as any).validateTrustedDevice(email, biosId);
    if (!user) {
      throw new OAuthError('Device not trusted or MFA expired', { code: 401 });
    }

    return this.saveToken(user, client, 'urn:geek:device', { bios_id: biosId });
  }
}

// model.ts — add validateTrustedDevice alongside standard BaseModel methods
const model = {
  // ... standard methods (getClient, saveToken, getAccessToken, getUser, revokeToken) ...

  validateTrustedDevice: async (email: string, biosId: string): Promise<OAuthUser | null> => {
    const now = new Date();

    // Single query — join device → user → roles → permissions
    const device = await prisma.device.findFirst({
      where: {
        deviceId: biosId,
        user: { email },
        mfaExpiresAt: { gt: now }, // strict future check — expired = not trusted
      },
      include: {
        user: {
          include: {
            roles: {
              include: { role: { include: { permissions: { include: { permission: true } } } } },
            },
          },
        },
      },
    });

    if (!device) return null; // unknown device or trust expired → Electron falls back to OTP flow

    const permissions = device.user.roles.flatMap(ur =>
      ur.role.permissions.map(rp => rp.permission.name)
    );
    return {
      id: device.user.id,
      email: device.user.email,
      name: device.user.name,
      plan: device.user.plan,
      roles: device.user.roles.map(ur => ur.role.name),
      permissions,
    };
  },
};

const oauth = new OAuthServer({
  model,
  extendedGrantTypes: {
    'urn:geek:otp':    OtpGrantType,
    'urn:geek:device': DeviceGrantType,
  },
  allowExtendedTokenAttributes: true, // required for custom bios_id attribute on token
});

// Apply rate limiting strategically — OTP + password grants only (not refresh)
app.post('/oauth/token', async (req, res, next) => {
  const isRefresh = req.body.grant_type === 'refresh_token';
  const isOtpOrPassword = req.body.grant_type === 'urn:geek:otp' ||
                          req.body.grant_type === 'password';

  // Strict limit (5 per 15 min) only on OTP + password grants
  if (isOtpOrPassword) {
    return strictLimiter(req, res, () => handleTokenRequest(req, res, next));
  }

  // Refresh grants: global limit only (100 per 1 min)
  handleTokenRequest(req, res, next);
});

async function handleTokenRequest(req, res, next) {
  // Refresh token: validate BIOS ID matches the one that created the token
  if (req.body.grant_type === 'refresh_token') {
    const tokenData = await model.getRefreshToken(req.body.refresh_token);
    if (tokenData?.biosId && tokenData.biosId !== req.body.biosId) {
      return res.status(401).json({ error: 'Device mismatch: token invalid for this machine.' });
    }
  }

  // Upsert device record before token issuance
  if (req.body.biosId && req.body.email) {
    const userId = (await prisma.user.findUnique({ where: { email: req.body.email } }))?.id;
    if (userId) {
      await prisma.device.upsert({
        where: { userId_deviceId: { userId, deviceId: req.body.biosId } },
        update: { lastLoginAt: new Date(), status: 'active' },
        create: {
          userId,
          deviceId: req.body.biosId,
          userAgent: req.headers['user-agent'] as string,
          status: 'active',
        },
      });
    }
  }

  next();
}
```

### `otp.service.ts` — OTP Generation, Storage & Delivery

```ts
// src/services/otp.service.ts
import { Resend } from 'resend';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY);

export const otpService = {
  /**
   * Generates a 6-digit OTP, bcrypt-hashes it, upserts PendingVerification,
   * and sends via Resend. One active OTP per email at a time.
   */
  async generateAndSend(email: string): Promise<{ success: true }> {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Upsert — resend overwrites previous code + resets attempt counter
    await prisma.pendingVerification.upsert({
      where:  { email },
      update: { otpHash, expiresAt, attempts: 0 },
      create: { email, otpHash, expiresAt },
    });

    const { error } = await resend.emails.send({
      from:    'Geek SEO <auth@geek-seo.com>',
      to:      [email],
      subject: 'Your Verification Code',
      html: `
        <p>Your verification code is:</p>
        <h2 style="letter-spacing:0.2em">${otp}</h2>
        <p>Expires in 5 minutes. Do not share this code.</p>
      `,
      text: `Your code is: ${otp}. Expires in 5 minutes.`,
    });

    if (error) throw new Error(`Resend failed: ${error.message}`);
    return { success: true };
  },

  /**
   * Verifies OTP against stored hash. Enforces 5-attempt brute-force lockout.
   * Deletes record on success (single-use); blocks on lockout.
   * Called by model.getUser() in the OTP grant flow.
   */
  async verify(email: string, plainOtp: string): Promise<boolean> {
    const record = await prisma.pendingVerification.findUnique({ where: { email } });

    if (!record) return false;
    if (record.expiresAt < new Date()) {
      await prisma.pendingVerification.delete({ where: { email } }); // expired
      return false;
    }

    // Brute-force lockout: 5 failed attempts
    if (record.attempts >= 5) {
      // Could add a timed cooldown here, but single-use OTP deletion on success makes replay harder
      return false;
    }

    const isValid = await bcrypt.compare(plainOtp, record.otpHash);
    if (isValid) {
      // Success: delete immediately (single-use)
      await prisma.pendingVerification.delete({ where: { email } });
    } else {
      // Failure: increment attempt counter
      await prisma.pendingVerification.update({
        where: { email },
        data: { attempts: record.attempts + 1 },
      });
    }

    return isValid;
  },
};
```

**`PendingVerification` model with `attempts` counter** — enforced in `otpService.verify()`:
```prisma
model PendingVerification {
  id        String   @id @default(cuid())
  email     String   @unique
  otpHash   String
  expiresAt DateTime
  attempts  Int      @default(0) // increment on failed verify; lockout at threshold
  createdAt DateTime @default(now())
}
```

**Full `getUser` implementation using `otpService.verify`:**

```ts
getUser: async (email: string, secret: string): Promise<OAuthUser | undefined> => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: { role: { include: { permissions: { include: { permission: true } } } } }
      }
    }
  });

  if (!user) return undefined;

  const isOtp = /^\d{6}$/.test(secret);

  if (isOtp) {
    // OTP grant: delegate to service for verification + single-use deletion
    const valid = await otpService.verify(email, secret);
    if (!valid) return undefined;
    // otpService.verify already deleted PendingVerification on success

    // Refresh 30-day device trust window
    const biosId = requestContext.getStore()?.biosId;
    if (biosId) {
      const mfaExpiresAt = new Date();
      mfaExpiresAt.setDate(mfaExpiresAt.getDate() + 30);
      await prisma.device.upsert({
        where: { userId_deviceId: { userId: user.id, deviceId: biosId } },
        update: {
          mfaExpiresAt,
          mfaVerifiedAt: new Date(),
          ipAddress: requestContext.getStore()?.ipAddress,
          lastLoginAt: new Date(),
        },
        create: {
          userId: user.id,
          deviceId: biosId,
          mfaExpiresAt,
          mfaVerifiedAt: new Date(),
          userAgent: requestContext.getStore()?.userAgent,
          ipAddress: requestContext.getStore()?.ipAddress,
        },
      });
    }
  } else {
    // Password grant: verify bcrypt hash
    if (!user.password) return undefined; // user has no password set
    const valid = await bcrypt.compare(secret, user.password);
    if (!valid) return undefined;
  }

  // Build permissions array from roles
  const permissions = user.roles.flatMap(ur =>
    ur.role.permissions.map(rp => rp.permission.name)
  );
  const roles = user.roles.map(ur => ur.role.name);

  return { id: user.id, email: user.email, name: user.name, plan: user.plan, roles, permissions };
},
```

**Exposed via route:**
```ts
// POST /auth/send-otp
router.post('/send-otp', strictLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  await otpService.generateAndSend(email);
  res.json({ success: true }); // never reveal if email exists
});
```

**Env var required:** `RESEND_API_KEY` — set in Render dashboard.

### `token.service.ts` — JWT Signing (Auth Service)

Same Render Secret Files pattern as the consuming app — ensures both sides use identical secret.

```ts
// src/services/token.service.ts
import { SignJWT } from 'jose';
import { readFileSync, existsSync } from 'fs';

const getSecret = (filename: string, envFallback: string): Uint8Array => {
  const secretPath = `/etc/secrets/${filename}`;
  const raw = existsSync(secretPath)
    ? readFileSync(secretPath, 'utf8').trim()
    : process.env[envFallback] || 'dev-secret-key';
  return new TextEncoder().encode(raw);
};

const SECRET = getSecret('jwt-secret-file', 'AUTH_SERVICE_SECRET');
const ISSUER = 'geek-auth-service'; // must match middleware.ts issuer verification

export const tokenService = {
  /**
   * 15-minute access token — includes identity + RBAC claims
   * subject = user.id so x-user-id header works in Next.js middleware
   */
  generateAccessToken: async (user: {
    id: string;
    email: string;
    name: string | null;
    plan: string;
    roles: string[];
    permissions: string[];
  }): Promise<string> => {
    return new SignJWT({
      userId: user.id,        // payload.userId used by lib/auth.ts
      email: user.email,
      name: user.name,
      plan: user.plan,
      roles: user.roles,
      permissions: user.permissions,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setSubject(user.id)    // payload.sub = user.id → x-user-id header
      .setExpirationTime('15m')
      .sign(SECRET);
  },

  /**
   * 7-day refresh token — minimal claims, BIOS-locked in Prisma OAuthToken.biosId
   * Rotated on every use — old token deleted in prisma.$transaction
   */
  generateRefreshToken: async (userId: string): Promise<string> => {
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setSubject(userId)
      .setExpirationTime('7d')
      .sign(SECRET);
  },
};
```

**Custom grant types generate the JWT, not the framework:**

```ts
// OtpGrantType.handle() and DeviceGrantType.handle() both call:
return this.saveToken(user, client, 'urn:geek:otp', { bios_id: biosId });
// The framework calls model.saveToken() with the token object AFTER custom grants generate it
```

**`model.saveToken` stores the token in the database:**

```ts
saveToken: async (token, client, user) => {
  const now = new Date();

  await prisma.$transaction([
    prisma.oAuthToken.create({
      data: {
        accessToken:           token.accessToken,  // already generated by custom grant
        accessTokenExpiresAt:  token.accessTokenExpiresAt,
        refreshToken:          token.refreshToken,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        biosId:                token.bios_id ?? null,
        userId:                user.id,
        clientId:              client.id,
      },
    }),
    // Revoke previous token for this device (rotation)
    ...(token.previousRefreshToken ? [
      prisma.oAuthToken.deleteMany({ where: { refreshToken: token.previousRefreshToken } }),
    ] : []),
  ]);

  return { ...token, client, user };
},
```

**Token expiry is set in `tokenService` at sign time, not in `saveToken`:**
- Access token: 15 minutes
- Refresh token: 7 days
- Both use `jose` `setExpirationTime()` before signing

`token.previousRefreshToken` comes from `getRefreshToken()` and is used for rotation detection.


### Request Context — Passing biosId/ip/userAgent to model methods

`oauth2-server` model methods don't receive the raw Express request. Use Node.js
`AsyncLocalStorage` to thread request data through without globals:

```ts
// lib/request-context.ts
import { AsyncLocalStorage } from 'async_hooks';

interface RequestStore {
  biosId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export const requestContext = new AsyncLocalStorage<RequestStore>();

// Middleware: populate store before oauth.token() runs
app.use((req, _res, next) => {
  requestContext.run({
    biosId:    req.body.biosId,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  }, next);
});
```

`OtpGrantType.handle()` and `getUser` both access `requestContext.getStore()` —
no globals, no prop-drilling, no race conditions across concurrent requests.

### `saveToken` and `getRefreshToken` — BIOS ID binding

```ts
saveToken: async (token, client, user) => {
  // Use $transaction for token rotation — create new + revoke old atomically
  // Prevents split-brain sessions where two valid refresh tokens exist for one device
  await prisma.$transaction([
    prisma.oAuthToken.create({
      data: {
        accessToken: token.accessToken,
        accessTokenExpiresAt: token.accessTokenExpiresAt,
        refreshToken: token.refreshToken,
        refreshTokenExpiresAt: token.refreshTokenExpiresAt,
        biosId: token.bios_id ?? null,   // bind refresh token to device
        userId: user.id,
        clientId: client.id,
      },
    }),
    // Revoke previous token for this device (rotation)
    ...(token.previousRefreshToken ? [
      prisma.oAuthToken.deleteMany({
        where: { refreshToken: token.previousRefreshToken },
      }),
    ] : []),
  ]);
  return { ...token, client, user };
},

getRefreshToken: async (refreshToken) => {
  const record = await prisma.oAuthToken.findUnique({
    where: { refreshToken, isActive: true },
    include: {
      user: {
        include: {
          roles: {
            include: { role: { include: { permissions: { include: { permission: true } } } } },
          },
        },
      },
    },
  });

  if (!record) return undefined;

  // Flatten roles + permissions for the returned user object
  const roles = record.user.roles.map(ur => ur.role.name);
  const permissions = record.user.roles.flatMap(ur =>
    ur.role.permissions.map(rp => rp.permission.name)
  );

  return {
    refreshToken: record.refreshToken,
    refreshTokenExpiresAt: record.refreshTokenExpiresAt ?? undefined,
    biosId: record.biosId,
    client: { id: record.clientId, grants: ['refresh_token'] },
    user: {
      id: record.user.id,
      email: record.user.email,
      name: record.user.name,
      plan: record.user.plan,
      roles,
      permissions,
    },
  };
},
```

### Token Security — Electron Devices

| Practice | Implementation |
|----------|---------------|
| **Token rotation** | Issue new refresh token on every use; invalidate old one (prevents replay attacks) |
| **Short access token lifetime** | 15 minutes; use device-locked refresh token for long sessions |
| **Keychain storage** | `safeStorage` + `electron-store` in Main process — NOT localStorage (XSS-vulnerable). macOS→Keychain, Windows→DPAPI, Linux→KWallet/Libsecret |
| **BIOS-lock enforcement** | Refresh token rejected if `biosId` in request ≠ `biosId` stored with token |

```ts
// Electron Main process — secure token storage via safeStorage + electron-store
// safeStorage is NOT available in Renderer (by design)
import { safeStorage } from 'electron';
import Store from 'electron-store';

const store = new Store();

export const tokenService = {
  saveRefreshToken: (token: string): void => {
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(token);
      store.set('refresh_token', encrypted.toString('latin1'));
    }
  },
  getRefreshToken: (): string | null => {
    const encrypted = store.get('refresh_token') as string;
    if (!encrypted || !safeStorage.isEncryptionAvailable()) return null;
    return safeStorage.decryptString(Buffer.from(encrypted, 'latin1'));
  },
};

// Refresh session — runs in Main process, packages biosId with token
async function refreshSession() {
  const refreshToken = tokenService.getRefreshToken();
  const biosId = getBiosId();
  const response = await axios.post(`${AUTH_SERVICE_URL}/oauth/token`, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    bios_id: biosId,
  });
  tokenService.saveRefreshToken(response.data.refresh_token); // rotate
}
```

**Platform storage backend:**
| OS | Backend | Caveat |
|----|---------|--------|
| macOS | Keychain Access | Other apps need explicit user permission |
| Windows | DPAPI | Same-user apps on same machine can access |
| Linux | KWallet / Gnome Libsecret | Unprotected if no secret store available |

### Electron Silent Login — "Attempt, then Fallback"

On startup, Main process tries the device grant before showing any UI. Three outcomes:

```ts
// main.ts
ipcMain.handle('auth:initialize', async () => {
  const savedEmail = store.get('user_email') as string | undefined;
  if (!savedEmail) return { status: 'NEED_LOGIN' }; // first-time user

  try {
    // 1. Silent login — no UI shown
    const response = await axios.post(`${AUTH_SERVICE_URL}/oauth/token`, {
      grant_type: 'urn:geek:device',
      email: savedEmail,
      biosId: getBiosId(),
      client_id: 'geek-seo-electron',
    });

    // 2. Success: rotate tokens, skip login screen
    tokenService.saveRefreshToken(response.data.refresh_token);
    global.accessToken = response.data.access_token;
    return { status: 'AUTHENTICATED', user: response.data.user };

  } catch {
    // 3. Device trust expired or unknown → fall back to OTP
    return { status: 'NEED_OTP', email: savedEmail };
  }
});
```

Expose via `contextBridge`:
```ts
// preload.ts
contextBridge.exposeInMainWorld('authAPI', {
  // ...existing methods...
  initialize: () => ipcRenderer.invoke('auth:initialize'),
});
```

**Renderer startup (React):**
```ts
useEffect(() => {
  window.authAPI.initialize().then((result) => {
    if (result.status === 'AUTHENTICATED') router.push('/dashboard');
    else if (result.status === 'NEED_OTP')   router.push('/login/otp');   // pre-fill email
    else                                      router.push('/login/email'); // first-time
  });
}, []);
```

**Status state machine:**
```
NEED_LOGIN  → /login/email  → user enters email → send OTP → NEED_OTP
NEED_OTP    → /login/otp    → user enters code  → authenticated → /dashboard
AUTHENTICATED → /dashboard  (silent, no UI)
```

**Production considerations:**
- On every successful device grant or token refresh — rotate refresh token in `safeStorage`
- Offline: if network fails, `auth:initialize` throws; allow read-only "offline mode" if
  `global.accessToken` is still valid (not yet expired)
- Logout: `store.delete('user_email')` + POST `/auth/logout` (revoke server-side) +
  `tokenService` clear — removes all trust on that hardware

### IPC Bridge — Renderer ↔ Main Process

The Renderer never touches `safeStorage`, the filesystem, or raw tokens.
`contextBridge` exposes only the 3 functions the UI needs.

**`preload.ts`** — gatekeeper between Renderer and Main
```ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('authAPI', {
  saveTokens:     (tokens: { accessToken: string; refreshToken: string }) =>
                    ipcRenderer.invoke('auth:save-tokens', tokens),
  getAccessToken: () => ipcRenderer.invoke('auth:get-access-token'),
  refreshSession: (biosId: string) => ipcRenderer.invoke('auth:refresh-session', biosId),
});
```

**`main.ts`** — encryption + network calls stay here
```ts
import { ipcMain } from 'electron';
import { tokenService } from './tokenService';

// Access token: memory only (never written to disk)
// Refresh token: safeStorage via tokenService

ipcMain.handle('auth:save-tokens', async (_event, tokens) => {
  global.accessToken = tokens.accessToken;
  tokenService.saveRefreshToken(tokens.refreshToken);
  return { success: true };
});

ipcMain.handle('auth:get-access-token', () => global.accessToken ?? null);

ipcMain.handle('auth:refresh-session', async (_event, biosId) => {
  const refreshToken = tokenService.getRefreshToken();
  const response = await axios.post(`${AUTH_SERVICE_URL}/oauth/token`, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    bios_id: biosId,           // server rejects if BIOS ID doesn't match
  });
  tokenService.saveRefreshToken(response.data.refresh_token); // rotate
  global.accessToken = response.data.access_token;
  return { success: true };
});
```

**Renderer (React UI)** — only sees `window.authAPI`
```ts
// After OTP login
await window.authAPI.saveTokens({ accessToken, refreshToken });

// Authenticated API call
const token = await window.authAPI.getAccessToken();
axios.get('/api/sites', { headers: { Authorization: `Bearer ${token}` } });
```

**Security properties of this pattern:**
- Renderer never sees raw refresh token or encrypted bytes
- Access token lives in Main process memory only — not on disk
- Only 3 controlled functions exposed — no filesystem or crypto access from UI
- BIOS ID sent from Main process (where `getBiosId()` runs) — Renderer cannot spoof it

### BIOS ID — Electron Only

Device-locked tokens are a security feature for **native Electron apps only**. Web browsers
cannot reliably bind tokens to hardware (localStorage can be cleared, synced, or spoofed).

| Client | Auth Flow |
|--------|-----------|
| Electron app | OTP (initial) + device grant (subsequent: 30-day trust window) |
| Web browser | OTP only (no device trust; each session requires an OTP) |

If both Electron and web clients hit the same auth service, the web app omits `biosId`
in its requests, and the auth service declines device grants (returns 401). This is correct
behavior — web clients are untrusted by design.

**`getBiosId()` — Main process only, never Renderer**
```ts
import { execSync } from 'child_process';
import * as os from 'os';

export function getBiosId(): string {
  try {
    const platform = os.platform();
    let command: string;

    if (platform === 'win32') {
      // WMIC (legacy) — fallback to PowerShell on modern Windows
      command = 'wmic bios get serialnumber';
    } else if (platform === 'darwin') {
      command = "ioreg -l | grep IOPlatformSerialNumber | awk '{print $4}' | sed 's/\\\"//g'";
    } else {
      // Linux — requires no sudo; dmidecode needs root so avoid it
      command = 'cat /sys/class/dmi/id/product_serial';
    }

    const output = execSync(command).toString().trim();
    const id = platform === 'win32' ? output.split('\n')[1]?.trim() : output;

    // "To be filled by O.E.M." means no real serial — fall through to node-machine-id
    if (!id || id === 'To be filled by O.E.M.') throw new Error('No serial');
    return id;
  } catch {
    // Reliable cross-platform fallback — generates stable UUID from hardware fingerprint
    const { machineIdSync } = require('node-machine-id');
    return machineIdSync();
  }
}
```

**Platform commands:**
| OS | Command | Notes |
|----|---------|-------|
| Windows | `wmic bios get serialnumber` | Deprecated in Win 11 — use `Get-CimInstance Win32_BIOS` via PowerShell as alternative |
| macOS | `ioreg -l \| grep IOPlatformSerialNumber` | Standard; `system_profiler SPHardwareDataType` also works but slower |
| Linux | `/sys/class/dmi/id/product_serial` | No root needed; `dmidecode -s system-serial-number` requires sudo — avoid |

---

## Role-Based Access Control (RBAC)

Modeled after Auth0's RBAC: permissions are assigned to roles, roles are assigned to users.
The JWT includes `roles` and `permissions` arrays — consuming apps check them at the edge
with no database round-trip.

```
User ──< UserRole >── Role ──< RolePermission >── Permission
```

**API Permissions (seeded into `Permission` table on deploy):**
| Permission | Description |
|-----------|-------------|
| `read:sites` | View sites |
| `write:sites` | Create and update sites |
| `delete:sites` | Delete sites |
| `read:articles` | View articles |
| `write:articles` | Create and edit articles |
| `delete:articles` | Delete articles |
| `read:keywords` | View keyword research |
| `write:keywords` | Save and manage keywords |
| `read:analytics` | View analytics data |
| `read:brand` | View brand voices and audiences |
| `write:brand` | Create and edit brand voices and audiences |
| `manage:users` | Invite, assign roles, remove users (admin only) |

**Default roles for geek-seo-autopilot:**
| Role | Permissions |
|------|-------------|
| `owner` | All of the above |
| `editor` | `read:sites`, `write:articles`, `delete:articles`, `read:keywords`, `write:keywords`, `read:analytics`, `read:brand`, `write:brand` |
| `viewer` | `read:sites`, `read:articles`, `read:keywords`, `read:analytics`, `read:brand` |

**JWT claims:**
```json
{
  "userId": "abc123",
  "email": "user@example.com",
  "plan": "pro",
  "roles": ["editor"],
  "permissions": ["read:sites", "write:articles", "read:analytics"]
}
```

---

**Seed script (`prisma/seed.ts`) — runs on deploy to populate roles + permissions:**
```ts
const permissions = [
  { name: "read:sites" },   { name: "write:sites" },  { name: "delete:sites" },
  { name: "read:articles" },{ name: "write:articles" },{ name: "delete:articles" },
  { name: "read:keywords" },{ name: "write:keywords" },
  { name: "read:analytics" },
  { name: "read:brand" },   { name: "write:brand" },
  { name: "manage:users" },
];

const roles = [
  {
    name: "owner",
    permissions: permissions.map((p) => p.name),
  },
  {
    name: "editor",
    permissions: [
      "read:sites", "write:articles", "delete:articles",
      "read:keywords", "write:keywords", "read:analytics",
      "read:brand", "write:brand",
    ],
  },
  {
    name: "viewer",
    permissions: ["read:sites", "read:articles", "read:keywords", "read:analytics", "read:brand"],
  },
];

// upsert all permissions, then upsert roles with their permission links
```

New users are assigned the `viewer` role by default. The Super Admin (first `owner`) is
created via the seed script below.

### Dual Auth: OTP + Password

The system supports **both OTP (primary) and password (optional) grants**:
- **OTP grant** (`urn:geek:otp`) — email-based, no password required, 5-min code expiry, single-use
- **Password grant** (`password`) — for users who set a password via `/auth/change-password`

The `User.password` field is **required** but initially empty/null for OTP-only users. After 
any user sets a password, they gain the ability to auth via password grant in addition to OTP.
The super admin is created with an empty password and must use OTP to first login, then set
a password if desired.

### Super Admin Seed Script (`prisma/seed.ts`)

The seed creates the admin user by email and assigns the `owner` role. Since `password` is
required but initially empty, explicitly set it to a placeholder (will be updated on first
password change). Alternatively, require `INITIAL_ADMIN_PASSWORD` env var at seed time.

```ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL;
  if (!adminEmail) throw new Error('INITIAL_ADMIN_EMAIL env var required');

  // 1. Upsert all permissions
  const permissionNames = [
    'read:sites', 'write:sites', 'delete:sites',
    'read:articles', 'write:articles', 'delete:articles',
    'read:keywords', 'write:keywords',
    'read:analytics',
    'read:brand', 'write:brand',
    'manage:users',
  ];
  for (const name of permissionNames) {
    await prisma.permission.upsert({ where: { name }, update: {}, create: { name } });
  }

  // 2. Upsert roles with their permissions
  const roles = {
    owner:  permissionNames,
    editor: ['read:sites','write:articles','delete:articles','read:keywords','write:keywords','read:analytics','read:brand','write:brand'],
    viewer: ['read:sites','read:articles','read:keywords','read:analytics','read:brand'],
  };
  for (const [roleName, perms] of Object.entries(roles)) {
    const role = await prisma.role.upsert({
      where: { name: roleName }, update: {}, create: { name: roleName },
    });
    for (const perm of perms) {
      const permission = await prisma.permission.findUnique({ where: { name: perm } });
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // 3. Upsert Super Admin user + assign owner role
  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: 'Super Admin', plan: 'pro' },
  });
  const ownerRole = await prisma.role.findUnique({ where: { name: 'owner' } });
  if (ownerRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: ownerRole.id } },
      update: {},
      create: { userId: user.id, roleId: ownerRole.id },
    });
  }

  console.log(`✅ Seeded: ${adminEmail} as owner`);
}

seed().catch(console.error).finally(() => prisma.$disconnect());
```

Add to `package.json`:
```json
"prisma": { "seed": "ts-node prisma/seed.ts" }
```

Run: `INITIAL_ADMIN_EMAIL=you@example.com npx prisma db seed`

**Security:** `INITIAL_ADMIN_EMAIL` is set as a one-time env var in Render dashboard.
No hardcoded credentials. Admin authenticates via OTP — no password to rotate.

---

## Auth Service — Prisma Schema

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["auth", "audit"]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

// Normalized RBAC — roles/permissions as tables, not arrays
// JWT claims (roles[], permissions[]) are built at token-signing time from these relations

model User {
  id          String       @id @default(uuid())
  email       String       @unique
  name        String?
  password    String?      // bcrypt hash — nullable: users can auth via OTP without password
  plan        String       @default("free")
  slackUserId String?      // for Slack interactive button RBAC
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  devices     Device[]
  tokens      OAuthToken[]
  roles       UserRole[]

  @@schema("auth")
}

model Role {
  id          String           @id @default(uuid())
  name        String           @unique  // "owner" | "editor" | "viewer"
  description String?
  permissions RolePermission[]
  users       UserRole[]

  @@schema("auth")
}

model Permission {
  id    String           @id @default(uuid())
  name  String           @unique  // "read:sites" | "write:articles" | "manage:users" etc.
  roles RolePermission[]

  @@schema("auth")
}

model RolePermission {
  roleId       String
  role         Role       @relation(fields: [roleId], references: [id])
  permissionId String
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
  @@schema("auth")
}

model UserRole {
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  roleId    String
  role      Role     @relation(fields: [roleId], references: [id])
  createdAt DateTime @default(now())

  @@id([userId, roleId])
  @@schema("auth")
}

model PendingVerification {
  id        String   @id @default(uuid())
  email     String   @unique
  otpHash   String              // bcrypt hash — plaintext never stored
  attempts  Int      @default(0) // increment on failed verify; lockout threshold: 5
  expiresAt DateTime            // now + 5 minutes
  createdAt DateTime @default(now())

  @@schema("auth")
}

model Device {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  deviceId      String              // BIOS serial / node-machine-id UUID
  userAgent     String?
  ipAddress     String?             // secondary audit trail for generic OEM BIOS IDs
  status        String    @default("active")  // "active" | "revoked"
  mfaVerifiedAt DateTime?
  mfaExpiresAt  DateTime?           // now + 30 days; null = not trusted
  lastLoginAt   DateTime @default(now())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, deviceId])      // upsert key — one record per user per machine
  @@schema("auth")
}

model OAuthToken {
  id                    String    @id @default(uuid())
  accessToken           String    @unique
  accessTokenExpiresAt  DateTime
  refreshToken          String    @unique  // non-nullable — always issued
  refreshTokenExpiresAt DateTime?
  biosId                String?            // BIOS-locks refresh token to specific hardware
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  clientId              String             // e.g. "geek-seo-autopilot" | "geek-seo-electron"
  scope                 String?
  isActive              Boolean   @default(true)
  createdAt             DateTime  @default(now())

  @@schema("auth")
}

// Audit schema — isolated, tamper-evident
model AuditLog {
  id        Int      @id @default(autoincrement())
  action    String   // e.g. "revoke_session" | "change_password" | "device_trust_refresh"
  adminId   String?  // null if action by system/scheduler
  targetId  String?  // user ID of the target, if applicable
  metadata  Json?    // action-specific details
  createdAt DateTime @default(now())

  @@index([action])
  @@index([adminId])
  @@index([targetId])
  @@map("audit_logs")
  @@schema("audit")
}

model CircuitResetLog {
  id               Int      @id @default(autoincrement())
  serviceName      String
  actionBySlackId  String
  actionByUsername String?
  previousState    String
  currentState     String
  metadata         Json?
  executedAt       DateTime @default(now())

  @@index([serviceName])
  @@index([actionBySlackId])
  @@map("circuit_resets")
  @@schema("audit")
}
```

**Design decisions:**
- `uuid()` over `cuid()` — standard, portable, works with external tooling
- `refreshToken String @unique` (non-nullable) — every token issuance produces a refresh token
- `isActive Boolean` on `OAuthToken` — soft revocation; hard delete via admin routes
- Normalized RBAC tables (not `roles String[]` arrays) — supports permission changes without re-issuing tokens; JWT claims built at sign time from relations
- Cascade deletes on `Device` and `OAuthToken` — user deletion cleans up all hardware trust and active sessions automatically
- Separate `auth` + `audit` schemas — audit logs isolated from app data; easier to lock with triggers

---

## Auth Service — Device Management Endpoints

Users can view and revoke their registered devices. Query `OAuthToken` for unique
`biosId` entries per `userId`.

```
GET  /auth/devices          → list all active devices for authenticated user
DELETE /auth/devices/:biosId → revoke all tokens for that BIOS ID
```

```ts
// GET /auth/devices
router.get('/devices', authenticate, async (req, res) => {
  const devices = await prisma.oAuthToken.findMany({
    where: { userId: req.user.id, isActive: true },
    select: {
      biosId: true,
      createdAt: true,
      accessTokenExpiresAt: true,
    },
    distinct: ['biosId'],
  });
  res.json(devices);
});

// DELETE /auth/devices/:biosId — revoke all tokens for this device
router.delete('/devices/:biosId', authenticate, async (req, res) => {
  await prisma.oAuthToken.updateMany({
    where: { userId: req.user.id, biosId: req.params.biosId },
    data: { isActive: false },
  });
  // Also clear device trust
  await prisma.device.updateMany({
    where: { userId: req.user.id, deviceId: req.params.biosId },
    data: { status: 'revoked' },
  });
  res.json({ ok: true });
});
```

Add `isActive Boolean @default(true)` to `OAuthToken` Prisma model for soft revocation.

### `authenticateAdmin` Middleware

Since RBAC is already in the plan, use `manage:users` permission from the JWT rather than
a separate `is_admin` boolean column. Chain after `oauth.authenticate()` which populates
`res.locals.oauth.token.user`.

```ts
// middleware/authenticate-admin.ts
import { Request, Response, NextFunction } from 'express';

export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = res.locals.oauth?.token?.user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: No active session' });
  }

  // Use RBAC permission (already in JWT) instead of is_admin boolean
  const permissions: string[] = user.permissions ?? [];
  if (!permissions.includes('manage:users')) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }

  next();
};

// Applied to all admin routes:
app.get('/admin/devices/:userId',  oauth.authenticate(), authenticateAdmin, listDevices);
app.post('/admin/revoke-session',  oauth.authenticate(), authenticateAdmin, revokeSession);
```

`getAccessToken` must include `roles` and `permissions` in the returned user object
(JOIN with `user_roles` + `role_permissions`) so the JWT claims are available in
`res.locals.oauth.token.user` for every authenticated request.

### `getAccessToken` — Full Implementation (`model.ts`)

```ts
getAccessToken: async (accessToken: string) => {
  const record = await prisma.oAuthToken.findUnique({
    where: { accessToken, isActive: true },
    include: {
      user: {
        include: {
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!record) return undefined;

  // Flatten roles + permissions from normalized RBAC tables
  const roles = record.user.roles.map(ur => ur.role.name);
  const permissions = record.user.roles.flatMap(ur =>
    ur.role.permissions.map(rp => rp.permission.name)
  );

  return {
    accessToken: record.accessToken,
    accessTokenExpiresAt: record.accessTokenExpiresAt,
    client: {
      id: record.clientId,
      grants: ['urn:geek:otp', 'urn:geek:device', 'refresh_token'],
    },
    user: {
      id: record.user.id,
      email: record.user.email,
      name: record.user.name,
      plan: record.user.plan,
      roles,
      permissions,
    },
  };
},
```

`roles` and `permissions` are now available at `res.locals.oauth.token.user` for
every request that passes through `oauth.authenticate()` — including `authenticateAdmin`
which checks `permissions.includes('manage:users')`.

### `getClient` — Registered Consuming Apps (`model.ts`)

Clients are registered in environment config — no DB table needed. Grants are fixed per
client ID. `clientSecret` is optional for public clients (Electron apps are public clients).

```ts
// src/config/clients.ts
export const REGISTERED_CLIENTS: Record<string, { grants: string[]; isPublic: boolean }> = {
  'geek-seo-autopilot': {
    grants: ['urn:geek:otp', 'refresh_token', 'password'],
    isPublic: false,
  },
  'geek-seo-electron': {
    grants: ['urn:geek:otp', 'urn:geek:device', 'refresh_token'],
    isPublic: true, // Electron apps cannot safely store a client secret
  },
};

// model.ts
getClient: async (clientId: string, clientSecret: string | null) => {
  const config = REGISTERED_CLIENTS[clientId];
  if (!config) return undefined;

  // Public clients (Electron) don't require a client secret
  if (!config.isPublic && clientSecret !== process.env.CLIENT_SECRET) return undefined;

  return {
    id: clientId,
    grants: config.grants,
    redirectUris: [],
  };
},
```

### `revokeToken` — Soft Revocation + Redis Blacklist (`model.ts`)

Soft-revokes via `isActive: false` in the DB. Also writes to Redis blacklist so the
corresponding short-lived access token is invalidated immediately without waiting for
its 15-minute expiry.

```ts
revokeToken: async (token) => {
  // Soft revoke in DB
  await prisma.oAuthToken.updateMany({
    where: { refreshToken: token.refreshToken },
    data: { isActive: false },
  });

  // Push to Redis blacklist — access token still valid for up to 15 min without this
  // Blacklist entry TTL matches access token lifetime
  if (token.accessToken) {
    await redis.set(`blacklist:${token.accessToken}`, '1', 'EX', 900);
  }

  return true; // oauth2-server expects boolean
},
```

**Redis blacklist check in `authenticate` middleware:**
```ts
// middleware/authenticate.ts — applied before all protected routes
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!accessToken) return res.status(401).json({ error: 'Unauthorized' });

  // Redis blacklist check — fast path, no DB call needed
  const blacklisted = await redis.get(`blacklist:${accessToken}`);
  if (blacklisted) return res.status(401).json({ error: 'Session revoked' });

  // oauth.authenticate() does the full DB lookup + expiry check
  next();
};
```

Apply `authenticate` before `oauth.authenticate()` on protected routes:
```ts
app.get('/auth/me', authenticate, oauth.authenticate(), (req, res) => {
  res.json(res.locals.oauth.token.user);
});
app.get('/auth/devices', authenticate, oauth.authenticate(), listDevices);
```

### `/auth/logout` Route

Revokes the current session's refresh token, clears the access token from Redis blacklist,
and returns confirmation. The consuming app's proxy route clears the httpOnly cookie.

```ts
// POST /auth/logout — requires active session
app.post('/auth/logout', authenticate, oauth.authenticate(), async (req, res) => {
  const token = res.locals.oauth.token;

  // Mark refresh token inactive + add access token to blacklist
  await model.revokeToken(token);

  res.json({ message: 'Logged out successfully' });
});
```

### Change Password Route

```ts
// lib/password-schema.ts — shared zod validation
import { z } from 'zod';

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(12, 'Password must be at least 12 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
```

```ts
// POST /auth/change-password — requires active session
app.post('/auth/change-password', strictLimiter, oauth.authenticate(), async (req, res) => {
  // Validate schema first (before DB calls)
  const validation = changePasswordSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.error.flatten().fieldErrors,
    });
  }

  const { oldPassword, newPassword } = validation.data;
  const userId = res.locals.oauth.token.user.id;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User not found' });

  // If user has a password, verify old one
  if (user.password) {
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { password: newHash } });

  // Revoke all other sessions — force re-auth on other devices
  await prisma.oAuthToken.updateMany({
    where: { userId, isActive: true, NOT: { accessToken: res.locals.oauth.token.accessToken } },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      action: 'change_password',
      adminId: userId,
      metadata: { ipAddress: req.ip },
    },
  });

  res.json({ message: 'Password updated. Other sessions have been logged out.' });
});
```

**Design:**
- `strictLimiter` on this route (5 per 15 min) prevents brute-force password setting
- Zod validation runs first — rejects weak passwords before bcrypt (saves CPU)
- `oldPassword` always required — no way to set password if you don't have one (users must use OTP first)
- All other sessions revoked via `isActive: false` (soft revocation) — not deleted, can be queried for audit trail
- Logged to `AuditLog` with request IP for security trail


### Rate Limiting

`express-rate-limit` — strict limits on sensitive auth routes, global limit on all others.

```ts
// lib/rate-limiters.ts
import rateLimit from 'express-rate-limit';

// Sensitive routes: /auth/change-password, /auth/send-otp, /oauth/token
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global API limiter
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
```

Applied in `app.ts`:
```ts
app.set('trust proxy', 1); // Required when behind Render's load balancer / Cloudflare

app.use(globalLimiter); // All routes

// Strict limiter on sensitive routes — runs BEFORE oauth.authenticate() and zod
app.post('/auth/change-password', strictLimiter, oauth.authenticate(), changePasswordHandler);
app.post('/auth/send-otp',        strictLimiter, sendOtpHandler);
app.post('/oauth/token',          strictLimiter, biosDeviceMiddleware, oauth.token());
```

**Packages:** `npm install express-rate-limit rate-limit-redis ioredis opossum @types/opossum`

### Redis Client (`lib/redis.ts`)

```ts
import Redis from 'ioredis';

export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 1,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

export let redisAvailable = true;
redisClient.on('connect', () => { redisAvailable = true; });
redisClient.on('error',   () => { redisAvailable = false; });
```

### Circuit Breaker (`lib/circuit-breaker.ts`)

Wraps Redis with Opossum. States: **Closed** (normal) → **Open** (failing fast) → **Half-Open** (testing recovery).

```ts
import CircuitBreaker from 'opossum';
import { redisClient } from './redis';

const breakerOptions = {
  timeout: 500,                  // >500ms = failure
  errorThresholdPercentage: 50,  // trip if 50% of recent calls fail
  resetTimeout: 30000,           // retry after 30s
};

async function execRedisCommand(...args: string[]) {
  return redisClient.call(args[0], ...args.slice(1));
}

export const redisBreaker = new CircuitBreaker(execRedisCommand, breakerOptions);
redisBreaker.fallback(() => null); // fail-open: let request through
redisBreaker.on('open',     () => console.warn('🚧 Redis circuit OPEN — using fallback'));
redisBreaker.on('halfOpen', () => console.info('🔁 Redis circuit HALF-OPEN — testing'));
redisBreaker.on('close',    () => console.info('✅ Redis circuit CLOSED — recovered'));
```

### Lua Atomic State Transition

Failure increment + circuit trip in one indivisible Redis operation — no race conditions:

```lua
-- scripts/trip-circuit.lua
-- KEYS[1]: circuit:{service}:failures
-- KEYS[2]: circuit:{service}:state
-- ARGV[1]: threshold (e.g. "5")
-- ARGV[2]: open TTL in seconds (e.g. "30")

local failures = redis.call("INCR", KEYS[1])
if tonumber(failures) >= tonumber(ARGV[1]) then
  redis.call("SET", KEYS[2], "OPEN", "EX", tonumber(ARGV[2]))
  redis.call("DEL", KEYS[1])
  return "TRIPPED"
end
return "INCREMENTED"
```

```ts
// lib/circuit-breaker.ts
const TRIP_SCRIPT = fs.readFileSync('./scripts/trip-circuit.lua', 'utf8');

export async function recordFailure(serviceName: string) {
  const keys = [`circuit:${serviceName}:failures`, `circuit:${serviceName}:state`];
  const result = await redisClient.eval(TRIP_SCRIPT, keys.length, ...keys, '5', '30');
  if (result === 'TRIPPED') {
    await updateGlobalCircuitState(serviceName, 'OPEN');
  }
}
```

### Distributed Circuit Breaker (shared state across instances)

State stored in Redis itself — all instances share the same `OPEN`/`CLOSED`/`HALF_OPEN`:

```ts
export class DistributedCircuitBreaker {
  constructor(
    private redis: Redis,
    private serviceKey: string,
    private threshold = 5,
  ) {}

  async getState(): Promise<'CLOSED' | 'OPEN' | 'HALF_OPEN'> {
    return (await this.redis.get(`circuit:${this.serviceKey}:state`) as any) || 'CLOSED';
  }

  async recordFailure() {
    const failures = await this.redis.incr(`circuit:${this.serviceKey}:failures`);
    if (failures >= this.threshold) {
      await this.redis.set(`circuit:${this.serviceKey}:state`, 'OPEN', 'EX', 30);
      await this.redis.publish('circuit-events', JSON.stringify({ service: this.serviceKey, state: 'OPEN' }));
    }
  }

  async reset() {
    await this.redis.del(`circuit:${this.serviceKey}:failures`);
    await this.redis.set(`circuit:${this.serviceKey}:state`, 'CLOSED');
    await updateGlobalCircuitState(this.serviceKey, 'CLOSED');
  }
}

// Broadcast state change to all instances
const CIRCUIT_CHANNEL = 'prod:circuit:auth:state_change';

export async function updateGlobalCircuitState(serviceName: string, state: string) {
  await redisClient.publish(CIRCUIT_CHANNEL, JSON.stringify({
    circuit: serviceName, state, timestamp: Date.now(),
  }));
}
```

### Redis Pub/Sub — Real-Time State Propagation

Dedicated subscriber connection (subscriber mode blocks regular commands — must be separate client):

```ts
// lib/circuit-subscriber.ts
import Redis from 'ioredis';

const redisSubscriber = new Redis(process.env.REDIS_URL!);

// Local fast-cache — eliminates network call on every request
export const localCircuitState: Record<string, string> = {};

// On boot: hydrate from Redis before subscribing (catch missed messages)
export async function initializeCircuitState(serviceName: string) {
  const state = await redisClient.get(`circuit:${serviceName}:state`);
  localCircuitState[serviceName] = state || 'CLOSED';
  console.log(`🚀 Circuit ${serviceName} initialized as ${localCircuitState[serviceName]}`);
}

// Subscribe — receives real-time broadcasts from all instances
redisSubscriber.subscribe(CIRCUIT_CHANNEL, (err) => {
  if (err) console.error('Circuit subscriber failed:', err);
});

redisSubscriber.on('message', (_channel, message) => {
  const { circuit, state } = JSON.parse(message);
  localCircuitState[circuit] = state;
  console.log(`📡 Circuit ${circuit} → ${state}`);
});
```

### `ResilientCircuit` Class (`lib/resilient-circuit.ts`)

Single reusable module — bundles persistent state, Pub/Sub, local cache, and EventEmitter alerting:

```ts
import { EventEmitter } from 'events';
import Redis from 'ioredis';

type CircuitState = 'OPEN' | 'HALF_OPEN' | 'CLOSED';

export class ResilientCircuit extends EventEmitter {
  private localState: CircuitState = 'CLOSED';
  private readonly stateKey: string;
  private readonly channel: string;

  constructor(
    private readonly redisClient: Redis,
    private readonly redisSubscriber: Redis,
    public readonly serviceName: string,
  ) {
    super();
    this.stateKey = `circuit:${serviceName}:state`;
    this.channel  = `circuit:${serviceName}:broadcast`;
  }

  async init() {
    const remote = await this.redisClient.get(this.stateKey);
    this.updateLocalState((remote as CircuitState) || 'CLOSED');

    await this.redisSubscriber.subscribe(this.channel);
    this.redisSubscriber.on('message', (chan, msg) => {
      if (chan === this.channel) this.updateLocalState(JSON.parse(msg).state);
    });
    console.log(`[${this.serviceName}] Circuit initialized: ${this.localState}`);
  }

  private updateLocalState(newState: CircuitState) {
    const prev = this.localState;
    this.localState = newState;
    if (prev !== newState) {
      this.emit('stateChange', {
        service: this.serviceName, from: prev, to: newState,
        timestamp: new Date().toISOString(),
      });
    }
  }

  isOpen(): boolean { return this.localState === 'OPEN'; }

  async transitionTo(newState: CircuitState, ttlSeconds = 30) {
    if (newState === 'OPEN') {
      await this.redisClient.set(this.stateKey, newState, 'EX', ttlSeconds);
    } else {
      await this.redisClient.set(this.stateKey, newState);
    }
    await this.redisClient.publish(this.channel, JSON.stringify({ state: newState }));
    this.updateLocalState(newState);
  }
}
```

**Wired in `app.ts`:**
```ts
export const authCircuit = new ResilientCircuit(redisClient, redisSubscriber, 'auth-api');

authCircuit.on('stateChange', async ({ service, from, to }) => {
  if (to === 'OPEN') await sendSlackAlert(service, from, to);
});

authCircuit.on('stateChange', ({ service, from, to, timestamp }) => {
  console.log(`[circuit] ${service}: ${from} → ${to} at ${timestamp}`);
});

await authCircuit.init();
```

### Slack Utilities (`lib/slack.ts`)

**Block Kit alert card with interactive Reset button:**
```ts
import axios from 'axios';

export async function sendSlackAlert(service: string, from: string, to: string) {
  await axios.post(process.env.SLACK_WEBHOOK_URL!, {
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🚨 CIRCUIT BREAKER: ${service}`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Previous State:*\n${from}` },
          { type: 'mrkdwn', text: `*Current State:*\n*${to}*` },
        ],
      },
      { type: 'divider' },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `📍 *Timestamp:* ${new Date().toLocaleString()}` }],
      },
      {
        type: 'actions',
        elements: [{
          type: 'button',
          text: { type: 'plain_text', text: 'Reset Circuit', emoji: true },
          style: 'primary',
          value: service,
          action_id: 'reset_circuit_breaker',
          confirm: {
            title: { type: 'plain_text', text: 'Are you sure?' },
            text: { type: 'plain_text', text: 'This will resume traffic to the service.' },
            confirm: { type: 'plain_text', text: 'Yes, Reset' },
            deny: { type: 'plain_text', text: 'Cancel' },
          },
        }],
      },
    ],
  });
}
```

**Interactive button handler (`routes/slack.routes.ts`):**

Uses `@slack/bolt` — built-in signature verification, replaces deprecated `@slack/interactive-messages`.

```ts
import { App as SlackApp, ExpressReceiver } from '@slack/bolt';

// ExpressReceiver lets Bolt sit on our existing Express app
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
  endpoints: '/slack/actions',
});
const slack = new SlackApp({ receiver });

// Mount Bolt on the Express app
app.use(receiver.router);

// Interactive reset button handler
slack.action('reset_circuit_breaker', async ({ ack, body, respond }) => {
  await ack(); // Acknowledge within 3 seconds (Slack requirement)

  const slackUserId = body.user.id;
  const slackUsername = body.user.username;
  const serviceName = (body as any).actions[0].value;

  // RBAC: verify Slack user against DB (manage:users permission + slackUserId column)
  const user = await prisma.user.findFirst({
    where: { slackUserId },
    include: {
      roles: {
        include: { role: { include: { permissions: { include: { permission: true } } } } },
      },
    },
  });
  const canReset = user?.roles.some(ur =>
    ur.role.permissions.some(rp => rp.permission.name === 'manage:users')
  );

  if (!canReset) {
    await prisma.circuitResetLog.create({
      data: {
        serviceName,
        actionBySlackId: slackUserId,
        actionByUsername: slackUsername,
        previousState: 'OPEN',
        currentState: 'OPEN', // unchanged
        metadata: { interaction_type: 'unauthorized_attempt' },
      },
    });
    await respond({
      text: `❌ Permission denied. Only platform admins can reset the *${serviceName}* circuit.`,
      response_type: 'ephemeral',
      replace_original: false,
    });
    return;
  }

  const previousState = authCircuit.isOpen() ? 'OPEN' : 'CLOSED';
  await authCircuit.transitionTo('CLOSED');

  await prisma.circuitResetLog.create({
    data: {
      serviceName,
      actionBySlackId: slackUserId,
      actionByUsername: slackUsername,
      previousState,
      currentState: 'CLOSED',
      metadata: {
        slack_channel: (body as any).channel?.id,
        interaction_type: 'slack_button',
      },
    },
  });

  await respond({
    text: `✅ Circuit for *${serviceName}* reset by <@${slackUserId}>.`,
    replace_original: true,
  });
});

### Audit Log — Circuit Resets

Dedicated schema + table with JSONB metadata. Separate `audit` schema keeps it isolated
from application data and simplifies retention/archiving policies.

```prisma
// prisma/schema.prisma — add to auth service schema
model CircuitResetLog {
  id               Int      @id @default(autoincrement())
  serviceName      String
  actionBySlackId  String
  actionByUsername String?
  previousState    String
  currentState     String
  metadata         Json?    // { slack_channel, interaction_type, reason }
  executedAt       DateTime @default(now())

  @@index([serviceName])
  @@index([actionBySlackId])
  @@map("circuit_resets")
  @@schema("audit")
}
```

Both `auth` and `audit` schemas are already defined in the auth service Prisma schema — see `## Auth Service — Prisma Schema`.

**Integration in Slack reset handler:**
```ts
await prisma.circuitResetLog.create({
  data: {
    serviceName,
    actionBySlackId: payload.user.id,
    actionByUsername: payload.user.username,
    previousState: 'OPEN',
    currentState: 'CLOSED',
    metadata: {
      slack_channel: payload.channel.id,
      interaction_type: 'slack_button',
    },
  },
});
```

**Also log unauthorized attempts:**
```ts
await prisma.circuitResetLog.create({
  data: {
    serviceName,
    actionBySlackId: slackUserId,
    previousState: 'OPEN',
    currentState: 'OPEN', // state unchanged
    metadata: { interaction_type: 'unauthorized_attempt' },
  },
});
```

**Management:**
- Retention: archive or delete records older than 1 year via nightly cron
- Tamper-evidence: PostgreSQL row-level triggers to prevent UPDATE/DELETE on audit rows
- Retention: archive or delete records older than 1 year via nightly cron
- Tamper-evidence: PostgreSQL row-level triggers prevent UPDATE/DELETE on audit rows

### Grafana Dashboard — Circuit Reset Monitoring

**Data source:** Add PostgreSQL in Grafana → Data Sources. Use Supabase connection string.
Test with "Save & Test" before building panels.

**Time series panel — resets per service over time:**
```sql
SELECT
  $__timeGroupAlias(executed_at, 1h),  -- 1-hour buckets; Grafana recognizes "time" alias
  service_name AS metric,              -- separate line per service
  count(id) AS "resets"
FROM audit.circuit_resets
WHERE $__timeFilter(executed_at)       -- respects dashboard time range; critical for perf
GROUP BY 1, 2
ORDER BY 1;
```

**Dashboard variables** (Settings → Variables → Add):

| Variable | Query | Options |
|----------|-------|---------|
| `$service` | `SELECT DISTINCT service_name FROM audit.circuit_resets` | Multi-value, Include All |
| `$admin` | `SELECT DISTINCT action_by_username FROM audit.circuit_resets` | Multi-value, Include All |

**Filtered query using variables:**
```sql
SELECT
  $__timeGroupAlias(executed_at, 1h),
  service_name AS metric,
  count(id) AS "resets"
FROM audit.circuit_resets
WHERE $__timeFilter(executed_at)
  AND service_name IN ($service)
  AND action_by_username IN ($admin)
GROUP BY 1, 2
ORDER BY 1;
```

**Grafana Alert Rule** — triggers Slack notification if resets exceed threshold:
- Condition: `count(resets) > 10` within 1 hour for any service
- Notification channel: Slack webhook → `#geek-auth-alerts`
- This provides a second layer of alerting independent of the circuit breaker's own events

**Visualization recommendations:**
- Time series: trend over time per service
- Bar chart / State Timeline: burst detection — when exactly did resets cluster
- Stat panel: total resets today per service (quick health glance)

**New packages:** `npm install @slack/bolt`

**Env vars:**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
SLACK_SIGNING_SECRET=<from Slack App settings>
```

**Setup checklist:**
- Create `#geek-auth-alerts` Slack channel
- api.slack.com/apps → Incoming Webhooks → add to channel
- Interactivity & Shortcuts → set Request URL to `https://your-render-url/slack/actions`
- For local dev: use ngrok to expose localhost to Slack

**Usage in routes/middleware:**
```ts
if (authCircuit.isOpen()) {
  return res.status(503).json({ error: 'Service temporarily unavailable' });
}
try {
  await databaseCall();
} catch {
  await authCircuit.transitionTo('OPEN', 60);
}
```

**Three-layer resilience pattern:**

| Layer | Responsibility | Benefit |
|-------|---------------|---------|
| Persistent Redis key | Source of truth (`circuit:{service}:state`) | New instances catch up on boot |
| Pub/Sub broadcast | Push state changes to all active instances | Sub-millisecond real-time updates |
| Local in-memory cache | `localCircuitState[service]` | Zero network latency per request |

**Startup sequence in `app.ts`:**
```ts
await initializeCircuitState('auth-service'); // pull from Redis first
redisSubscriber.subscribe(CIRCUIT_CHANNEL);   // then listen for changes
app.listen(PORT);                             // then accept traffic
```

### Resilient Rate Limiters (`lib/rate-limiters.ts`)

```ts
import { rateLimit } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisBreaker, redisAvailable } from './circuit-breaker';

const redisStore = new RedisStore({
  sendCommand: async (...args: string[]) => {
    if (!redisAvailable) throw new Error('Redis unavailable');
    return redisBreaker.fire(...args);
  },
  prefix: 'rl:auth:',
});

// Sensitive routes — per user ID to avoid NAT lockout
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: redisStore,
  skip: () => !redisAvailable,             // fail-open if Redis down
  keyGenerator: (req) =>                   // per-user, not per-IP
    req.res?.locals.oauth?.token?.user?.id || req.ip || 'unknown',
  message: { error: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Global limiter — all routes
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  store: redisStore,
  skip: () => !redisAvailable,
  standardHeaders: true,
  legacyHeaders: false,
});
```

| Strategy | Behavior when Redis is down | Best for |
|----------|----------------------------|---------|
| Fail-open (`skip: true`) | No limit enforced | General API endpoints |
| Fail-to-memory | Each instance enforces own counter | Sensitive auth routes |

Render Redis add-on provides `REDIS_URL` env var automatically.

### `getUser` — Password + OTP Grant Types

The `getUser` model method handles both grant types. The custom OTP grant calls it with
`(email, otp)`. The standard `password` grant calls it with `(email, password)`.
Differentiate by checking which field is a 6-digit OTP vs. a full password:

```ts
// model.ts
getUser: async (email: string, secret: string): Promise<OAuthUser | undefined> => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      roles: {
        include: { role: { include: { permissions: { include: { permission: true } } } } }
      }
    }
  });

  if (!user) return undefined;

  const isOtp = /^\d{6}$/.test(secret);

  if (isOtp) {
    // OTP grant path — verify against PendingVerification
    const pending = await prisma.pendingVerification.findUnique({ where: { email } });
    if (!pending || pending.expiresAt < new Date()) return undefined;
    const valid = await bcrypt.compare(secret, pending.otpHash);
    if (!valid) return undefined;
    await prisma.pendingVerification.delete({ where: { email } }); // single-use

    // Refresh 30-day trust window on every successful OTP login
    // biosId/userAgent/ip passed via AsyncLocalStorage context set in OtpGrantType.handle()
    // (preferred over global — see implementation note below)
    const biosId = requestContext.getStore()?.biosId;
    if (biosId) {
      const mfaExpiresAt = new Date();
      mfaExpiresAt.setDate(mfaExpiresAt.getDate() + 30);
      await prisma.device.upsert({
        where: { userId_deviceId: { userId: user.id, deviceId: biosId } },
        update: {
          mfaExpiresAt, mfaVerifiedAt: new Date(),
          ipAddress: requestContext.getStore()?.ipAddress,
        },
        create: {
          userId: user.id, deviceId: biosId, mfaExpiresAt, mfaVerifiedAt: new Date(),
          userAgent: requestContext.getStore()?.userAgent,
          ipAddress: requestContext.getStore()?.ipAddress,
        },
      });
    }
  } else {
    // Password grant path — verify against stored bcrypt hash
    // password is always set — required field
    const valid = await bcrypt.compare(secret, user.password);
    if (!valid) return undefined;
  }

  // Build permissions array from roles
  const permissions = user.roles.flatMap(ur =>
    ur.role.permissions.map(rp => rp.permission.name)
  );
  const roles = user.roles.map(ur => ur.role.name);

  return { id: user.id, email: user.email, name: user.name, plan: user.plan, roles, permissions };
},
```

### Admin Routes — Session Management

Protected by `authenticateAdmin` middleware (checks `manage:users` permission in JWT).

```ts
// GET /admin/devices/:userId — list all active sessions for a user
app.get('/admin/devices/:userId', authenticateAdmin, async (req, res) => {
  const sessions = await prisma.oAuthToken.findMany({
    where: { userId: req.params.userId, isActive: true },
    select: {
      biosId: true,
      refreshToken: true,        // used as the unique session handle for revocation
      accessTokenExpiresAt: true,
      createdAt: true,
    },
    orderBy: { accessTokenExpiresAt: 'desc' },
  });
  res.json(sessions);
});

// POST /admin/revoke-session — revoke by refresh token, blacklist access token immediately
app.post('/admin/revoke-session', oauth.authenticate(), authenticateAdmin, async (req, res) => {
  const { refreshToken } = req.body;

  const token = await prisma.oAuthToken.findUnique({ where: { refreshToken } });
  if (!token) return res.status(404).json({ error: 'Session not found' });

  // Soft revoke + immediate Redis blacklist (same pattern as revokeToken model method)
  await prisma.oAuthToken.update({
    where: { refreshToken },
    data: { isActive: false },
  });
  await redis.set(`blacklist:${token.accessToken}`, '1', 'EX', 900);

  await prisma.auditLog.create({
    data: {
      action: 'admin_revoke_session',
      adminId: res.locals.oauth.token.user.id,
      targetId: token.userId,
      metadata: { biosId: token.biosId, refreshToken },
    },
  });

  res.json({ message: 'Session revoked' });
});
```

### Token Cleanup Cron Job

Prevent unbounded token table growth — run nightly:

```sql
DELETE FROM "seo"."oauth_tokens" WHERE refresh_token_expires_at < NOW();
```

Implement as a scheduled job in the auth service (node-cron) or a Render cron job.

### Immediate Revocation — Redis Blacklist

By default, a revoked refresh token still allows the current short-lived access token
(15 min) to remain valid. For instant invalidation, push the `biosId` or `accessToken`
to a Redis blacklist and check it in `authenticateMiddleware` on every request.

```ts
// On revocation
await redis.set(`blacklist:${biosId}`, '1', 'EX', 900); // expire after 15 min

// In authenticate middleware
const blacklisted = await redis.get(`blacklist:${req.biosId}`);
if (blacklisted) return res.status(401).json({ error: 'Session revoked' });
```

### Audit Log

Log all admin revocations for security trail:
```ts
// Prisma model: AuditLog
// { id, adminId, action: "revoke_session", targetUserId, biosId, createdAt }
await prisma.auditLog.create({
  data: { adminId: req.user.id, action: 'revoke_session', targetUserId, biosId },
});
```

---

## geek-seo-autopilot Changes

### Remove
- `next-auth`, `@auth/prisma-adapter` from package.json
- `app/api/auth/[...nextauth]/route.ts`
- `types/next-auth.d.ts`
- `Account`, `Session`, `VerificationToken` Prisma models
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` env vars

### Add

**`lib/secrets.ts`** — reads from Render Secret Files; falls back to `.env` locally

```ts
import { readFileSync, existsSync } from 'fs';

export function getSecret(filename: string, envFallback: string): string {
  const secretPath = `/etc/secrets/${filename}`;
  if (existsSync(secretPath)) return readFileSync(secretPath, 'utf8').trim();
  return process.env[envFallback] || '';
}

// Cached at module level — read once, not on every request
const rawSecret = getSecret('jwt-secret-file', 'AUTH_SERVICE_SECRET');
export const JWT_SECRET = new TextEncoder().encode(rawSecret);
```

> **Render vs. Vercel:** Render runs Next.js in a Node.js process — `fs` is available.
> Vercel's Edge Runtime prohibits filesystem access; use env vars there instead.
> Set secret file in Render dashboard: name = `jwt-secret-file`, value = signing secret.

**`middleware.ts`** — stateless JWT guard using cached secret

```ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from './lib/secrets';

const PROTECTED_API = ['/api/sites', '/api/seo', '/api/brand'];

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const { pathname } = req.nextUrl;
  const isApi = PROTECTED_API.some((p) => pathname.startsWith(p));

  if (!token) {
    return isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/sign-in', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'geek-auth-service', // must match token.service.ts issuer claim
      algorithms: ['HS256'],
    });

    // Forward verified user ID to API route handlers via header
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId as string);
    response.headers.set('x-user-email', payload.email as string);
    return response;

  } catch {
    return isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/sign-in', req.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/sites/:path*', '/api/seo/:path*', '/api/brand/:path*'],
};
```

**`lib/auth.ts`** — server-side JWT decode with roles + permissions

```ts
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from './secrets';

export async function auth() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'geek-auth-service',
      algorithms: ['HS256'],
    });
    return {
      user: {
        id: payload.userId as string,
        email: payload.email as string,
        name: (payload.name as string | null) ?? null,
        plan: payload.plan as string,
        roles: (payload.roles as string[]) ?? [],
        permissions: (payload.permissions as string[]) ?? [],
      },
    };
  } catch { return null; }
}

// Permission check helper
export function can(session: Awaited<ReturnType<typeof auth>>, permission: string) {
  return session?.user.permissions.includes(permission) ?? false;
}
```

> **Note:** API route handlers can read `x-user-id` / `x-user-email` headers set by
> middleware instead of re-verifying the JWT — one verification per request.

**`hooks/use-device-id.ts`** — persistent browser device UUID

```ts
import { useEffect, useState } from 'react';

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('geek_seo_device_id');
    if (stored) {
      setDeviceId(stored);
    } else {
      const id = crypto.randomUUID();
      localStorage.setItem('geek_seo_device_id', id);
      setDeviceId(id);
    }
  }, []);

  return deviceId;
}
```

> **Note:** Web browser device IDs are not hardware-bound — they're a localStorage UUID.
> Provide no device trust for web sessions; the auth service will decline device grants
> without a valid trusted `Device` record. Web users always authenticate via OTP.

**Proxy API routes** — `AUTH_SERVICE_URL` is server-only; all client auth calls go through these:

```ts
// app/api/auth/send-otp/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await fetch(`${process.env.AUTH_SERVICE_URL}/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
```

```ts
// app/api/auth/verify/route.ts — OTP grant → set httpOnly cookie
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await fetch(`${process.env.AUTH_SERVICE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'urn:geek:otp',
      client_id: 'geek-seo-autopilot',
      email: body.email,
      otp: body.otp,
      biosId: body.deviceId,
    }),
  });
  const data = await response.json();
  if (!response.ok) return NextResponse.json(data, { status: response.status });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth_token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes — matches access token lifetime
    path: '/',
  });
  // Store refresh token in separate httpOnly cookie
  res.cookies.set('refresh_token', data.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}
```

```ts
// app/api/auth/device-trust/route.ts — device grant (web: no-op; Electron: handled in Main)
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await fetch(`${process.env.AUTH_SERVICE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'urn:geek:device',
      client_id: 'geek-seo-autopilot',
      email: body.email,
      biosId: body.deviceId,
    }),
  });
  const data = await response.json();
  if (!response.ok) return NextResponse.json(data, { status: response.status });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth_token', data.access_token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 60 * 15, path: '/',
  });
  res.cookies.set('refresh_token', data.refresh_token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/',
  });
  return res;
}
```

```ts
// app/api/auth/logout/route.ts — revoke token, clear cookies
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;

  if (authToken) {
    // Notify auth service to revoke + blacklist
    await fetch(`${process.env.AUTH_SERVICE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    }).catch(() => {}); // best-effort; clear cookies regardless
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('auth_token');
  res.cookies.delete('refresh_token');
  return res;
}
```

**`app/(marketing)/sign-in/page.tsx`** — state machine:

```tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDeviceId } from '@/hooks/use-device-id';

type State = 'CHECKING' | 'EMAIL' | 'OTP_SENT' | 'ERROR';

export default function SignInPage() {
  const router = useRouter();
  const deviceId = useDeviceId();
  const [state, setState] = useState<State>('CHECKING');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  // CHECKING: attempt device trust on mount
  useEffect(() => {
    if (!deviceId) return;
    const storedEmail = document.cookie
      .split('; ')
      .find(r => r.startsWith('user_email='))
      ?.split('=')[1];

    if (!storedEmail) { setState('EMAIL'); return; }

    fetch('/api/auth/device-trust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: storedEmail, deviceId }),
    }).then(r => {
      if (r.ok) router.push('/dashboard');
      else setState('EMAIL');
    }).catch(() => setState('EMAIL'));
  }, [deviceId]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const r = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (r.ok) setState('OTP_SENT');
    else setError('Failed to send code. Please try again.');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const r = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, deviceId }),
    });
    if (r.ok) {
      // Store email for future device trust checks
      document.cookie = `user_email=${email}; path=/; max-age=${60 * 60 * 24 * 30}`;
      router.push('/dashboard');
    } else {
      const data = await r.json();
      setError(data.error || 'Invalid code. Please try again.');
    }
  };

  if (state === 'CHECKING') {
    return <div className="flex items-center justify-center h-screen">Signing in...</div>;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-6">Sign in</h1>

        {state === 'EMAIL' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
              className="w-full border rounded px-3 py-2"
            />
            <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">
              Send code
            </button>
          </form>
        )}

        {state === 'OTP_SENT' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-slate-500">Code sent to <strong>{email}</strong></p>
            <input
              type="text" value={otp} onChange={e => setOtp(e.target.value)}
              placeholder="6-digit code" maxLength={6} required
              className="w-full border rounded px-3 py-2 tracking-widest text-center text-lg"
            />
            <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">
              Verify
            </button>
            <button
              type="button" onClick={() => setState('EMAIL')}
              className="w-full text-sm text-slate-400 underline"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
```

### Update
| File | Change |
|------|--------|
| `components/marketing/navbar.tsx` | Replace `<SignInButton>` with `<Link href="/sign-in">Sign in</Link>` |
| `components/marketing/sign-in-button.tsx` | Remove Google OAuth button |
| `components/dashboard/topbar.tsx` | Replace `signOut()` with POST to `/api/auth/logout` + `router.push("/")` |
| `app/(dashboard)/layout.tsx` | Redirect to `/sign-in` on no session (already done ✓) |

---

## Environment Variables

```bash
# Add
AUTH_SERVICE_URL=http://localhost:4000   # dev; Render URL in prod
AUTH_SERVICE_SECRET=<openssl rand -base64 32>  # same value in auth service

# Remove
NEXTAUTH_SECRET / NEXTAUTH_URL / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
```

---

## Implementation Order

### geek-auth-service (new repo)
1. **Install:**
   ```bash
   npm install express @node-oauth/oauth2-server jose bcryptjs resend zod dotenv \
               ioredis express-rate-limit rate-limit-redis opossum \
               @slack/bolt axios @prisma/client
   npm install -D typescript ts-node @types/express @types/bcryptjs @types/node prisma
   ```
2. Prisma schema (`prisma/schema.prisma`) + `npx prisma db push`
3. Seed: `INITIAL_ADMIN_EMAIL=you@example.com npx prisma db seed`
4. `lib/request-context.ts` — AsyncLocalStorage for biosId/userAgent/ip
5. `lib/redis.ts` + `lib/circuit-breaker.ts` (ResilientCircuit, Lua script)
6. `lib/rate-limiters.ts` — strictLimiter + globalLimiter
7. `services/otp.service.ts` — generateAndSend() + verify() with brute-force lockout
8. `services/token.service.ts` — generateAccessToken() + generateRefreshToken()
9. `config/clients.ts` — REGISTERED_CLIENTS
10. `model.ts` — getClient, saveToken, getAccessToken, getRefreshToken, getUser, revokeToken, validateTrustedDevice
11. `grants/OtpGrantType.ts` + `grants/DeviceGrantType.ts`
12. `middleware/authenticate.ts` + `middleware/authenticate-admin.ts`
13. `routes/auth.routes.ts` — send-otp, logout, change-password, me, devices
14. `routes/admin.routes.ts` — devices/:userId, revoke-session
15. `routes/slack.routes.ts` — @slack/bolt interactive handler
16. `app.ts` — wire OAuthServer, rate limiters, circuit, routes, Redis pub/sub init
17. Dockerfile + render.yaml
18. Deploy to Render

### geek-seo-autopilot (this repo)
19. `npm uninstall next-auth @auth/prisma-adapter`
20. Delete `app/api/auth/[...nextauth]/route.ts` + `types/next-auth.d.ts`
21. `npx prisma migrate dev --name remove-nextauth-models`
22. `lib/secrets.ts` — Render Secret Files reader
23. `lib/auth.ts` — updated JWT decode with roles + permissions + `can()` helper
24. `middleware.ts` — edge JWT guard with issuer check + x-user-id headers
25. `hooks/use-device-id.ts` — browser UUID
26. `app/api/auth/send-otp/route.ts` — proxy
27. `app/api/auth/verify/route.ts` — proxy + set httpOnly cookie
28. `app/api/auth/device-trust/route.ts` — proxy + set httpOnly cookie
29. `app/api/auth/logout/route.ts` — proxy + clear cookies
30. `app/(marketing)/sign-in/page.tsx` — CHECKING → EMAIL → OTP_SENT → ERROR
31. Update `components/marketing/navbar.tsx` — remove SignInButton, add Link
32. Update `components/dashboard/topbar.tsx` — POST /api/auth/logout on sign-out

---

## Peer Review Refinements (Ultraplan)

### 1. OTP Send Rate Limiting
Apply `strictLimiter` to `/auth/send-otp` specifically — prevents email flooding and
Resend bill abuse. `PendingVerification.expiresAt` already enforces 10-min OTP expiry.

### 2. saveToken Atomicity ✓
`prisma.$transaction` ensures new token creation + old token deletion are atomic.
No window where two valid refresh tokens exist for the same device.

### 3. Generic BIOS ID Fallback
`node-machine-id` can return `"00000000..."` on some Linux VMs. Mitigation: always
log `userAgent` + `ipAddress` on `Device` upsert. Grafana dashboard can surface
multiple "trusted" devices sharing the same `deviceId` as a suspicious pattern.

### 4. JWKS Endpoint
Current implementation uses HS256 + shared `AUTH_SERVICE_SECRET` — correct for
internal apps where both sides control the secret. If geek-auth-service ever serves
external third-party consuming apps, switch `token.service.ts` to RS256 + key pair
and expose:

```
GET /.well-known/jwks.json → returns public key set (RS256)
```

External apps verify with the public key — secret never shared. Not required for the
current scope where all consuming apps are owned by the same team.

---

## Render Deployment

### Dockerfile (`geek-auth-service/Dockerfile`)

Multi-stage build — build stage compiles TypeScript, run stage is lean (no devDeps, no source).
OpenSSL required for Prisma's query engine.

```dockerfile
# --- Build Stage ---
FROM node:20-slim AS builder
WORKDIR /app

# OpenSSL required by Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# --- Run Stage ---
FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Run migrations before starting the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

**Notes:**
- `npm ci` (not `npm install`) — reproducible installs from `package-lock.json`
- `npx prisma generate` runs in builder so the generated client is present in `node_modules` when copied
- `npx prisma migrate deploy` on startup applies any pending migrations before accepting traffic; safe to run repeatedly (idempotent)
- `dist/` is the compiled output of `tsc` — `tsconfig.json` `outDir` must be `"./dist"`

### `render.yaml` (Blueprint) — `geek-auth-service/render.yaml`

Place in the auth service repo root. Render reads this to provision the database and web service together.

```yaml
services:
  - type: web
    name: geek-auth-service
    env: docker
    plan: starter          # 'free' for dev; 'starter' ($7/mo) for production uptime
    region: ohio
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: geek-auth-db
          property: connectionString
      - key: RESEND_API_KEY
        sync: false          # Set manually in Render dashboard
      - key: AUTH_SERVICE_SECRET
        sync: false          # Set manually in Render dashboard
      - key: REDIS_URL
        sync: false          # Set to Render Redis add-on URL or Upstash
      - key: SLACK_WEBHOOK_URL
        sync: false
      - key: SLACK_SIGNING_SECRET
        sync: false
      - key: INITIAL_ADMIN_EMAIL
        sync: false          # One-time seed; unset after first deploy
    secretFiles:
      - name: jwt-secret-file  # mounted at /etc/secrets/jwt-secret-file
        # Upload value in Render Dashboard → Secret Files
    autoDeploy: true

databases:
  - name: geek-auth-db
    plan: free               # Upgrade to 'basic' ($7/mo) for production
    region: ohio
    databaseName: geek_auth
    user: geek_auth_user
```

**`sync: false`** means Render will not auto-populate the value — you must enter it
manually in the dashboard. This prevents secrets from being committed to git.

### Deployment Checklist

1. **Push to GitHub** — commit `Dockerfile`, `render.yaml`, `prisma/` to repo
2. **Connect Blueprint** — Render Dashboard → New → Blueprint Instance → select repo
3. **Populate secrets** in Render Dashboard after first deploy:
   - Secret Files → create `jwt-secret-file` with `openssl rand -base64 32` output
   - Environment → set `RESEND_API_KEY`, `AUTH_SERVICE_SECRET` (same value as `jwt-secret-file` raw string), `REDIS_URL`
4. **Seed database** — SSH into Render service (or run one-off job):
   ```bash
   INITIAL_ADMIN_EMAIL=you@example.com npx prisma db seed
   ```
5. **Update `geek-seo-autopilot`** — set `AUTH_SERVICE_URL` to the Render web service URL
   (e.g., `https://geek-auth-service.onrender.com`)
6. **Slack setup** — create `#geek-auth-alerts`, add Incoming Webhook, set
   Interactivity Request URL to `https://geek-auth-service.onrender.com/slack/actions`

---

## Verification
1. `GET /` unauthenticated → marketing page (no loop)
2. `/sign-in` → email field
3. Submit email → OTP in inbox
4. Submit OTP → `auth_token` httpOnly cookie set → `/dashboard`
5. Reload → stays authenticated (middleware passes)
6. Clear cookies → `/dashboard` → redirected to `/sign-in`
7. Re-visit `/sign-in` same device → auto-login (device trust)
8. Sign out → cookie cleared → `/`
9. `GET /api/sites` no cookie → `401`
