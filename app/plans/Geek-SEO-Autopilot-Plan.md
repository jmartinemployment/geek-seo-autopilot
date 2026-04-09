# Geek SEO Autopilot — Comprehensive Build Plan
## Standalone Next.js AI Marketing & SEO Platform (SEO.ai + Jasper.ai Clone)
### Codename: geek-seo-autopilot

---

## Context

**Inspiration sources:**
- **SEO.ai** — AI SEO automation (keyword research, article generation, CMS publishing, analytics)
- **Jasper.ai** — AI marketing platform (multi-channel content, brand voice, campaigns, templates)

**Reference assets in this repo:**
1. **SEO.md** — Original planning doc (`app/Plans/SEO.md`)
2. **Geek-SEO WordPress plugin** — `app/assets/plugins/Geek-SEO` — 20 SEO features built; JS analysis algorithms to port
3. **geekatyourspot-r** — Next.js 16 / React 19 / Tailwind 4 / shadcn reference project — **copy files from here, do not re-run shadcn**

**Project location:** New standalone repo at `/Volumes/Seagate/development/geek-seo-autopilot` — completely separate from this repo.

**Key architecture decision:** All backend logic lives in Next.js API routes — no separate Express backend. Self-contained, Vercel-deployable.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│           geek-seo-autopilot (standalone repo)           │
│                   Next.js App Router                     │
│                      (Vercel)                            │
│                                                          │
│  app/(marketing)/    ← Public landing + pricing          │
│  app/(dashboard)/    ← Auth-protected SaaS shell         │
│  app/api/seo/        ← All backend logic                 │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │                            │
    ┌─────────▼──────────┐    ┌────────────▼───────────┐
    │  Anthropic Claude  │    │  Supabase PostgreSQL   │
    │  claude-opus-4-6   │    │    (via Prisma ORM)    │
    │  + web_search tool │    └────────────────────────┘
    └────────────────────┘
              │
    ┌─────────▼──────────┐
    │  WordPress REST API │
    │  (CMS publishing)  │
    └────────────────────┘
```

---

## Tech Stack — Match Reference Repo Exactly

| Package | Version |
|---------|---------|
| `next` | 16.2.1 |
| `react` / `react-dom` | 19.2.4 |
| `tailwindcss` | ^4 |
| `tw-animate-css` | ^1.4.0 |
| `motion` | ^12 |
| shadcn (base-maia style) | copied from reference repo |
| `lucide-react` | ^1.7.0 |
| `@hugeicons/react` | ^1.1.6 |
| `@fortawesome/react-fontawesome` + free-solid + free-brands | ^3 / ^7 |
| `react-hook-form` + `zod` + `@hookform/resolvers` | ^7 / ^4 / ^5 |
| `zustand` | @latest |
| `@tanstack/react-query` + `react-table` | ^5 / ^8 |
| `recharts` | ^3 |
| `axios` | @latest |
| `prisma` + `@prisma/client` | @latest |
| `next-auth` | @beta (v5) |
| `@auth/prisma-adapter` | @latest |
| `@anthropic-ai/sdk` | @latest |
| `sonner` | ^2 |
| `@uiw/react-md-editor` | @latest |
| `react-day-picker` + `date-fns` | ^9 / ^4 |
| `clsx` + `tailwind-merge` | ^2 / ^3 |
| `next-themes` | ^0.4.6 |

---

## Scaffold Setup

```bash
# 1. Create project
npx create-next-app@latest geek-seo-autopilot \
  --typescript --tailwind --eslint --app \
  --import-alias="@/*"
cd geek-seo-autopilot

# 2. Install all packages in one pass
npm install next@16.2.1 react@19.2.4 react-dom@19.2.4 \
  motion tw-animate-css next-themes \
  zustand @tanstack/react-query @tanstack/react-table \
  axios recharts react-hook-form zod @hookform/resolvers \
  next-auth@beta @auth/prisma-adapter @prisma/client @anthropic-ai/sdk \
  sonner react-day-picker date-fns \
  lucide-react @hugeicons/react \
  @fortawesome/react-fontawesome @fortawesome/free-solid-svg-icons \
  @fortawesome/free-brands-svg-icons \
  @uiw/react-md-editor clsx tailwind-merge next-themes

