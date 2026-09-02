# 🔮 গুঞ্জন (Gunjon) — বেনামী প্রকাশনা প্ল্যাটফর্ম

> All-in-One Anonymous Reporting Platform for Bangladesh

## v4.0 — Firestore → Realtime Database মাইগ্রেশন (সম্পূর্ণ ফ্রি)

- **Firestore থেকে Realtime Database (RTDB) এ সম্পূর্ণ মাইগ্রেশন** — সব ডেটা এখন RTDB-তে সংরক্ষিত হয়। Firestore আর ব্যবহৃত হয় না।
- **Firebase Storage সম্পূর্ণ বাদ** — কোনো storage ব্যবহার নয়। `storage.rules` ফাইল মুছে ফেলা হয়েছে।
- **শুধুমাত্র একটি rules ফাইল** — `database.rules.json` (মাস্টার)। `firestore.rules` ও `storage.rules` সরানো হয়েছে।
- **সম্পূর্ণ ফ্রি** — Firebase Spark (free) plan এ RTDB: 1 GB স্টোরেজ, 10K concurrent connections, 10 GB/month ডাউনলোড। কোনো পেইড সার্ভিস নেই।
- **সব ওপেন সোর্স** — Next.js, React, Tailwind CSS, Firebase, bcryptjs, uuid, shadcn/ui, Bootstrap Icons। কোনো প্রোপাইটারি কম্পোনেন্ট নেই।
- **Cloudflare Pages ফ্রি হোস্টিং** — সম্পূর্ণ স্ট্যাটিক এক্সপোর্ট, Cloudflare Pages ফ্রি টিয়ারে হোস্ট করা যায়।

## v3.1 — কনফিগ ও রুলস আপডেট

- **ডেমো ফলব্যাক সম্পূর্ণ সরানো হয়েছে** — Firebase কনফিগ এখন শুধুমাত্র `.env.local` থেকে পড়ে। কোনো hardcoded ডেমো ভ্যালু নেই।
- **মাস্টার Realtime Database Rules** — `database.rules.json` এমনভাবে লেখা হয়েছে যেন ভবিষ্যতে আর কখনো এডিট করতে না হয়।

## v3.0 — মূল উন্নতি (v2.0 থেকে)

- **রোল-ভিত্তিক মাল্টি-অ্যাডমিন সিস্টেম** — সুপার অ্যাডমিন এখন অন্যান্য ইউজার তৈরি করতে পারবেন নির্দিষ্ট রোল সহ:
  - `super_admin` — সম্পূর্ণ অ্যাক্সেস (ইউজার ম্যানেজমেন্ট সহ)
  - `content_admin` — পোস্ট ও মন্তব্য ম্যানেজমেন্ট
  - `posts_moderator` — শুধু পোস্ট ম্যানেজমেন্ট
  - `comments_moderator` — শুধু মন্তব্য ম্যানেজমেন্ট
- **ইউজার ম্যানেজমেন্ট ট্যাব** — সুপার অ্যাডমিন প্যানেলে নতুন ট্যাব যেখানে ইউজার তালিকা, নতুন ইউজার তৈরি, পাসওয়ার্ড রিসেট, এবং ইউজার ডিলিট করা যায়।
- **সম্পূর্ণ এডিট সুবিধা** — অ্যাডমিন প্যানেল থেকে পোস্ট ও মন্তব্যের শিরোনাম, বিবরণ, বিষয়, অবস্থান, পরিমাণ, ফলাফল, এবং অন্যায়কারীর তথ্য সম্পাদনা করা যায়।
- **অন্যায়কারীর তথ্য সেকশন** — রিপোর্ট ফর্মে নতুন ঐচ্ছিক সেকশন যেখানে ইউজার অন্যায়কারীর (চাঁদাবাজ, চোর, ছিনতাইকারী) তথ্য দিতে পারবে:
  - ধরন (চাঁদাবাজ, ঘুষবাজ, চোর, ছিনতাইকারী, দুর্নীতিবাজ, হয়রানিকারী, প্রতারক, অন্যান্য)
  - নাম/ডাকনাম
  - পেশা/পদবি
  - দল/চক্রের নাম
  - চেহারা/বয়স/বিবরণ
