# Multilingual assistant implementation and setup

## Integration and architecture

This is part of the existing Tiorkhali Mart React 19 / Vite / Tailwind / Zustand application and Express / Mongoose backend. Existing manager inventory, customer buying inquiries, reviews, notifications and administrator approval remain the business model. There is no cart, payment gateway or external booking system, so the assistant explains those unsupported requests instead of inventing actions.

The shared design uses navy surfaces, mint actions, warm apricot accents, responsive cards and reduced-motion-aware animations. Landing, navigation, marketplace filters, login/registration, account settings and the three dashboards share this palette. Marketplace filters use actual discounted prices, retain URL state and expose loading, retry and empty states. Product dialogs support keyboard access, Escape, focus containment and focus restoration.

```
Microphone / typed input
  -> STT (native browser, Gemini, or local Whisper)
  -> chosen / detected language
  -> bounded page context and conversation
  -> LLMProvider (Gemini structured plan or local core parser)
  -> validated registered tools + authenticated database user
  -> actual website data / action
  -> concise translated result
  -> native system voice or eSpeak WAV
```

Typed messages and transcribed messages call the same `POST /api/agent/message` endpoint. The server receives the current route/title, up to 20 visible/recent item references, search constraints and the current product draft; it never receives the page HTML or auth token as model context. JWTs remain request headers handled by authentication middleware. The model never receives a database connection, arbitrary HTTP capability, shell or JavaScript execution capability.

The model chooses a structured plan. The server validates all calls before running any action and permits at most one mutation per turn. Final action acknowledgments come from executed tools. Model-only messages cannot assert successful mutations. Gemini failures fall back to the existing local core command parser. Adding another language/provider requires extending the catalog/provider interface rather than rewriting the voice panel.

## Voice behavior

Start voice explicitly with the floating microphone or the panel microphone. Native browser recognition uses the selected locale and a parallel PCM recording provides fallback if browser recognition fails. Automatic language mode uses server transcription and retains the detected language. No account is required to browse/search or use public page controls; product creation requires an approved store-manager session.

The panel shows ready, listening, processing, speaking and error states, a live transcript, typed input, mute, replay, stop, language, clear conversation and memory controls. If a product is incomplete, the agent asks for missing fields and resumes listening after speaking during the explicitly started voice session. The stop microphone control ends that session. Complete product commands may save automatically; disable automatic save to review, and low-confidence browser recognition also requires review. Name, price and quantity (whole stock units) remain editable before confirmation.

Speech capture is capped at 30 seconds. PCM WAV avoids browser codec mismatches. STT requests have a timeout; model reasoning, translation, text requests and fallback speech playback also have bounded waits. Permission denial, unsupported microphone environments, provider failure, silence and malformed requests produce readable messages and keep typed input usable. A failed cloud STT request offers retry/typed input; it does not silently upload the recording to a different cloud service.

## Supported languages

| Layer | Coverage |
|---|---|
| Bundled full website UI | English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati |
| Agent language selector | English, Hindi, Bengali, Hinglish, Banglish, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Auto Detect |
| Local server voice output | Eleven base languages (hybrid choices use their Hindi/Bengali base voice) |
| Recognition | Native browser locales where available; multilingual Whisper locally; Gemini when configured |
| Broad natural language reasoning / additional-language replies | Gemini when configured; local parser provides supported core commands rather than unrestricted conversation |

UI labels switch immediately from bundled dictionaries. Proper names/store brands are preserved. Common product vocabulary is bundled; unfamiliar descriptions/reviews require dynamic server translation. Gemini performs dynamic translation when a key exists, otherwise local NLLB is used. Kannada, Malayalam, Punjabi and Urdu are assistant choices; the full site UI stays within the seven bundled UI locales. Local script detection is heuristic and ambiguous shared scripts/code switching may need an explicit selection. Gemini transcription provides an additional detected-language result. Installed system voices vary by browser/device; eSpeak fallback is audible but synthetic.

## Registered capabilities

