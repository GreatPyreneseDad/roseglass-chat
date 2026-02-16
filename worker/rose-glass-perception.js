/**
 * Rose Glass Perception Engine — Cloudflare Worker
 * 
 * Real computation layer for roseglass.chat
 * Tracks dimensional state across conversation messages,
 * runs gradient analysis, detects coherence shifts,
 * and surfaces pattern alerts.
 * 
 * This is NOT prompt injection. This is actual perception.
 * 
 * Author: Christopher MacGregor bin Joseph
 * ROSE Corp. | MacGregor Holding Company
 */

// =============================================================================
// CULTURAL LENS CALIBRATIONS
// =============================================================================

const LENS_CALIBRATIONS = {
  auto: {
    name: "Auto-Calibrating",
    description: "Detects context and adjusts lens dynamically",
    km: 0.20, ki: 0.80, coupling: 0.15,
    weights: { psi: 1.0, rho: 1.0, q: 1.0, f: 1.0 },
    tau_sensitivity: 0.5, kappa: 0.5
  },

  // === POLITICAL / IDEOLOGICAL ===
  conservative_american: {
    name: "Conservative American",
    description: "Calibrated for traditional values, institutional trust, individual agency framing",
    km: 0.25, ki: 0.90, coupling: 0.12,
    weights: { psi: 1.2, rho: 1.3, q: 0.7, f: 0.9 },
    tau_sensitivity: 0.7, kappa: 0.6,
    markers: {
      rho_boost: ["tradition", "founding", "constitution", "faith", "family", "heritage", "liberty", "freedom", "values", "responsibility", "patriot"],
      f_patterns: "individual_agency",
      q_suppression: 0.15, // emotional expression slightly dampened in this frame
      psi_expects: "hierarchical_consistency" // expects top-down logical structures
    }
  },

  liberal_american: {
    name: "Liberal American",
    description: "Calibrated for systemic analysis, collective action, equity framing",
    km: 0.20, ki: 0.75, coupling: 0.18,
    weights: { psi: 0.9, rho: 1.0, q: 1.2, f: 1.1 },
    tau_sensitivity: 0.4, kappa: 0.4,
    markers: {
      q_boost: ["justice", "equity", "systemic", "marginalized", "community", "solidarity", "progress", "rights", "access", "inclusive"],
      f_patterns: "collective_orientation",
      psi_tolerance: 0.35, // more tolerant of contradictions as systemic complexity
      rho_expects: "experiential_over_institutional"
    }
  },

  // === PROFESSIONAL / DOMAIN ===
  venture_capital: {
    name: "Venture Capital Investor",
    description: "Calibrated for risk assessment, pattern matching across markets, conviction vs herd",
    km: 0.15, ki: 1.2, coupling: 0.20,
    weights: { psi: 1.3, rho: 1.2, q: 0.8, f: 0.7 },
    tau_sensitivity: 0.8, kappa: 0.7,
    markers: {
      psi_critical: ["thesis", "conviction", "contrarian", "moat", "defensibility", "unit economics", "TAM", "market timing"],
      rho_boost: ["pattern recognition", "portfolio", "exits", "cycles", "vintage"],
      f_warning: 0.6, // high f in VC thinking = herd behavior alert
      q_threshold: 0.7, // high q = FOMO detection
      special: {
        herd_detection: true, // flag when f drives decisions over psi
        fomo_detection: true, // flag when q spikes around deal urgency
        conviction_tracking: true // track psi stability across conversation
      }
    }
  },

  tech_informed: {
    name: "Tech-Informed",
    description: "Calibrated for technical literacy, first-principles thinking, builder mindset",
    km: 0.18, ki: 0.85, coupling: 0.15,
    weights: { psi: 1.3, rho: 1.1, q: 0.8, f: 0.8 },
    tau_sensitivity: 0.5, kappa: 0.5,
    markers: {
      psi_expects: "first_principles",
      rho_boost: ["architecture", "stack", "protocol", "infrastructure", "abstraction", "implementation"],
      f_patterns: "builder_network", // community through building, not ideology
      q_baseline: 0.35 // lower emotional baseline, higher precision baseline
    }
  },

  non_tech: {
    name: "Non-Technical",
    description: "Calibrated for narrative reasoning, analogy-based understanding, trust-based evaluation",
    km: 0.25, ki: 0.70, coupling: 0.18,
    weights: { psi: 0.9, rho: 1.0, q: 1.1, f: 1.1 },
    tau_sensitivity: 0.4, kappa: 0.4,
    markers: {
      psi_expects: "narrative_consistency", // story-based logic
      rho_patterns: "experiential_wisdom",
      f_weight_high: true, // trust networks matter more
      q_tolerance: 0.4 // more emotional expression expected
    }
  },

  // === SPECIALIZED HIGH-STAKES ===
  geopolitical_analyst: {
    name: "Geopolitical Analyst",
    description: "Calibrated for multi-actor game theory, information warfare awareness, structural forces",
    km: 0.15, ki: 1.0, coupling: 0.22,
    weights: { psi: 1.4, rho: 1.3, q: 0.6, f: 0.9 },
    tau_sensitivity: 0.9, kappa: 0.8,
    markers: {
      psi_critical: ["incentive structure", "power dynamics", "deterrence", "escalation ladder", "second order"],
      rho_requires: "historical_pattern_depth",
      q_suppression: 0.25, // emotional reasoning is noise in this frame
      f_patterns: "alliance_architecture",
      tau_critical: true // temporal depth is essential — cycles, precedent, decay
    }
  },

  high_net_worth: {
    name: "High Net Worth Decision Maker",
    description: "Calibrated for multi-generational thinking, asset preservation, advisory fatigue awareness",
    km: 0.20, ki: 1.0, coupling: 0.18,
    weights: { psi: 1.1, rho: 1.3, q: 0.8, f: 0.9 },
    tau_sensitivity: 0.8, kappa: 0.7,
    markers: {
      rho_critical: ["legacy", "estate", "generational", "stewardship", "preservation"],
      f_warning: 0.5, // advisory herd behavior detection
      q_patterns: "advisory_fatigue", // detect when emotional exhaustion from too many advisors
      psi_expects: "multi_horizon_consistency" // thinking must cohere across time horizons
    }
  },

  neurodivergent: {
    name: "Neurodivergent",
    description: "Calibrated for pattern-recognition depth, direct communication, different-not-deficient",
    km: 0.35, ki: 2.5, coupling: 0.10,
    weights: { psi: 1.3, rho: 1.0, q: 0.7, f: 0.8 },
    tau_sensitivity: 0.5, kappa: 0.5,
    markers: {
      psi_expects: "systematic_deep", // deep logical chains are features
      q_baseline: 0.4, // "flat affect" ≠ low emotion
      f_baseline: 0.4, // different social architecture ≠ deficient
      direct_communication: 0.9
    }
  }
};