npm install -D prisma tailwindcss@^4 @tailwindcss/postcss @tailwindcss/typography

# 3. Copy from geekatyourspot-r reference repo (do NOT run shadcn add)
REPO=/Volumes/Seagate/development/geekatyourspot-r
cp $REPO/app/globals.css ./app/globals.css
cp $REPO/components.json ./components.json
cp -r $REPO/components/ui ./components/ui
cp $REPO/lib/utils.ts ./lib/utils.ts
cp $REPO/hooks/use-mobile.ts ./hooks/use-mobile.ts
cp $REPO/next.config.ts ./next.config.ts

# 4. Init Prisma
npx prisma init --datasource-provider postgresql
```

**Why copy instead of re-running shadcn:**
The reference repo already has Tailwind 4 + `tw-animate-css` + `shadcn/tailwind.css` import chain, OKLCH color variables, and `base-maia` style configured. Copying preserves this without version drift.

---

## Full Project File Structure

```
geek-seo-autopilot/
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx              ← Navbar + Footer
│   │   ├── page.tsx                ← Landing page (13 sections)
│   │   └── pricing/page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← auth() check + sidebar + topbar
│   │   ├── dashboard/page.tsx      ← Overview stats
│   │   ├── sites/
│   │   │   ├── page.tsx            ← All sites list
│   │   │   ├── new/page.tsx        ← 5-step add site wizard
│   │   │   └── [siteId]/
│   │   │       ├── page.tsx        ← Site overview
│   │   │       ├── keywords/page.tsx
│   │   │       ├── articles/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── new/page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── campaigns/
│   │   │       │   ├── page.tsx
│   │   │       │   ├── new/page.tsx
│   │   │       │   └── [id]/page.tsx
│   │   │       ├── templates/page.tsx
│   │   │       ├── brand/page.tsx
│   │   │       ├── calendar/page.tsx
│   │   │       ├── analytics/page.tsx
│   │   │       └── settings/page.tsx
│   │   └── account/page.tsx
│   │
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── seo/
│   │       ├── sites/route.ts                  ← GET list, POST create
│   │       ├── brand/route.ts                  ← CRUD BrandVoice, Audience, KnowledgeBase
│   │       ├── campaigns/route.ts              ← CRUD Campaign + CampaignAsset
│   │       ├── keyword-research/route.ts
│   │       ├── content-gap/route.ts
│   │       ├── generate-article/route.ts       ← SSE streaming
│   │       ├── analyze-content/route.ts
│   │       ├── internal-links/route.ts
│   │       ├── meta-generate/route.ts
│   │       ├── repurpose/route.ts
│   │       ├── generate-email/route.ts
│   │       ├── generate-social/route.ts
│   │       ├── generate-ad/route.ts
│   │       ├── generate-landing-page/route.ts
│   │       ├── generate-press-release/route.ts
│   │       ├── generate-image/route.ts         ← Replicate FLUX
│   │       ├── aeo-optimize/route.ts           ← AEO & GEO
│   │       ├── analytics/[siteId]/route.ts
│   │       └── publish/
│   │           ├── wordpress/route.ts
│   │           └── test-connection/route.ts
│   │
│   ├── globals.css                 ← copied from reference repo
│   └── layout.tsx
│
├── components/
│   ├── marketing/
│   │   ├── navbar.tsx
│   │   ├── footer.tsx
│   │   ├── hero-section.tsx
│   │   ├── problem-section.tsx
│   │   ├── process-section.tsx
│   │   ├── features-grid.tsx
│   │   ├── testimonials.tsx
│   │   ├── pricing-section.tsx
│   │   ├── content-quality.tsx
│   │   ├── auto-publish-section.tsx
│   │   ├── control-features.tsx
│   │   ├── faq-section.tsx
│   │   └── final-cta.tsx
│   │
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   ├── topbar.tsx
│   │   ├── site-selector.tsx
│   │   ├── stats-card.tsx
│   │   ├── keyword-table.tsx
│   │   ├── keyword-research-modal.tsx
│   │   ├── article-editor.tsx
│   │   ├── seo-score-sidebar.tsx
│   │   ├── seo-score-gauge.tsx
│   │   ├── generate-article-wizard.tsx
│   │   ├── publish-modal.tsx
│   │   ├── content-calendar.tsx
│   │   ├── analytics-chart.tsx
│   │   ├── add-site-wizard.tsx
│   │   ├── campaign-card.tsx
│   │   ├── template-card.tsx
│   │   ├── repurpose-modal.tsx
│   │   └── brand-voice-form.tsx
│   │
│   ├── shared/
│   │   ├── loading-state.tsx
│   │   ├── empty-state.tsx
│   │   └── error-boundary.tsx
│   │
│   └── ui/                         ← copied from reference repo (40+ components)
│
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── claude.ts
│   ├── store.ts
│   ├── seo-analysis.ts             ← ported from Geek-SEO content-analysis.js
│   ├── readability.ts              ← ported from Geek-SEO readability-analysis.js
│   └── utils.ts                   ← copied from reference repo
│
├── hooks/
│   ├── use-debounce.ts
│   └── use-mobile.ts               ← copied from reference repo
│
├── types/index.ts
├── prisma/schema.prisma
├── .env.local
├── next.config.ts                  ← copied from reference repo
├── components.json                 ← copied from reference repo
└── tsconfig.json
```

---

## Environment Variables — `.env.local`

```env
# Database (Supabase)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:5432/postgres"