- **অন্যায়কারী পরিসংখ্যান** — ড্যাশবোর্ডে নতুন চার্ট যা অন্যায়কারীর ধরন অনুযায়ী রিপোর্ট দেখায়।
- **পোস্ট কার্ডে অন্যায়কারী ব্যাজ** — প্রতিটি পোস্ট কার্ডে অন্যায়কারীর ধরন দ্রুত দেখা যায়।

## v2.0 — মূল উন্নতি (v1.0 থেকে)

- **ড্যাশবোর্ড ফিক্স** — আগে Firestore error হলে চিরকাল "loading..." এ আটকে থাকত। এখন error হলে স্পষ্ট বার্তা ও "আবার চেষ্টা করুন" বাটন দেখায়।
- **অ্যাডমিন প্যানেল ফিক্স** — সেটআপ ও লগইন এখন সঠিকভাবে কাজ করে। প্রতিটি Firestore error-এর জন্য বন্ধুত্বপূর্ণ বাংলা বার্তা দেখায়।
- **লোকেশন ক্যাসকেড ফিক্স** — বিভাগ → জেলা → উপজেলা → ইউনিয়ন সিলেক্টর এখন নিখুঁতভাবে কাজ করে। সিলেট বিভাগ নির্বাচন করলে শুধু সিলেটের ৪টি জেলা দেখায়, জেলা নির্বাচন করলে শুধু সেই জেলার উপজেলাগুলো দেখায়, ইত্যাদি।
- **১০ সেকেন্ড টাইমআউট** — প্রতিটি Firestore কলে টাইমআউট যোগ করা হয়েছে যাতে অ্যাপ কখনো hang না করে।
- **ডেমো প্রজেক্ট ওয়ার্নিং** — ডিফল্ট Firebase প্রজেক্ট ব্যবহৃত হলে উপরে একটি সতর্কবার্তা দেখায়।
- **পারফরম্যান্স** — অপ্রয়োজনীয় ৩০+ npm packages সরানো হয়েছে (react-hook-form, recharts, cmdk, radix-ui এর ১৫+ প্যাকেজ ইত্যাদি)। Bundle size অর্ধেকের বেশি কমেছে।
- **Select trigger ফিক্স** — Radix Select trigger এখন full-width হয় (আগে `w-fit` ছিল)।

## মূল বৈশিষ্ট্য

- **বেনামী পোস্টিং** — অ্যাকাউন্ট ছাড়াই রিপোর্ট করুন (নাম, ইমেইল, ফোন, IP সংগ্রহ হয় না)
- **১২টি বিভাগ** — চাঁদাবাজি, ঘুষ, হয়রানি, দুর্নীতি, সেবা বঞ্চনা, অনিয়ম, প্রতারণা, জনস্বাস্থ্য, শিক্ষা, অবকাঠামো, প্রাকৃতিক দুর্যোগ, অন্যান্ন
- **Unified Geo API ইন্টিগ্রেশন** — বিভাগ → জেলা → উপজেলা → ইউনিয়ন → বিস্তারিত অবস্থান সম্পূর্ণ ক্যাসকেডিং সিলেক্টর (দ্রুত, নির্ভুল, cached)
- **একবার সেটআপ অ্যাডমিন** — প্রথমবার অ্যাডমিন প্যানেলে গেলে ইউজারনেম ও পাসওয়ার্ড সেট করতে হবে (Firebase Firestore-এ সংরক্ষিত)। এরপর আর নতুন অ্যাডমিন সেটআপ করা যাবে না, শুধু লগইন করা যাবে।
- **অ্যাডমিন প্যানেল** — পোস্ট ও মন্তব্য যাচাই, অনুমোদন, বাতিল, মুছে ফেলা
- **মডারেশন** — সকল পোস্ট ও মন্তব্য পেন্ডিং অবস্থায় থাকে, অ্যাডমিন অনুমোদনের পর প্রকাশিত হয়
- **ড্যাশবোর্ড** — ট্রান্সপারেন্সি লেজার, বিভাগ ও বিষয় অনুযায়ী পরিসংখ্যান
- **মন্তব্য সিস্টেম** — বেনামী মন্তব্য (মডারেশন সহ)
- **সমর্থন ব্যবস্থা** — কমিউনিটি কনফার্ম/আপভোট
- **ডার্ক/লাইট মোড** — থিম টগল
- **রেসপন্সিভ ডিজাইন** — মোবাইল ও ডেস্কটপ উভয়ের জন্য
- **গোপনীয়তা পৃষ্ঠা** — বিস্তারিত গোপনীয়তা নীতি
- **FAQ** — সাধারণ জিজ্ঞাসা ও উত্তর
- **যোগাযোগ ফর্ম** — ব্যবহারকারীদের বার্তা পাঠানোর সুবিধা

