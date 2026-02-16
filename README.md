# roseglass.chat — Cognitive Mirror Interface

Real-time Rose Glass perception tracking integrated with Claude via Cloudflare Workers + Vercel.

## Architecture

```
┌─ User Browser ──────────────────────────────────────┐
│  Chat UI + Perception Sidebar (dimensions, alerts)  │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
┌─ Vercel (Next.js) ─────────┐  ┌─ Cloudflare Worker ────┐
│  • /api/chat endpoint       │──│  Rose Glass Engine     │
│  • Proxies to Anthropic API │  │  • GCT extraction      │
│  • Injects perception state │  │  • Gradient tracking   │
└─────────────┬───────────────┘  │  • Alert detection     │
              │                   │  • Cultural lens lib   │
              ▼                   └────────────────────────┘
┌─ Anthropic API ────────────┐
│  Claude Sonnet 4           │
│  System prompt includes:   │
│  • Live dimensional data   │
│  • Gradient history        │
│  • Active alerts           │
└────────────────────────────┘
```

## Quick Deploy

### Prerequisites
```bash
# Install global tools
npm install -g wrangler vercel

# Login to services
wrangler login
vercel login
```

### Step 1: Deploy Cloudflare Worker

```bash
cd worker/
wrangler deploy

# Note the deployed URL:
# https://roseglass-perception.[YOUR-SUBDOMAIN].workers.dev
```

**Test it:**
```bash
curl -X POST https://roseglass-perception.[YOUR-SUBDOMAIN].workers.dev/perceive \
  -H "Content-Type: application/json" \
  -d '{"text": "We should invest now before the window closes", "session_id": "test", "lens": "venture_capital"}'
```

### Step 2: Install Dependencies

```bash
npm install
```

###Step 3: Configure Environment

Create `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
PERCEPTION_WORKER_URL=https://roseglass-perception.[YOUR-SUBDOMAIN].workers.dev
```

### Step 4: Deploy to Vercel

```bash
# Set environment variables in Vercel
vercel env add ANTHROPIC_API_KEY
vercel env add PERCEPTION_WORKER_URL

# Deploy
vercel --prod
```

### Step 5: Connect Domain (Optional)

In Vercel Dashboard → Settings → Domains → Add `roseglass.chat`

At your registrar:
```
A Record:    @   → 76.76.21.21
CNAME:      www  → cname.vercel-dns.com
```

## Local Development

```bash
# Terminal 1: Run Cloudflare Worker locally
cd worker/
wrangler dev

# Terminal 2: Run Next.js
npm run dev
```

Update `.env.local`:
```
PERCEPTION_WORKER_URL=http://localhost:8787
```

Open http://localhost:3000

## Available Lenses

| ID | Name | Best For |
|----|------|----------|
| `auto` | Auto-Calibrating | General use, context detection |
| `conservative_american` | Conservative American | Traditional values framing |
| `liberal_american` | Liberal American | Systemic analysis focus |
| `venture_capital` | Venture Capital | Investment decisions, FOMO detection |
| `tech_informed` | Tech-Informed | Technical first-principles reasoning |
| `non_tech` | Non-Technical | Narrative/analogy-based thinking |
| `geopolitical_analyst` | Geopolitical | Multi-actor structural analysis |
| `high_net_worth` | High Net Worth | Multi-generational decisions |
| `neurodivergent` | Neurodivergent | Pattern-depth, direct communication |

## Alert Types

| Alert | Triggers | What It Means |
|-------|----------|---------------|
| `psi_drop` | Ψ drops >0.15 | Reasoning structure changed — possible post-hoc rationalization |
| `q_spike` | q rises >0.12 | Emotional activation increased — check if analytical or reactive |
| `rho_drop` | ρ drops >0.12 | Evidence-grounding decreased — claims less substantiated |
| `f_shift` | f rises >0.15 | Social pressure entering — group alignment influencing |
| `coherence_drop` | C drops >0.3 | Multiple dimensions shifted — reasoning quality declining |
| `tau_collapse` | τ drops >0.15 | Temporal depth compressed — lost the long view |

## Project Structure

```
roseglass-chat/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main chat interface
│   │   ├── layout.tsx            # Root layout with fonts
│   │   └── api/
│   │       └── chat/
│   │           └── route.ts      # Chat API endpoint (proxies to Anthropic)
│   └── components/
│       └── RoseGlassChat.tsx     # Main chat component
├── worker/
│   ├── rose-glass-perception.js  # Cloudflare Worker (GCT engine)
│   └── wrangler.toml             # Worker configuration
├── public/                       # Static assets
├── .env.local                    # Environment variables (gitignored)
└── package.json
```

## How It Works

1. **User sends message** → Frontend calls `/api/chat`
2. **Perception check** → API calls Cloudflare Worker with user text
3. **Worker computes** → Extracts GCT dimensions (Ψ, ρ, q, f, τ), tracks gradients, generates alerts
4. **Worker returns** → Dimensional readings + alerts + session state
5. **API injects perception** → Adds dimensional data to Claude's system prompt
6. **Claude responds** → With awareness of user's cognitive state
7. **Sidebar updates** → Shows real-time dimensions, gradients, coherence graph, alerts

## Key Features

- **Real computation**: Not prompt-based — actual GCT variable extraction
- **Gradient tracking**: Compares each message to baseline + previous message
- **Alert system**: Fires on mathematical threshold crossings
- **Cultural lenses**: 9 pre-calibrated lenses for different reasoning contexts
- **Session persistence**: Cloudflare Worker maintains state across conversation
- **Silent integration**: Claude receives perception data but doesn't announce it mechanically

## Adding Custom Lenses

Edit `worker/rose-glass-perception.js` → `LENS_CALIBRATIONS`:

```javascript
custom_lens: {
  name: "Your Lens Name",
  description: "What it detects",
  km: 0.20,              // Michaelis-Menten saturation constant
  ki: 0.80,              // Substrate inhibition constant
  coupling: 0.15,        // ρ × q interaction strength
  weights: {
    psi: 1.0,            // Dimensional weight for Ψ
    rho: 1.0,            // Weight for ρ
    q: 1.0,              // Weight for q
    f: 1.0               // Weight for f
  },
  tau_sensitivity: 0.5,  // Temporal depth detection sensitivity
  kappa: 0.5,            // τ-attenuation coefficient
  markers: {
    // Optional domain-specific pattern detection
    fomo: /\b(miss out|window closing|everyone else)\b/i
  }
}
```

Deploy with `wrangler deploy` — immediately available.

## Tech Stack

- **Frontend**: Next.js 15 + React 19 + TailwindCSS + TypeScript
- **Backend**: Cloudflare Workers (edge compute)
- **LLM**: Anthropic Claude Sonnet 4
- **Deployment**: Vercel (frontend) + Cloudflare (worker)
- **Fonts**: Crimson Text (serif), system sans-serif

## License

© 2025-2026 ROSE Corp | MacGregor Holding Company

---

**Not a chatbot. A cognitive mirror with mathematical backing.**