// =============================================================================
// GCT VARIABLE EXTRACTION — Ported from rose-looking-glass/src/core
// =============================================================================

const CONSISTENCY_MARKERS = {
  positive: ["therefore", "because", "since", "thus", "hence", "consequently", "accordingly", "furthermore", "moreover"],
  negative: ["but", "however", "although", "yet", "nevertheless", "nonetheless", "except", "unless", "despite", "whereas"]
};

const WISDOM_MARKERS = {
  specific: ["exactly", "specifically", "precisely", "particularly", "during", "between", "approximately", "according to", "research shows", "data indicates", "evidence suggests"],
  vague: ["maybe", "perhaps", "possibly", "sometimes", "usually", "i think", "i guess", "sort of", "kind of", "probably", "might", "could be"]
};

const EMOTIONAL_MARKERS = [
  "feel", "felt", "afraid", "scared", "angry", "furious", "upset", "hurt",
  "love", "hate", "worried", "anxious", "terrified", "devastated", "thrilled",
  "horrified", "desperate", "hopeful", "relieved", "frustrated", "excited",
  "passionate", "convinced", "certain", "doubt", "fear", "trust", "betrayed"
];

const SOCIAL_MARKERS = {
  collective: ["we", "us", "our", "together", "community", "team", "everyone", "collective", "society", "movement", "group"],
  individual: ["i", "me", "my", "mine", "myself", "alone", "solo", "personally", "individual"]
};