# Auth
NEXTAUTH_SECRET="generate: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# AI
ANTHROPIC_API_KEY="sk-ant-..."

# Image generation (Phase 4)
REPLICATE_API_TOKEN=""

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Database Schema — `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ── Auth (NextAuth v5) ─────────────────────────────────────────────────────

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  plan      String   @default("free") // free | starter | pro | business
  createdAt DateTime @default(now())
  sites     Site[]
  accounts  Account[]
  sessions  Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expires      DateTime
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

// ── Core SEO (SEO.ai scope) ────────────────────────────────────────────────

model Site {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  name          String
  domain        String
  cmsType       String   @default("wordpress")
  cmsApiUrl     String?
  cmsApiKey     String?
  cmsSiteId     String?
  language      String   @default("en")
  postFrequency String   @default("weekly")
  autoPublish   Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  articles        Article[]
  keywords        Keyword[]
  analytics       Analytics[]
  contentCalendar ContentCalendar[]
  brandVoices     BrandVoice[]
  audiences       Audience[]
  knowledgeBase   KnowledgeBase[]
  campaigns       Campaign[]
}

model Article {
  id               String    @id @default(cuid())
  siteId           String
  site             Site      @relation(fields: [siteId], references: [id], onDelete: Cascade)
  title            String
  slug             String
  content          String    @db.Text
  metaTitle        String?
  metaDescription  String?
  targetKeyword    String
  wordCount        Int       @default(0)
  seoScore         Int       @default(0)
  readabilityScore Int       @default(0)
  status           String    @default("draft")
  publishedAt      DateTime?
  cmsPostId        String?
  internalLinks    Json?
  featuredImageUrl String?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}

model Keyword {
  id             String   @id @default(cuid())
  siteId         String
  site           Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  keyword        String
  searchVolume   String?  // low | medium | high
  difficulty     Int?
  intent         String?  // informational | commercial | transactional | navigational
  status         String   @default("discovered")
  topicCluster   String?
  longTail       Boolean  @default(false)
  suggestedTitle String?
  createdAt      DateTime @default(now())
}

model Analytics {
  id          String   @id @default(cuid())
  siteId      String
  site        Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  date        DateTime
  clicks      Int      @default(0)
  impressions Int      @default(0)
  position    Float    @default(0)
  ctr         Float    @default(0)
  keyword     String?
  page        String?
  createdAt   DateTime @default(now())
}

model ContentCalendar {
  id          String   @id @default(cuid())
  siteId      String
  site        Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  keyword     String
  scheduledAt DateTime
  status      String   @default("pending")
  articleId   String?
  createdAt   DateTime @default(now())
}

// ── Brand / Jasper scope ──────────────────────────────────────────────────

model BrandVoice {
  id          String   @id @default(cuid())
  siteId      String
  site        Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  name        String
  description String?
  toneWords   String[]
  examples    String?  @db.Text
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
}

model Audience {
  id           String   @id @default(cuid())
  siteId       String
  site         Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  name         String
  description  String?  @db.Text
  demographics String?
  painPoints   String?  @db.Text
  goals        String?  @db.Text
  isDefault    Boolean  @default(false)
  createdAt    DateTime @default(now())
}

model KnowledgeBase {
  id        String   @id @default(cuid())
  siteId    String
  site      Site     @relation(fields: [siteId], references: [id], onDelete: Cascade)
  name      String
  type      String   // document | url | text
  content   String   @db.Text
  sourceUrl String?
  createdAt DateTime @default(now())
}

model Campaign {
  id        String          @id @default(cuid())
  siteId    String
  site      Site            @relation(fields: [siteId], references: [id], onDelete: Cascade)
  name      String
  brief     String?         @db.Text
  status    String          @default("active")
  startDate DateTime?
  endDate   DateTime?
  assets    CampaignAsset[]
  createdAt DateTime        @default(now())
}

model CampaignAsset {
  id         String   @id @default(cuid())
  campaignId String
  campaign   Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  type       String   // blog | email | social | ad | landing-page | press-release
  title      String
  content    String   @db.Text
  platform   String?  // twitter | linkedin | facebook | instagram | google-ads | meta-ads
  status     String   @default("draft")
  createdAt  DateTime @default(now())
}

model ContentTemplate {
  id          String   @id @default(cuid())
  name        String
  category    String   // seo | email | social | ads | pr | ecommerce | general
  description String?
  prompt      String   @db.Text
  fields      Json
  isBuiltIn   Boolean  @default(false)
  createdAt   DateTime @default(now())
}
```

