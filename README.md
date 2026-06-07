# ChronoFrame

**Custom FPS video converter that runs entirely in your browser.**

ChronoFrame lets you re-time any video to a target frame rate — slow it down, speed it up, or dial in a precise cinematic FPS — without ever uploading your footage to a server. The entire FFmpeg transcoding engine runs locally on your device via WebAssembly.

---

## ✨ Why ChronoFrame is different

### 🔒 Your media never leaves your device — 100% privacy

Most online video tools upload your file to a cloud server, process it there, and hand you back a download link. That means your footage sits on someone else's machine, gets cached, and is out of your control.

ChronoFrame does **none of that**. Your video is read, transcoded, and saved entirely within your browser tab. **Nothing is ever uploaded.** There are no S3 buckets, no temp files on a server, no third party touching your frames. When you close the tab, it's gone.

### ⚡ Powered by WebAssembly (ffmpeg.wasm)

ChronoFrame ships the real FFmpeg, compiled to [WebAssembly](https://webassembly.org/), straight into the browser. This is the core USP:

- **Native-speed transcoding on the client** — the heavy lifting happens on your CPU, not a rented server.
- **Privacy by architecture, not by promise** — since processing is local, there's literally no upload path to leak.
- **No queues, no rate limits** — you're not waiting in line behind other users for server compute.
- **Works offline once loaded** — the engine lives in your tab.

### 💸 Benefits that fall out of the design

| Benefit | How WebAssembly enables it |
|---|---|
| **Zero server compute cost** | Your device does the transcoding, so the app stays cheap to run — and that's passed on as a fair, credit-based price. |
| **Zero storage cost & risk** | No files stored server-side means no breach surface and no storage bills. |
| **Instant start** | No upload wait before processing begins. |
| **Scales effortlessly** | Each user brings their own compute, so the app never bottlenecks. |

---

## 🔁 How it works

1. **Pick a video** from your device.
2. **Choose a target FPS.**
3. ChronoFrame loads the `ffmpeg.wasm` core, transcodes the video locally, and shows live progress (memory allocation → frame transcoding → MP4 muxing).
4. **Download** the converted file — straight out of the browser, never having left your machine.

---

## 🔐 Authentication

Auth is handled by [Supabase](https://supabase.com/):

- **Try before you sign up** — anonymous visitors get **one free conversion**, tracked per IP.
- **Sign up for a free credit** — new accounts start with **1 free transcoding credit**.
- Sessions are managed via Supabase SSR cookies; user profiles and credit balances live in the `user_profiles` table protected by Row Level Security.

## 💳 Payments & pricing model

ChronoFrame uses a **credit-based, pay-as-you-go** model (no subscription) powered by [Razorpay](https://razorpay.com/):

| Pack | Credits | Price |
|---|---|---|
| **Starter Pack** | 5 credits | ₹199 |
| **Pro Pack** | 10 credits | ₹299 |

- **1 credit = 1 conversion.**
- **Credits never expire.**
- Payments are created and verified server-side (order creation + signature verification) so balances can't be tampered with client-side.

When you run out of credits, the paywall offers a one-time top-up — no recurring charges.

---

## 🛠️ Tech stack

- **[Next.js 16](https://nextjs.org/)** (App Router) + **React 19**
- **[ffmpeg.wasm](https://github.com/ffmpegwasm/ffmpeg.wasm)** (`@ffmpeg/ffmpeg`, `@ffmpeg/util`) — in-browser transcoding
- **[Supabase](https://supabase.com/)** — auth & user/credit data
- **[Razorpay](https://razorpay.com/)** — payments
- **[TanStack Query](https://tanstack.com/query)** — data fetching & cache
- **[Tailwind CSS 4](https://tailwindcss.com/)** + **[Framer Motion](https://www.framer.com/motion/)** — UI & animation

---

## 🚀 Getting started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment variables

Create a `.env.local` with:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
```

Then apply the database schema in [`supabase_schema.sql`](supabase_schema.sql) to your Supabase project (creates `user_profiles`, the new-user credit trigger, and the IP-based `anonymous_usage` table).

---

## 📂 Project structure

```
src/
├── app/
│   ├── page.tsx            # Main converter UI + ffmpeg.wasm pipeline
│   ├── api/
│   │   ├── payment/        # Razorpay order creation & verification
│   │   └── usage/          # Anonymous + credit usage tracking
│   ├── privacy/ terms/ refund/
├── components/             # AuthModal, PaymentModal, DemoModal, Providers
├── hooks/                  # use-credits, use-usage, use-payment
└── lib/                    # supabase clients, razorpay helper
```