// Temporal depth markers for τ
const TEMPORAL_MARKERS = {
  deep: ["historically", "generations", "centuries", "always been", "long before", "foundation", "origin", "legacy", "tradition", "ancient", "precedent"],
  medium: ["years ago", "last decade", "evolved", "shifted", "trend", "pattern over time", "cycle"],
  shallow: ["just now", "today", "this week", "breaking", "latest", "trending", "viral"]
};


function extractGCT(text, lens = "auto") {
  const words = text.toLowerCase().split(/\s+/);
  const textLower = text.toLowerCase();
  const wordCount = words.length || 1;
  const cal = LENS_CALIBRATIONS[lens] || LENS_CALIBRATIONS.auto;

  // === Ψ (Psi) — Internal Consistency ===
  const posConsistency = words.filter(w => CONSISTENCY_MARKERS.positive.includes(w)).length;
  const negConsistency = words.filter(w => CONSISTENCY_MARKERS.negative.includes(w)).length;
  // Sentence structure consistency
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLen = sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / (sentences.length || 1);
  const sentenceVariance = sentences.reduce((sum, s) => {
    const len = s.trim().split(/\s+/).length;
    return sum + Math.pow(len - avgSentenceLen, 2);
  }, 0) / (sentences.length || 1);
  const structureConsistency = Math.max(0, 1 - (sentenceVariance / 100));

  let psi = 0.5 + (posConsistency - negConsistency) * 0.08 + structureConsistency * 0.15;
  psi = psi * (cal.weights.psi || 1.0);
  psi = Math.max(0.05, Math.min(0.95, psi));

  // === ρ (Rho) — Accumulated Wisdom ===
  const specificCount = WISDOM_MARKERS.specific.filter(m => textLower.includes(m)).length;
  const vagueCount = WISDOM_MARKERS.vague.filter(m => textLower.includes(m)).length;
  const hasNumbers = /\d+/.test(text);
  const hasQuotes = /[""].*[""]/.test(text) || /".*"/.test(text);
  const hasCitations = /\b(according to|research|study|data|evidence)\b/i.test(text);

  let rho = 0.4 + (specificCount - vagueCount) * 0.12;
  if (hasNumbers) rho += 0.08;
  if (hasQuotes) rho += 0.05;
  if (hasCitations) rho += 0.1;
  rho = rho * (cal.weights.rho || 1.0);
  rho = Math.max(0.05, Math.min(0.95, rho));

  // === q — Moral/Emotional Activation ===
  const emotionalCount = EMOTIONAL_MARKERS.filter(m => textLower.includes(m)).length;
  const exclamations = (text.match(/!/g) || []).length;
  const capsWords = words.filter(w => w.length > 2 && w === w.toUpperCase()).length;
  const questionMarks = (text.match(/\?/g) || []).length;

  let q = 0.2 + emotionalCount * 0.1 + exclamations * 0.05 + capsWords * 0.03;
  if (questionMarks > 2) q += 0.05; // interrogative intensity
  q = q * (cal.weights.q || 1.0);

  // Biological optimization: q_opt = q / (Km + q + q²/Ki)
  const km = cal.km || 0.20;
  const ki = cal.ki || 0.80;
  const q_raw = Math.max(0.05, Math.min(0.95, q));
  const q_opt = q_raw / (km + q_raw + (q_raw * q_raw) / ki);

  // === f — Social Belonging Architecture ===
  const collectiveCount = words.filter(w => SOCIAL_MARKERS.collective.includes(w)).length;
  const individualCount = words.filter(w => SOCIAL_MARKERS.individual.includes(w)).length;
  const totalSocial = collectiveCount + individualCount || 1;

  let f = 0.3 + (collectiveCount / totalSocial) * 0.5;
  f = f * (cal.weights.f || 1.0);
  f = Math.max(0.05, Math.min(0.95, f));

  // === τ — Temporal Depth ===
  const deepCount = TEMPORAL_MARKERS.deep.filter(m => textLower.includes(m)).length;
  const mediumCount = TEMPORAL_MARKERS.medium.filter(m => textLower.includes(m)).length;
  const shallowCount = TEMPORAL_MARKERS.shallow.filter(m => textLower.includes(m)).length;
  let tau = 0.3 + deepCount * 0.15 + mediumCount * 0.08 - shallowCount * 0.05;
  tau = Math.max(0.05, Math.min(0.95, tau));

  // === Coherence Equation ===
  // C = Ψ + (ρ × Ψ) + q_opt + (f × Ψ) + coupling
  const coupling = (cal.coupling || 0.15) * rho * q_opt;
  const coherence = psi + (rho * psi) + q_opt + (f * psi) + coupling;

  // === λ — Lens Interference (reduced by τ) ===
  const kappa = cal.kappa || 0.5;
  const lambda_raw = Math.abs(psi - rho) * 0.3 + Math.abs(q_opt - f) * 0.3 + 0.1;
  const lambda_adjusted = lambda_raw * Math.exp(-kappa * tau);

  return {
    psi: round(psi, 3),
    rho: round(rho, 3),
    q_raw: round(q_raw, 3),
    q_optimized: round(q_opt, 3),
    f: round(f, 3),
    tau: round(tau, 3),
    lambda: round(lambda_adjusted, 3),
    coherence: round(coherence, 3),
    coupling: round(coupling, 3),
    word_count: wordCount,
    lens_applied: lens
  };
}