```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

## Key Library Files

### `lib/prisma.ts`
```typescript
import { PrismaClient } from "@prisma/client";
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### `lib/auth.ts`
```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

### `app/api/auth/[...nextauth]/route.ts`
```typescript
export { GET, POST } from "@/lib/auth";
```

### `lib/claude.ts`
```typescript
import Anthropic from "@anthropic-ai/sdk";
export const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
export const SEO_SYSTEM_PROMPT = `You are an expert SEO content writer and strategist.
You write articles that rank on Google and satisfy real reader intent.
Always output valid JSON only — no markdown, no preamble.`;
// Standard: model "claude-opus-4-6", tools [web_search_20250305], max_tokens 8096
```

### `lib/store.ts` (Zustand)
```typescript
interface SEOStore {
  activeSiteId: string | null;
  setActiveSiteId: (id: string) => void;
  sites: Site[];
  setSites: (sites: Site[]) => void;
  keywords: Keyword[];
  setKeywords: (kws: Keyword[]) => void;
  activeBrandVoiceId: string | null;
  setActiveBrandVoiceId: (id: string) => void;
  activeAudienceId: string | null;
  setActiveAudienceId: (id: string) => void;
  campaigns: Campaign[];
  setCampaigns: (campaigns: Campaign[]) => void;
  generationStatus: GenerationStep[];
  setGenerationStatus: (steps: GenerationStep[]) => void;
  analyticsData: AnalyticsData | null;
  setAnalyticsData: (data: AnalyticsData) => void;
}
type GenerationStep = { label: string; status: "pending" | "running" | "done" | "error" };
```

---

## API Routes

All routes: `{ success: boolean, data?: unknown, error?: string }` shape. All verify `auth()` session first.

### SEO.ai scope
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/seo/sites` | GET / POST | List / create sites |
| `/api/seo/keyword-research` | POST | Claude + web_search → 20 keywords → persist |
| `/api/seo/content-gap` | POST | Identify missing keywords vs competitors |
| `/api/seo/generate-article` | POST | 3-step pipeline (Research→Outline→Write) via SSE |
| `/api/seo/analyze-content` | POST | 11-check SEO score + Flesch readability |
| `/api/seo/meta-generate` | POST | Claude → title ≤60 + meta ≤160 + slug |
| `/api/seo/internal-links` | POST | Claude → anchor text + target URL suggestions |
| `/api/seo/analytics/[siteId]` | GET | Mock 30-day data (Phase 2: real GSC) |
| `/api/seo/publish/wordpress` | POST | WP REST API, Basic auth, update Article record |
| `/api/seo/publish/test-connection` | POST | Validate WP credentials via `/wp-json/wp/v2/users/me` |