## Tech Stack (সব ফ্রি + ওপেন সোর্স)

- **Framework**: Next.js 16 (App Router) — MIT License
- **Language**: TypeScript 5 — Apache License 2.0
- **Styling**: Tailwind CSS 4 + shadcn/ui — MIT License
- **Icons**: Bootstrap Icons (CDN) — MIT License
- **Database**: Firebase Realtime Database (RTDB) — Firebase Spark plan (ফ্রি): 1 GB স্টোরেজ, 10K concurrent connections, 10 GB/month ডাউনলোড
- **Auth**: bcryptjs (12-round hashing) — MIT License, RTDB-এ সংরক্ষিত
- **Location API**: [Unified Bangladesh Geo API](https://unifiedapi.pages.dev/) (ফ্রি, ওপেন সোর্স) — লোকাল JSON ফলব্যাক সহ
- **Theme**: next-themes (dark/light) — MIT License
- **Toast**: Sonner — MIT License
- **Hosting**: Cloudflare Pages (ফ্রি) — সম্পূর্ণ স্ট্যাটিক এক্সপোর্ট

> **Firebase Storage ব্যবহৃত হয় না।** Firestore ব্যবহৃত হয় না। শুধু Realtime Database।

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. (Optional) Configure Firebase env vars
cp .env.example .env.local
# Fill in your own Firebase project credentials.

# 3. Start development server
npm run dev

# 4. Open http://localhost:3000
```

The app ships with a working demo Firebase project (`gunjon-pages-dev`) baked
in as a fallback, so `npm run dev` works out of the box. For production,
**always** set your own credentials in `.env.local`.

## অ্যাডমিন সেটআপ (Admin Setup)

1. অ্যাপটি চালু করে হেডারের ⚙️ আইকনে ক্লিক করুন।
2. প্রথমবার আপনাকে "প্রথমবার অ্যাডমিন সেটআপ" ফর্ম দেখানো হবে।
3. পূর্ণ নাম, ইউজারনেম ও পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর) দিন।
4. "অ্যাডমিন সেটআপ সম্পন্ন করুন" বাটনে ক্লিক করুন।
5. এরপর ঐ ইউজারনেম ও পাসওয়ার্ড দিয়ে লগইন করুন।

**গুরুত্বপূর্ণ**: সেটআপ একবারই হবে। ক্লায়েন্ট-সাইড কোডে নিশ্চিত করা হয়েছে যে একবার `admins/root-admin` রেকর্ড তৈরি হলে আর কেউ নতুন সুপার অ্যাডমিন সেটআপ করতে পারবে না।

## লোকেশন API

রিপোর্ট করার সময় লোকেশন সিলেক্টরগুলো [Unified Bangladesh Geo API](https://unifiedapi.pages.dev/)
থেকে ডেটা লোড করে:

- **বিভাগ** → `GET /api/geo/v1.0/divisions`
- **জেলা** → `GET /api/geo/v1.0/districts?division_id={id}`
- **উপজেলা** → `GET /api/geo/v1.0/upazilas?district_id={id}`
- **ইউনিয়ন** → `GET /api/geo/v1.0/unions?upazila_id={id}`
- **বিস্তারিত অবস্থান** → ইউজারের লেখা টেক্সট

যদি রিমোট API অনুপলব্ধ থাকে, অ্যাপটি স্বয়ংক্রিয়ভাবে `src/data/*.json`
ফাইলগুলোতে ফিরে যায় যাতে ইউজার অভিজ্ঞতা ব্যাহত না হয়।

API বেস URL পরিবর্তন করতে চাইলে `.env.local` এ `NEXT_PUBLIC_UNIFIED_API_BASE`
সেট করুন।

## 🔑 মাস্টার Realtime Database Rules (একবার ডিপ্লয় করুন, আর কখনো এডিট করতে হবে না)

এই প্রজেক্টে শুধু একটি rules ফাইল আছে: `database.rules.json`। একবার `firebase deploy --only database:rules` চালালেই ভবিষ্যতে আর কখনো এটি এডিট করতে হবে না — যেকোনো নতুন ফিচার বা কালেকশন যোগ করলেও।

### কেন "মাস্টার"?

গুঞ্জন একটি বেনামী প্ল্যাটফর্ম — কোনো ইউজার অ্যাকাউন্ট নেই, কোনো Firebase Auth নেই। তাই rules-এ `auth != null` এর মতো শর্ত কাজ করবে না। নিরাপত্তা নিশ্চিত হয় অ্যাপের ডিজাইন দিয়ে (bcrypt-hashed admin passwords, `status: 'pending'` ডিফল্ট, ক্লায়েন্ট-সাইড রোল চেক), না হয় DB rules দিয়ে।

মাস্টার rules অতএব সব পাথে public read/write allow করে, সাথে query performance-এর জন্য index যোগ করে। নতুন কালেকশন যোগ করলেও আর rules এডিট করতে হবে না — কারণ `.read: true` এবং `.write: true` সব পাথে প্রযোজ্য।

### `database.rules.json` — Realtime Database (মাস্টার)

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "posts": { ".indexOn": ["status", "category", "division", "district", "upazila", "union", "createdAt", "upvotes", "viewCount", "hashedId", "outcome", "amount"] },
    "comments": { ".indexOn": ["postId", "status", "createdAt", "upvotes"] },
    "admins": { ".indexOn": ["username", "role", "createdAt"] },
    "contactMessages": { ".indexOn": ["isRead", "createdAt"] }
  }
}
```

- `.read: true`, `.write: true` — সব পাথে পাবলিক read/write (বেনামী অ্যাপের জন্য প্রয়োজনীয়)।
- `.indexOn` — query performance-এর জন্য index। নতুন ফিল্ড যোগ করলে এখানে index যোগ করা ঐচ্ছিক (শুধু দ্রুত query-র জন্য)।
- **Firestore rules নেই** — অ্যাপ Firestore ব্যবহার করে না।
- **Storage rules নেই** — অ্যাপ Firebase Storage ব্যবহার করে না।

### একবার ডিপ্লয় করুন

```bash
# Firebase CLI ইনস্টল থাকলে
npm install -g firebase-tools
firebase login
firebase deploy --only database:rules
```

এটি একবার করলেই হয়েছে। ভবিষ্যতে অ্যাপে নতুন ফিচার যোগ করলেও rules আর এডিট করতে হবে না।

> **গুরুত্বপূর্ণ**: Firebase Console-এ Realtime Database চালু থাকতে হবে (Build → Realtime Database → Create database)। অ্যাপ চালু করার আগে এই rules ডিপ্লয় করা আবশ্যক।

## Deployment (Cloudflare Pages)

এই প্রজেক্টটি Cloudflare Pages-এ স্ট্যাটিক এক্সপোর্ট হিসেবে ডিপ্লয় করার জন্য কনফিগার করা হয়েছে।

### Build configuration

| Setting | Value |
|---|---|
| Framework preset | None (plain static) |
| Build command | `npx next build` |
| Build output directory | `out` |
| Root directory | (empty / project root) |

### ডিপ্লয়মেন্ট স্টেপ

1. GitHub এ কোড পুশ করুন:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Gunjon production"
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. Cloudflare Pages এ গিয়ে **Create project** → **Connect to Git** → রিপো সিলেক্ট করুন।

3. উপরের Build configuration অনুযায়ী সেটিংস পূরণ করুন।

4. Environment Variables যোগ করুন (Settings → Environment variables):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - এবং বাকি Firebase vars (`.env.example` দেখুন)
   - `NEXT_PUBLIC_UNIFIED_API_BASE` (ঐচ্ছিক, ডিফল্ট `https://unifiedapi.pages.dev/api/geo/v1.0`)

5. **Save and Deploy** ক্লিক করুন।

### স্ট্যাটিক এক্সপোর্ট সম্পর্কে গুরুত্বপূর্ণ নোট

- `next.config.ts` এ `output: 'export'` সেট করা আছে, যা `out/` ডিরেক্টরিতে সম্পূর্ণ স্ট্যাটিক সাইট তৈরি করে।
- কোনো server-side API route নেই — সব ডেটা Firebase Firestore (client SDK) এবং Unified Geo API (remote fetch) থেকে সরাসরি ক্লায়েন্টে লোড হয়।
- যদি Unified Geo API অনুপলব্ধ থাকে, অ্যাপটি `src/data/*.json` (বান্ডেল করা ফলব্যাক) থেকে লোকেশন ডেটা লোড করে।
- `public/_redirects` এবং `public/_headers` ফাইল Cloudflare Pages এ স্বয়ংক্রিয়ভাবে কপি হয় এবং SPA রাউটিং ও সিকিউরিটি হেডার নিশ্চিত করে।

### Firebase Rules ডিপ্লয় করা (একবারই)

Cloudflare Pages ডিপ্লয়মেন্টের পাশাপাশি Firebase rules একবার ডিপ্লয় করতে হবে। এটি একবার করলেই হয়েছে — ভবিষ্যতে আর কখনো এডিট করতে হবে না।

```bash
# Firebase CLI ইনস্টল থাকলে
npm install -g firebase-tools
firebase login
firebase deploy --only database:rules
```

বিস্তারিত উপরে "🔑 মাস্টার Realtime Database Rules" সেকশনে।

### Vercel এ ডিপ্লয় (ঐচ্ছিক)

```bash
# Vercel এ ইম্পোর্ট করুন
# Framework Preset: Next.js
# Build command: npm run build
# Output directory: out
```

Vercel প্রজেক্ট সেটিংসে Environment Variables হিসেবে `NEXT_PUBLIC_FIREBASE_*` এবং `NEXT_PUBLIC_UNIFIED_API_BASE` যোগ করতে ভুলবেন না।

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main SPA (all views)
│   │   ├── layout.tsx            # Root layout + theme + Sonner toaster
│   │   └── globals.css           # Tailwind + custom theme
│   ├── components/ui/            # shadcn/ui components (only used ones)
│   ├── data/                     # Bundled geo JSON (fallback)
│   └── lib/
│       ├── firebase.ts           # Firebase RTDB init (env-only, no demo fallback)
│       ├── admin-auth.ts         # Admin setup / login / token / user management (RTDB)
│       ├── rtdb-helpers.ts       # Typed RTDB CRUD with timeout
│       ├── use-location-cascade.ts # Cascading location selector hook
│       ├── client-data.ts        # Unified API fetch + local fallback
│       ├── bd-data.ts            # Static data layer (types & helpers)
│       └── utils.ts              # Utility functions
├── public/                       # Static assets + Cloudflare _redirects/_headers
├── database.rules.json           # 🔑 মাস্টার Realtime Database rules (একমাত্র rules ফাইল)
├── firebase.json                 # Firebase deploy config (RTDB rules only)
├── .env.example                  # Environment variable template
├── package.json
├── tsconfig.json
└── next.config.ts                # output: 'export' for Cloudflare Pages
```

## পাসওয়ার্ড রিসেট (প্রযোজ্য যদি সুপার অ্যাডমিন পাসওয়ার্ড ভুলে যান)

সুপার অ্যাডমিনের পাসওয়ার্ড ভুলে গেলে, Firebase Console থেকে `admins/root-admin` রেকর্ড মুছে আবার সেটআপ করতে হবে:

1. Firebase Console → Realtime Database → Data → `admins/root-admin` রেকর্ড মুছুন।
2. অ্যাপে আবার অ্যাডমিন প্যানেলে যান → আবার সুপার অ্যাডমিন সেটআপ করুন।

অথবা, সুপার অ্যাডমিন লগইন করে থাকলে "ইউজার ম্যানেজমেন্ট" ট্যাব থেকে অন্যান্য ইউজারের পাসওয়ার্ড রিসেট করা যায় (সুপার অ্যাডমিন নিজের পাসওয়ার্ড এই প্যানেল থেকে পরিবর্তন করা যায় না)।

নতুন bcrypt হ্যাশ তৈরি করতে চাইলে:

```bash
node -e "const b=require('bcryptjs');b.hash('new-password',12).then(h=>console.log(h))"
```

## লাইসেন্স

MIT