| Tool | Result and permissions |
|---|---|
| navigate | Allowlisted internal pages; protected destinations enforce role |
| search_products | Database-backed product search, category, delivery, budget and discounted-price sort |
| get_product | Real product details and detail dialog |
| get_requests | Current customer's inquiries or manager's owned inquiries |
| create_product | Approved manager only; missing fields become a draft; optional review/low-confidence review |
| update_product | Owned inventory, validated fields, explicit confirmation |
| delete_product | Owned inventory and explicit confirmation |
| request_product | Customer buying inquiry, stock check and confirmation; duplicate active requests are suppressed |
| update_request | Manager-owned inquiry; confirmation; completion atomically changes stock and status |
| get_profile | Signed-in account page |
| update_profile | Own name/address only, validated and confirmed; roles/authentication cannot be changed |
| website_control | Scroll up/down, go back, read visible main-page text |

Examples:

- `Show me the cheapest products under 500 rupees.`
- `Find a laptop under fifty thousand.`
- `Show the cheapest one.` / `Open the second one.` after a search
- `চাল খুঁজুন` / `चावल खोजो`
- Manager: `add rice price two hundred rupees quantity five units`
- Manager: `add new product`, then answer the name and price questions
- Customer after selecting a result: `Buy this`, then `confirm`
- Manager: `show my requests`, then `Complete the first request`, then `confirm`
- `Change my name to New Name`, then `confirm`
- `Remember that I prefer Bengali.` / `Forget that I prefer Bengali.`

Search does not fabricate catalog items. A laptop request legitimately returns zero results if no store lists laptops. Reviews and administrator approval remain available through their existing UI; the agent can navigate to those pages but does not have arbitrary form submission or administrator account deletion tools. Unsupported best-rating sorts, carts/payments, external shopping and flights are not synthesized into fake APIs.

## Provider and environment setup

Use Node.js **22** and copy `.env.example` to `.env` for local development. On Vercel set variables in the backend environment for the correct Preview/Production targets. Never prefix secret keys with `VITE_`.

| Variable | Purpose |
|---|---|
| MONGODB_URI | Atlas or another MongoDB replica set; required for persistence/deployment |
| JWT_SECRET | Long random server secret; required in production |
| GEMINI_API_KEY | Enables Gemini intent planning, audio transcription and dynamic translation |
| LLM_API_KEY | Optional separate Gemini key for intent/translation |
| LLM_PROVIDER | `gemini` or `local`; without a key falls back to local |
| LLM_MODEL | Defaults to `gemini-2.5-flash`; choose a compatible enabled model |
| STT_API_KEY | Optional separate Gemini key for transcription |
| STT_PROVIDER | `gemini` or `local`; without a key uses local Whisper |
| STT_MODEL | Defaults to `gemini-2.5-flash` |
| WHISPER_MODEL | Defaults to `Xenova/whisper-base` for local multilingual transcription |
| PORT | Standalone host, defaults to 3000 |
| ADMIN_PHONE / ADMIN_PASSWORD / ADMIN_NAME | Optional one-time administrator provisioning script |