// =============================================================================
// GRADIENT TRACKER — Detects shifts across conversation
// =============================================================================

class ConversationTracker {
  constructor(lens = "auto") {
    this.messages = [];
    this.lens = lens;
    this.alerts = [];
    this.baseline = null;
  }

  addMessage(text, role = "user") {
    const gct = extractGCT(text, this.lens);
    const entry = {
      index: this.messages.length,
      role,
      timestamp: Date.now(),
      gct,
      text_preview: text.substring(0, 100)
    };

    this.messages.push(entry);

    // Set baseline from first 2-3 user messages
    if (role === "user" && this.messages.filter(m => m.role === "user").length <= 3) {
      this.updateBaseline();
    }

    // Check for alerts after baseline established
    if (role === "user" && this.baseline) {
      const newAlerts = this.detectAlerts(entry);
      this.alerts.push(...newAlerts);
      entry.alerts = newAlerts;
    }

    return entry;
  }

  updateBaseline() {
    const userMessages = this.messages.filter(m => m.role === "user");
    if (userMessages.length < 2) return;

    this.baseline = {
      psi: avg(userMessages.map(m => m.gct.psi)),
      rho: avg(userMessages.map(m => m.gct.rho)),
      q: avg(userMessages.map(m => m.gct.q_optimized)),
      f: avg(userMessages.map(m => m.gct.f)),
      tau: avg(userMessages.map(m => m.gct.tau)),
      coherence: avg(userMessages.map(m => m.gct.coherence))
    };
  }