### Jasper scope
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/seo/brand` | GET/POST/PUT/DELETE | CRUD BrandVoice, Audience, KnowledgeBase |
| `/api/seo/campaigns` | GET/POST/PUT/DELETE | CRUD Campaign + CampaignAsset |
| `/api/seo/repurpose` | POST | Article → email + social + ad (platform-constrained) |
| `/api/seo/generate-email` | POST | Subject + body with personalization tokens |
| `/api/seo/generate-social` | POST | Platform-aware (Twitter ≤280, LinkedIn, FB, IG) |
| `/api/seo/generate-ad` | POST | Google Ads (headline ≤30/desc ≤90) or Meta Ads |
| `/api/seo/generate-landing-page` | POST | Hero + benefits + social proof + CTA |
| `/api/seo/generate-press-release` | POST | AP-style press release |
| `/api/seo/aeo-optimize` | POST | Restructure for AI search (Perplexity, ChatGPT, Google AI Overview) |
| `/api/seo/generate-image` | POST | Replicate FLUX `black-forest-labs/flux-schnell` |

All Jasper routes accept: `{ siteId, brandVoiceId?, audienceId?, topic, knowledgeBaseIds?: string[], campaignId? }`

### Article Generation SSE Pattern
```typescript
const stream = new ReadableStream({
  async start(controller) {
    const send = (step: string, status: string) =>
      controller.enqueue(new TextEncoder().encode(
        `data: ${JSON.stringify({ step, status })}\n\n`
      ));
    send("Research", "running");
    // ... Step 1 Claude call
    send("Research", "done"); send("Outline", "running");
    // ... Step 2 Claude call
    send("Outline", "done"); send("Writing", "running");
    // ... Step 3 Claude call
    send("Writing", "done");
    await prisma.article.create({ data: { ...articleData } });
    controller.close();
  }
});
return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
```

---

## SEO Analysis — Porting from Geek-SEO WP Plugin

Port these JS files to TypeScript. Translate algorithms, do not rewrite from scratch.

**Source → Target:**
- `app/assets/plugins/Geek-SEO/assets/js/content-analysis.js` → `lib/seo-analysis.ts`
- `app/assets/plugins/Geek-SEO/assets/js/readability-analysis.js` → `lib/readability.ts`

**11-check SEO scoring** (each ~9 points toward 100):
1. Keyword in article title
2. Keyword in meta description
3. Keyword in URL slug
4. Keyword in first paragraph (first 100 words)
5. Keyword density 0.5–2.5%
6. Title length 50–60 chars
7. Meta description length 120–160 chars
8. Content length ≥ 1000 words
9. Images with keyword in alt text
10. Internal links ≥ 2
11. External links ≥ 1

**7-check readability** (Flesch Reading Ease + 6):
1. Flesch Reading Ease 60–70
2. Sentences > 20 words (warn if > 25%)
3. Paragraphs > 150 words
4. Passive voice detection (regex)
5. Transition word usage ≥ 30%
6. Consecutive same-word sentence starts
7. Subheading distribution (H2/H3 every ~300 words)

---

## Frontend Pages

### Dashboard Layout `(dashboard)/layout.tsx`
- `auth()` → redirect to `/` if no session
- Left sidebar (240px, `bg-slate-900`): logo, site selector, nav links
- Nav: Dashboard / Keywords / Articles / Campaigns / Templates / Brand / Calendar / Analytics / Settings
- Topbar: breadcrumb + user avatar dropdown

### Keywords `/sites/[siteId]/keywords`
- `@tanstack/react-table`: keyword, volume badge, difficulty progress bar, intent badge, status, actions
- "Research Keywords" modal: topic + count slider → Claude → checkbox results → "Add Selected"
- Tabs: All / Discovered / Planned / Gap

### Articles `/sites/[siteId]/articles`
- List + SEO score gauges + status badges
- "Generate Article" → 3-step wizard → SSE real-time progress steps
- Wizard: select keyword → configure (word count, brand voice, audience, internal URLs) → live progress

### Article Editor `/sites/[siteId]/articles/[id]`
- Left: `@uiw/react-md-editor`
- Right (300px): SEO score donut gauge, readability score, 11-item checklist, recommendations, AEO tips
- Score on 1-second debounce
- "Repurpose" button → modal: select channels + campaign
- "Publish" button → publish modal

### Campaigns `/sites/[siteId]/campaigns`
- List + "New Campaign" brief wizard (name, goal, audience, channels)
- Campaign detail: Kanban (Draft / Approved / Published) with asset cards
- Asset card: type icon, title, platform badge, status

### Templates `/sites/[siteId]/templates`
- 50 built-in templates: SEO Blog / Email / Social / Ads / PR / eCommerce / General
- Click → form with fields → Claude generates → saved as CampaignAsset

### Brand Hub `/sites/[siteId]/brand` — 3 tabs
- **Brand Voices:** list + "Add Voice" (name, tone tags, sample writing)
- **Audiences:** list + "Add Audience" (name, demographics, pain points, goals)
- **Knowledge Base:** list + "Add Knowledge" (text / URL / document)

### Analytics `/sites/[siteId]/analytics`
- 4 summary cards + recharts `LineChart` (clicks + impressions 30 days) + tables

### Calendar `/sites/[siteId]/calendar`
- `react-day-picker` month view + colored dots + schedule modal

### Site Settings `/sites/[siteId]/settings` — 3 tabs
- General (name, domain, language, frequency) | CMS (platform + credentials + test) | Publishing (auto-publish toggle)

### Add Site Wizard `/sites/new` — 5 steps
1. Name, domain, language
2. CMS platform + credentials
3. Brand voice setup
4. Audience setup
5. Launch (first keyword research + schedule 4 articles + calendar preview)

### Marketing Landing Page `/` — 13 sections (all with `motion` animations)
1. Navbar — Logo, nav, Sign In + Start Free Trial
2. Hero — headline, sub, "$1 trial" CTA, 3 trust signals
3. Problem — "Running a business is hard enough. SEO shouldn't be too."
4. Process — Research → Write → Publish (3-step horizontal)
5. Features Grid — 15 feature pills
6. Testimonials — 3 customer cards
7. Pricing — Starter $49 / Pro $99 / Business $299 + monthly/annual toggle
8. Content Quality — SEO principles + mock article preview
9. Auto-Publish — CMS logos grid
10. Control Features — 6-card grid
11. FAQ — shadcn Accordion, 7 items
12. Final CTA — blue band
13. Footer — 5-column links grid

---

## Pricing Model

| Plan | Price | Limits |
|------|-------|--------|
| **Starter** | $49/mo | 1 site, 1 brand voice, 1 audience, 20 articles/mo |
| **Pro** | $99/mo | 3 sites, 3 voices, 5 audiences, unlimited articles + campaigns + templates |
| **Business** | $299/mo | Unlimited sites, unlimited voices/audiences, API access, 5 team seats |
| **Agency** | Custom | White-label, unlimited, custom domain, dedicated CSM |

Annual billing = 2 months free.

---

## Implementation Sequence — 10 Checkpoints

### Checkpoint 1 — Scaffold + Foundation
**Goal:** Repo exists, auth works, protected dashboard shell renders.
- [ ] `npx create-next-app@latest geek-seo-autopilot ...`
- [ ] Install all packages (exact versions above) in one npm pass
- [ ] Copy from reference repo: `globals.css`, `components.json`, `components/ui/`, `lib/utils.ts`, `hooks/use-mobile.ts`, `next.config.ts`
- [ ] Paste full Prisma schema → `prisma migrate dev --name init` → `prisma generate`
- [ ] Create `lib/prisma.ts`, `lib/auth.ts`, `app/api/auth/[...nextauth]/route.ts`
- [ ] Create `app/(dashboard)/layout.tsx` — `auth()` check + sidebar + topbar stub
- [ ] Create `app/(dashboard)/dashboard/page.tsx` — stub
- [ ] Create `.env.local` with all vars
- **Verify:** `npm run dev` → Sign In → Google OAuth → `/dashboard` loads

### Checkpoint 2 — Site Management
- [ ] `app/api/seo/sites/route.ts` — GET + POST
- [ ] Sites list page + 5-step Add Site wizard (react-hook-form + zod)
- [ ] `components/dashboard/sidebar.tsx` — nav + site selector (Zustand)
- [ ] `components/dashboard/topbar.tsx` — breadcrumb + user menu
- **Verify:** Add site end-to-end → appears in sidebar selector

### Checkpoint 3 — Keyword Research
- [ ] `lib/claude.ts` — client singleton + prompts
- [ ] `app/api/seo/keyword-research/route.ts` — Claude + web_search → persist
- [ ] Keywords page + `keyword-table.tsx` + `keyword-research-modal.tsx`
- **Verify:** Topic → 20 keywords from Claude → save → appear in table

### Checkpoint 4 — Article Generation + SEO Analysis
- [ ] Port `content-analysis.js` → `lib/seo-analysis.ts` (11 checks)
- [ ] Port `readability-analysis.js` → `lib/readability.ts` (7 checks)
- [ ] `generate-article/route.ts` — 3-step Claude pipeline with SSE
- [ ] `analyze-content/route.ts` — scores + suggestions
- [ ] `meta-generate/route.ts`
- [ ] Articles list, new, [id] pages
- [ ] `generate-article-wizard.tsx` — SSE progress steps
- [ ] `article-editor.tsx` + `seo-score-sidebar.tsx` — debounced analysis
- **Verify:** Keyword → 1500+ word article → SEO score visible → edit → score updates

### Checkpoint 5 — Publishing
- [ ] `publish/wordpress/route.ts` — WP REST API + update Article
- [ ] `publish/test-connection/route.ts`
- [ ] `publish-modal.tsx`
- [ ] Site settings page (General + CMS + Publishing tabs)
- **Verify:** Article → publish to real WP site → post appears as draft

### Checkpoint 6 — Analytics + Calendar
- [ ] `analytics/[siteId]/route.ts` — seeded 30-day mock
- [ ] Analytics page — 4 cards + recharts LineChart + tables
- [ ] Calendar page — react-day-picker month view
- **Verify:** Charts render; calendar shows scheduled articles

### Checkpoint 7 — Marketing Landing Page
- [ ] All 13 section components with `motion` animations
- [ ] `(marketing)/layout.tsx` + `page.tsx` + `pricing/page.tsx`
- [ ] Monthly/annual pricing toggle
- **Verify:** Renders at 375px / 768px / 1440px

### Checkpoint 8 — Brand Hub + Multi-Channel
- [ ] `brand/route.ts` — CRUD BrandVoice + Audience + KnowledgeBase
- [ ] Brand Hub page (3 tabs) + `brand-voice-form.tsx`
- [ ] `repurpose/route.ts` — article → multi-channel assets
- [ ] `repurpose-modal.tsx`
- [ ] All 5 individual generate routes (email, social, ad, landing-page, press-release)
- [ ] Templates gallery page + 50 built-in templates
- **Verify:** Brand voice → generate article → repurpose to 3 channels → assets saved

### Checkpoint 9 — Campaign Manager
- [ ] `campaigns/route.ts` — CRUD Campaign + CampaignAsset
- [ ] Campaigns list + new wizard + [id] Kanban board
- [ ] `campaign-card.tsx`
- **Verify:** Campaign → blog + social + email → all on campaign board

### Checkpoint 10 — Polish + Launch Prep
- [ ] Loading skeletons (`loading-state.tsx`) on all async data
- [ ] Empty states (`empty-state.tsx`) on all pages
- [ ] Sonner toasts on all API paths
- [ ] `next build` — zero errors, zero warnings
- [ ] Responsive: 375px / 768px / 1280px / 1440px
- [ ] WCAG AA contrast check
- [ ] All routes return `{ success, data?, error? }` + verify auth session
- [ ] No API keys in code
- [ ] Vercel deployment

---

## Quality Checklist

**Backend:**
- [ ] All 18 API routes respond correctly
- [ ] Claude calls use `web_search_20250305` tool
- [ ] Article generation via SSE produces real 1500+ word articles
- [ ] WordPress publish tested against real WP site
- [ ] No API keys in code

**Frontend:**
- [ ] TypeScript strict mode — zero `any`
- [ ] `next build` zero errors/warnings
- [ ] Zod + react-hook-form on all forms
- [ ] Loading + error states everywhere
- [ ] Responsive: 375px / 768px / 1280px / 1440px

**Features:**
- [ ] Add site end-to-end
- [ ] Research 20 keywords
- [ ] Generate 1500-word article + real-time SEO score
- [ ] Publish to WordPress as draft
- [ ] Analytics charts render
- [ ] Content calendar shows articles
- [ ] Brand voice used in generation
- [ ] Repurpose to email + social + ad
- [ ] Campaign board shows all assets
- [ ] Templates gallery generates content

---

## Future Phases (Do Not Build Now)

- **Phase 2:** Google Search Console OAuth — real analytics data
- **Phase 3:** Stripe billing (4-tier pricing)
- **Phase 4:** AI image generation — Replicate FLUX `black-forest-labs/flux-schnell`
- **Phase 5:** Multi-tenant Supabase Auth (replace NextAuth)
- **Phase 6:** Webflow, Shopify, Wix CMS adapters
- **Phase 7:** Backlink exchange network
- **Phase 8:** Brand voice AI training from content crawl
- **Phase 9:** Chrome browser extension (write anywhere)
- **Phase 10:** Team collaboration — seats, approval workflows, RBAC
- **Phase 11:** AI Studio — no-code custom agent builder (Jasper Grid equivalent)
- **Phase 12:** White-label agency mode
- **Phase 13:** AEO dashboard — track AI search appearances (Perplexity, ChatGPT, Gemini)
- **Phase 14:** Mobile app (React Native / Expo)

---

## End-to-End Verification Path

1. Sign in with Google → `/dashboard`
2. Add site: "Test Coffee Shop", domain "mycoffeeshop.com", CMS: WordPress
3. Create brand voice: "Friendly Local Expert" — tone tags [friendly, conversational, local]
4. Create audience: "Coffee Lovers 25–45, South Florida"
5. Research keywords "coffee shops delray beach" → 20 keywords in table
6. Generate article "best coffee shops delray beach" (brand voice + audience) → 1500+ words + SEO score
7. Edit article → score updates on keystroke (1s debounce)
8. Repurpose → email + Twitter thread + LinkedIn + Google Ad saved
9. Create campaign "Spring 2026 Local SEO" → add article + assets → board shows all
10. Publish to WP test site → post appears as draft in WP dashboard
11. Templates gallery → "Press Release" template → generate + save
12. Analytics page → recharts render with mock data
13. Calendar → scheduled articles visible