No TTS API key is required: the implementation uses installed native voices or local eSpeak. Provider interfaces are defined in `backend/agent/providers.ts`, `backend/agent/speech.ts`, the frontend speech hooks, and `src/agent/memory.ts`. The official SDK's structured responses are described in [Google's structured-output documentation](https://ai.google.dev/gemini-api/docs/structured-output); inline audio processing is documented in [Google's audio guide](https://ai.google.dev/gemini-api/docs/audio).

For production Vercel speech, configure Gemini rather than relying on a Whisper/NLLB cold-start download. Local Whisper downloads/cache need network, memory and time; NLLB is large enough to exceed serverless temporary-storage limits. The build keeps server bundles in private `build/`, while `dist/` contains only frontend assets. `api/index.js` imports the bundled ESM handler with resolved local modules. The same handler is reused by the standalone host. A configured database outage never silently switches to temporary storage.

## Database and confirmations

Existing User/Product/Lead/Review/Notification collections remain. New `AgentAction` records hold a validated pending sensitive action, its owner, one-use consumed state and five-minute expiry. A TTL index removes expired records; the request also checks expiry so delayed TTL cleanup cannot permit execution. The server atomically consumes a confirmation and rechecks ownership before execution. Cancellation discards the pending action in the client; it expires on the server.

Lead adds an optional `activeKey` with a sparse unique index for new active customer/product inquiries. Legacy inquiries remain readable and are checked before creating a new one. Completion clears that key. Lead status, product stock and the customer notification update in one MongoDB transaction, preventing repeat completions and overselling. MongoDB Atlas already supports transactions; another MongoDB host must be a replica set. Development preview now starts a temporary one-member replica set when no URI is configured. Production requires a configured persistent database. No business data was added to your real database during automated tests.

Administrator revocation now suspends the account reversibly. Existing records and inventory are preserved; suspended stores are excluded from browsing/search/buying, and administrator restore buttons reinstate access. Signup cannot replace a suspended account to bypass revocation. No default administrator or fixed password is created. Existing admin accounts continue working. For a new database, set ADMIN_PHONE and ADMIN_PASSWORD (at least 12 characters), then run `npm run admin:create`. The script refuses to replace an existing phone account. Remove provisioning credentials afterwards.

## Memory and privacy

Short-term history is React state only: the client keeps up to 20 messages and sends the last 10, bounded to 1,000 characters each. Recent references/search constraints/drafts are limited. Clear conversation or changing accounts resets session state. Full transcripts and raw audio are never persisted by the app.

Long-term memory uses local device storage and only allows a validated language, positive budget up to 1,000,000, and one supported category. Settings are viewable, individually removable, fully clearable and disableable. Explicit `remember` instructions and language selection save preferences; passwords, OTPs, arbitrary personal facts, payment details and auth tokens are not memory fields. Stored values are validated again on hydration. INR is the existing marketplace currency, so arbitrary currency conversion is not offered. Device preferences are local to the browser rather than uploaded to a user profile.

Browser recognition can send audio to the browser's speech service. Cloud fallback sends audio to the configured speech provider; the panel discloses that when enabled. The app does not keep raw microphone recordings. Gemini reasoning receives the bounded conversation/context necessary to understand the current command; provider retention is governed by that provider/account. Auth tokens remain in the existing app's session storage mechanism, not agent memory/model context.

## Validation and security

Every action uses a server-maintained allowlist, typed argument validation, escaped search expressions, authenticated database users, status/role checks and ownership queries. Prompt/context/product strings are untrusted data. Tools cannot execute arbitrary code, URLs, SQL, shell, file operations or HTTP requests. Mutations reject extra ownership/role fields; forms recalculate discounted prices on the server. Signup permits only customer/manager accounts. Async routes return controlled JSON errors rather than stack traces. The notification provider safely handles browsers without desktop notifications and no longer requests notification permission automatically.

Pending action IDs cannot be reused or confirmed by a different user. Risky product edits/deletion, profile updates, buying inquiries and request status changes require confirmation. Client request locking prevents overlapping submissions. Agent traffic has a per-process 40-request/minute IP limit and bounded input/context; production multi-instance deployments should also use their host's distributed rate limiting/WAF. Development request logs include IDs, language, provider, action kinds and latency rather than transcripts, tokens or passwords. Stop/cancel releases microphone resources and aborts frontend requests; a completed server mutation is not rolled back merely because a panel is closed. If a network timeout obscures a creation result, inspect inventory before repeating the command.

## Running and testing

```
npm install
# PowerShell: Copy-Item .env.example .env
# Configure environment variables, then:
npm run dev
```

Open `http://localhost:5173`. Development runs Vite and the watched API. Production: `npm run build`, then `npm start`. Standalone backend is `build/server.mjs`; public assets are in `dist/`. Vercel uses `npm run vercel-build`; after the module-resolution fix, redeploy with the old build cache cleared once.

Automated checks:

```
npm run lint
npm test
npm run test:agent
# In another terminal:
npx vite --host 127.0.0.1 --port 5178 --strictPort
npm run test:browser
npm run test:deployment
npm run test:speech-http
```

`npm test` checks intent/search follow-ups, all native scripts, hybrid detection, memory, malicious arguments, product validation, PCM decoding and actual native synthesized WAV output in eleven base languages. `test:agent` uses a real isolated MongoDB replica set and HTTP requests to check role/ownership, creation, budget filtering, one-use/expired confirmations, concurrent fulfillment, profile updates, native replies and simulated provider outages/malformed plans. `test:browser` uses isolated real APIs/database with simulated microphone/STT/TTS for six non-English UI languages, text/voice actions, multi-turn creation, confidence review, backend recovery, denial, preference forgetting, account forms, dialog keyboard controls and widths 320/375/768/1440. Screenshots are written to ignored `tests/artifacts/`.

`test:deployment` imports the exact Vercel handler with plain Node and checks bundled module resolution, private server output, JSON errors, synthesis and isolated database connection failures. `test:speech-http` uses real local synthesis and Whisper transcription of a known synthesized command; it requires the downloaded Whisper model. This confirms service functionality rather than human accent/noise accuracy.

Manual voice acceptance: sign in as the intended role; select Bengali/Hindi or Auto Detect; allow the microphone; speak a short search; check the visible transcript, real filtered results and spoken reply. Then try an incomplete product conversation, price/quantity correction, review mode, cancellation, mute/replay and a denied microphone. Repeat with actual native speakers and noisy devices before treating recognition accuracy as established.

## Current verification limits

Live Gemini calls require your own enabled API key, quota and permitted model and were not performed without those credentials. Provider outage/invalid output behavior is tested by simulation. Real human recordings and all regional accents were not available. Browser-native recognition and voices depend on the device. Local mode is a bounded command fallback; full semantic conversation and replies in the four additional native agent languages require the configured language provider. Streaming audio/LLM output is not implemented; the UI supplies live transcript/state feedback and returns the complete short response. No cart, online payment, order fulfillment outside inquiries, or external shopping integration has been added.

## Files

Created:

- `shared/agent.ts`, `shared/agentLanguages.ts`, `shared/memoryCommands.ts`
- `backend/agent/providers.ts`, `backend/agent/router.ts`, `backend/agent/speech.ts`, `backend/agent/tools.ts`
- `backend/validation.ts`, `backend/requestService.ts`
- `src/agent/context.ts`, `src/agent/memory.ts`, `src/agent/useVoiceInput.ts`, `src/agent/useVoiceOutput.ts`
- `src/lib/useDialog.ts`, `src/pages/Account.tsx`
- `scripts/create-admin.ts`, `scripts/clean.mjs`
- `tests/agent.test.ts`, `tests/agent.integration.ts`, `tests/browser.ts`
- `docs/VOICE_AGENT.md`

Modified:

- `src/App.tsx`, `src/index.css`, `src/components/Navbar.tsx`, `src/components/VoiceAgent.tsx`, `src/components/NotificationProvider.tsx`, `src/components/Translate.tsx`
- `src/pages/Landing.tsx`, `Marketplace.tsx`, `ManagerDashboard.tsx`, `CustomerDashboard.tsx`, `AdminDashboard.tsx`, `Login.tsx`, `Register.tsx`, `AdminLogin.tsx`
- `src/store/useAuthStore.ts`, `src/i18n/offline.ts`, `shared/voiceCommands.ts`, `shared/productVoice.ts`
- `backend/routes.ts`, `backend/models.ts`, `backend/middleware.ts`, `backend/aiService.ts`, `backend/serverless.ts`, `server.ts`
- `scripts/build-server.mjs`, `scripts/check-languages.ts`, `tests/voice.test.ts`, `tests/synthesis.test.ts`
- `package.json`, `vite.config.ts`, `.env.example`, `README.md`

The old mock-only `tests/browser.mjs` was replaced by the isolated database-backed `tests/browser.ts`. Existing deployment routing in `vercel.json` and the bundled `api/index.js` entry remain in use.