  detectAlerts(entry) {
    const alerts = [];
    const g = entry.gct;
    const b = this.baseline;
    const cal = LENS_CALIBRATIONS[this.lens] || LENS_CALIBRATIONS.auto;

    // === PSI DROP: Internal consistency fracturing ===
    if (g.psi < b.psi - 0.15) {
      alerts.push({
        type: "psi_drop",
        severity: g.psi < b.psi - 0.25 ? "high" : "moderate",
        dimension: "Ψ",
        message: "Internal consistency has shifted. Your reasoning structure changed — you may be constructing coherence around a new conclusion rather than following your original logic.",
        baseline: b.psi,
        current: g.psi,
        delta: round(g.psi - b.psi, 3)
      });
    }

    // === Q SPIKE: Emotional activation overriding analysis ===
    if (g.q_optimized > b.q + 0.12) {
      let message = "Emotional activation increased significantly. This may be appropriate — or it may indicate the topic has shifted from analytical to reactive.";

      // VC-specific: FOMO detection
      if (this.lens === "venture_capital" && cal.markers?.special?.fomo_detection) {
        message = "Emotional activation spike detected. In investment contexts, this pattern often correlates with urgency-driven rather than thesis-driven thinking. Check if this is conviction or FOMO.";
      }

      alerts.push({
        type: "q_spike",
        severity: g.q_optimized > b.q + 0.20 ? "high" : "moderate",
        dimension: "q",
        message,
        baseline: b.q,
        current: g.q_optimized,
        delta: round(g.q_optimized - b.q, 3)
      });
    }

    // === RHO DROP: Wisdom being abandoned ===
    if (g.rho < b.rho - 0.12) {
      alerts.push({
        type: "rho_drop",
        severity: g.rho < b.rho - 0.20 ? "high" : "moderate",
        dimension: "ρ",
        message: "Accumulated wisdom depth decreased. You moved from evidence-grounded reasoning toward less substantiated claims. The specificity of your thinking dropped.",
        baseline: b.rho,
        current: g.rho,
        delta: round(g.rho - b.rho, 3)
      });
    }

    // === F SHIFT: Social pressure entering decision ===
    if (g.f > b.f + 0.15) {
      let message = "Social belonging architecture shifted significantly. External validation or group alignment may be influencing reasoning that was previously more independent.";

      // VC-specific: herd behavior
      if (this.lens === "venture_capital" && cal.markers?.special?.herd_detection) {
        message = "Social dimension spike in investment context. Check whether this reflects genuine network intelligence or herd signal. Who else is in this deal?";
      }

      alerts.push({
        type: "f_shift",
        severity: g.f > b.f + 0.25 ? "high" : "moderate",
        dimension: "f",
        message,
        baseline: b.f,
        current: g.f,
        delta: round(g.f - b.f, 3)
      });
    }

    // === COHERENCE DROP: Overall reasoning quality declining ===
    if (g.coherence < b.coherence - 0.3) {
      alerts.push({
        type: "coherence_drop",
        severity: "high",
        dimension: "C",
        message: "Overall coherence dropped substantially. Multiple dimensions shifted simultaneously. Consider pausing to examine what changed in your thinking.",
        baseline: b.coherence,
        current: g.coherence,
        delta: round(g.coherence - b.coherence, 3)
      });
    }

    // === TAU COLLAPSE: Losing temporal depth ===
    if (g.tau < b.tau - 0.15 && b.tau > 0.4) {
      alerts.push({
        type: "tau_collapse",
        severity: "moderate",
        dimension: "τ",
        message: "Temporal depth decreased. You shifted from longer-horizon thinking toward shorter-term framing. For high-stakes decisions, check whether this compression is intentional.",
        baseline: b.tau,
        current: g.tau,
        delta: round(g.tau - b.tau, 3)
      });
    }

    return alerts;
  }

  getGradientHistory() {
    const userMessages = this.messages.filter(m => m.role === "user");
    return {
      timeline: userMessages.map((m, i) => ({
        index: i,
        psi: m.gct.psi,
        rho: m.gct.rho,
        q: m.gct.q_optimized,
        f: m.gct.f,
        tau: m.gct.tau,
        coherence: m.gct.coherence,
        lambda: m.gct.lambda
      })),
      baseline: this.baseline,
      alerts: this.alerts,
      message_count: userMessages.length,
      lens: this.lens
    };
  }

  getSummary() {
    const userMessages = this.messages.filter(m => m.role === "user");
    if (userMessages.length === 0) return null;

    const latest = userMessages[userMessages.length - 1].gct;
    const gradients = {};

    if (userMessages.length >= 2) {
      const prev = userMessages[userMessages.length - 2].gct;
      gradients.psi = round(latest.psi - prev.psi, 3);
      gradients.rho = round(latest.rho - prev.rho, 3);
      gradients.q = round(latest.q_optimized - prev.q_optimized, 3);
      gradients.f = round(latest.f - prev.f, 3);
      gradients.tau = round(latest.tau - prev.tau, 3);
      gradients.coherence = round(latest.coherence - prev.coherence, 3);
    }

    return {
      latest,
      baseline: this.baseline,
      gradients,
      total_alerts: this.alerts.length,
      recent_alerts: this.alerts.slice(-3),
      message_count: userMessages.length
    };
  }
}


// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

const sessions = new Map();

function getOrCreateSession(sessionId, lens = "auto") {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, new ConversationTracker(lens));
  }
  return sessions.get(sessionId);
}


// =============================================================================
// WORKER REQUEST HANDLER
// =============================================================================

export default {
  async fetch(request, env) {
    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    };

    try {
      // === POST /perceive — Analyze a single message ===
      if (url.pathname === "/perceive" && request.method === "POST") {
        const { text, session_id, lens, role } = await request.json();
        const session = getOrCreateSession(session_id, lens || "auto");
        const result = session.addMessage(text, role || "user");
        const summary = session.getSummary();

        return new Response(JSON.stringify({
          perception: result.gct,
          alerts: result.alerts || [],
          summary,
          session_id
        }), { headers: corsHeaders });
      }

      // === POST /analyze — One-shot analysis without session ===
      if (url.pathname === "/analyze" && request.method === "POST") {
        const { text, lens } = await request.json();
        const gct = extractGCT(text, lens || "auto");

        return new Response(JSON.stringify({
          perception: gct
        }), { headers: corsHeaders });
      }

      // === GET /gradient/:session_id — Get full gradient history ===
      if (url.pathname.startsWith("/gradient/") && request.method === "GET") {
        const sessionId = url.pathname.split("/gradient/")[1];
        const session = sessions.get(sessionId);
        if (!session) {
          return new Response(JSON.stringify({ error: "Session not found" }), {
            status: 404, headers: corsHeaders
          });
        }
        return new Response(JSON.stringify(session.getGradientHistory()), {
          headers: corsHeaders
        });
      }

      // === GET /lenses — List available lenses ===
      if (url.pathname === "/lenses" && request.method === "GET") {
        const lenses = Object.entries(LENS_CALIBRATIONS).map(([key, val]) => ({
          id: key,
          name: val.name,
          description: val.description
        }));
        return new Response(JSON.stringify({ lenses }), { headers: corsHeaders });
      }

      // === POST /set-lens — Change lens mid-conversation ===
      if (url.pathname === "/set-lens" && request.method === "POST") {
        const { session_id, lens } = await request.json();
        const session = sessions.get(session_id);
        if (session) {
          session.lens = lens;
          // Recalculate baseline with new lens
          session.baseline = null;
          session.messages.filter(m => m.role === "user").forEach(m => {
            m.gct = extractGCT(m.text_preview, lens);
          });
          session.updateBaseline();
        }
        return new Response(JSON.stringify({ ok: true, lens }), { headers: corsHeaders });
      }

      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404, headers: corsHeaders
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500, headers: corsHeaders
      });
    }
  },
};


// =============================================================================
// UTILITIES
// =============================================================================

function round(n, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

function avg(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}
