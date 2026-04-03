"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

/*
 * roseglass.chat — v2 "The Honest Friend"
 * Warm, present, alive. The flower to the pollinator.
 *
 * Color algorithm: "The Pendant"
 * Inspired by Christopher's poem — each zone voices a color,
 * blended by amplitude, deepened by wisdom, clarified by language.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://boupwgkkzexwisctrhdr.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// ─── Types ───────────────────────────────────────────────────────
interface ZoneReading { A: number; phi: number; }
interface CxReading {
  Cx: number; tau: number; lambda: number;
  veritas_ratio: number; has_dark_spot: boolean;
  zones: Record<string, ZoneReading>;
}
interface ChatMessage {
  id: string; role: "user" | "assistant"; content: string; cx?: CxReading;
}

// ─── Utility ─────────────────────────────────────────────────────
function cn(...c: (string | false | undefined | null)[]) { return c.filter(Boolean).join(" "); }

// ─── The Pendant Algorithm ───────────────────────────────────────
// "When people ask me what does my pendant do,
//  I will respond with only the truth."
//
// Each zone contributes a hue, weighted by its amplitude.
// Phase determines the mood of that hue:
//   constructive (φ < ~72°) → warm/positive color
//   destructive (φ > ~72°)  → deep/troubled color
//
// q (sentiment):   constructive → warm gold (40°)   | destructive → purple/lavender (280°)
// f (belonging):   constructive → green (140°)       | destructive → deep blue (220°)
// ρ (wisdom):      enriches saturation (depth of knowing)
// Ψ (linguistic):  brightens/clarifies (clarity of expression)
//
// Dark spot: pendant dims — pulsing, desaturated, signals canceling beneath.
// C(x): overall glow intensity.

const DESTRUCTIVE_THRESHOLD = Math.PI * 0.4; // ~72°

interface ZoneColor {
  hue: number;
  weight: number;
}

function pendantColor(cx: CxReading | null): {
  hue: number; sat: number; light: number; opacity: number; isDark: boolean;
} {
  if (!cx || cx.Cx === 0) return { hue: 0, sat: 0, light: 0, opacity: 0, isDark: false };

  const { Cx, has_dark_spot, zones } = cx;
  const q = zones.q || { A: 0, phi: 0 };
  const f = zones.f || { A: 0, phi: 0 };
  const rho = zones.rho || { A: 0, phi: 0 };
  const psi = zones.psi || { A: 0, phi: 0 };

  // Each zone voices a hue based on its phase
  const isDestructive = (phi: number) => Math.abs(phi) > DESTRUCTIVE_THRESHOLD;

  const zoneColors: ZoneColor[] = [];

  // q: sentiment → gold (warmth) or purple (hurt)
  if (q.A > 0.01) {
    const hue = isDestructive(q.phi) ? 280 : 40; // purple or gold
    zoneColors.push({ hue, weight: q.A });
  }

  // f: belonging → green (gentle) or blue (sad/isolated)
  if (f.A > 0.01) {
    const hue = isDestructive(f.phi) ? 220 : 140; // blue or green
    zoneColors.push({ hue, weight: f.A });
  }

  // ρ and Ψ contribute subtle hue when they're the dominant voice
  // ρ: deep knowing → amber/teal depending on phase
  if (rho.A > 0.05) {
    const hue = isDestructive(rho.phi) ? 190 : 25; // teal or deep amber
    zoneColors.push({ hue, weight: rho.A * 0.5 }); // half weight — ρ deepens more than it colors
  }

  // Ψ: linguistic precision → silver-blue or soft white-gold
  if (psi.A > 0.05) {
    const hue = isDestructive(psi.phi) ? 240 : 55; // indigo or pale gold
    zoneColors.push({ hue, weight: psi.A * 0.3 }); // lightest touch
  }

  // Weighted circular mean of hues (they wrap at 360°)
  let sinSum = 0, cosSum = 0, totalWeight = 0;
  for (const zc of zoneColors) {
    const rad = (zc.hue * Math.PI) / 180;
    sinSum += Math.sin(rad) * zc.weight;
    cosSum += Math.cos(rad) * zc.weight;
    totalWeight += zc.weight;
  }

  let hue: number;
  if (totalWeight < 0.01) {
    // No zone is active enough — default warm neutral
    hue = 30;
  } else {
    hue = (Math.atan2(sinSum / totalWeight, cosSum / totalWeight) * 180) / Math.PI;
    if (hue < 0) hue += 360;
  }

  // Saturation: boosted by ρ (wisdom = depth of color) + base from Cx
  const baseSat = 25 + Cx * 35;           // 25% → 60%
  const wisdomBoost = rho.A * 25;          // up to +25%
  const sat = Math.min(80, baseSat + wisdomBoost);

  // Lightness: boosted by Ψ (linguistic clarity = brightness) + base from Cx
  const baseLight = 10 + Cx * 18;          // 10% → 28%
  const clarityBoost = psi.A * 10;         // up to +10%
  const light = Math.min(35, baseLight + clarityBoost);

  // Opacity: from overall coherence
  const opacity = Math.min(0.9, 0.3 + Cx * 0.65);

  // Dark spot: pendant dims
  if (has_dark_spot) {
    return {
      hue,
      sat: Math.max(8, sat * 0.3),   // desaturated
      light: Math.max(5, light * 0.4), // dimmed
      opacity: 0.4 + Math.sin(Date.now() / 1000) * 0.15, // subtle pulse
      isDark: true,
    };
  }

  return { hue: Math.round(hue), sat: Math.round(sat), light: Math.round(light), opacity, isDark: false };
}

function ambientBackground(cx: CxReading | null): string {
  const base = "#0a0a0e";
  const p = pendantColor(cx);
  if (p.opacity === 0) return base;

  const { hue, sat, light, opacity } = p;
  const glowColor = `hsla(${hue}, ${sat}%, ${light}%, ${opacity})`;

  // Primary: large glow from bottom center
  // Secondary: subtler echo from top — the pendant illuminates the whole space
  return `radial-gradient(ellipse 100% 60% at 50% 100%, ${glowColor} 0%, transparent 70%), radial-gradient(ellipse 70% 45% at 50% 0%, hsla(${hue}, ${Math.round(sat * 0.5)}%, ${Math.round(light * 0.6)}%, ${(opacity * 0.35).toFixed(2)}) 0%, transparent 55%), ${base}`;
}

// ─── First message seed themes (for variation) ───────────────────
const FIRST_MESSAGE_SEEDS = [
  "certainty-performance",
  "silence-as-language",
  "the-weight-of-unsaid-things",
  "half-formed-thoughts",
  "the-space-between-knowing",
  "what-clarity-actually-feels-like",
  "the-difference-between-fixing-and-witnessing",
  "when-confusion-is-the-honest-answer",
  "the-courage-of-not-having-an-opinion",
  "what-you-notice-when-you-stop-performing",
  "the-texture-of-real-attention",
  "being-comfortable-with-the-unresolved",
];

function getRandomSeed(): string {
  return FIRST_MESSAGE_SEEDS[Math.floor(Math.random() * FIRST_MESSAGE_SEEDS.length)];
}

// ─── Presence Indicator (replaces zone bars for public view) ─────
function PresenceIndicator({ cx }: { cx: CxReading | null }) {
  if (!cx) return null;
  const zones = [
    { key: "q", A: cx.zones.q?.A || 0, color: "#d4916b" },
    { key: "f", A: cx.zones.f?.A || 0, color: "#6fa8b8" },
    { key: "rho", A: cx.zones.rho?.A || 0, color: "#b09ada" },
    { key: "psi", A: cx.zones.psi?.A || 0, color: "#8cb89a" },
  ];
  return (
    <div className="flex gap-1 items-end h-5">
      {zones.map(z => (
        <div key={z.key} className="w-1.5 rounded-full transition-all duration-[2000ms] ease-out"
             style={{
               height: `${Math.max(3, z.A * 20)}px`,
               background: z.color,
               opacity: Math.max(0.15, z.A),
             }} />
      ))}
    </div>
  );
}

// ─── C(x) Sparkline ──────────────────────────────────────────────
function CxSparkline({ history }: { history: CxReading[] }) {
  if (history.length < 2) return null;
  const maxCx = Math.max(...history.map(h => h.Cx), 0.5);
  const w = 180, h = 40;
  const points = history.map((cx, i) => {
    const x = (i / (history.length - 1)) * w;
    const y = h - (cx.Cx / maxCx) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} className="mx-auto opacity-60">
      <polyline points={points} fill="none" stroke="var(--accent)" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Topology Detail Panel ───────────────────────────────────────
function TopologyDetail({ cx, cxHistory, messages }: {
  cx: CxReading | null; cxHistory: CxReading[]; messages: ChatMessage[];
}) {
  if (!cx) return <div className="text-xs italic" style={{ color: "var(--text-ghost)" }}>Waiting to listen.</div>;
  const zoneLabels: Record<string, string> = { q: "sentiment", f: "belonging", rho: "wisdom", psi: "linguistic" };
  return (
    <div className="space-y-4 text-[10px] font-mono" style={{ color: "var(--text-ghost)" }}>
      <div className="text-center">
        <div className="text-2xl font-light italic" style={{ fontFamily: "var(--font-serif)", color: "var(--accent)" }}>
          {cx.Cx.toFixed(4)}
        </div>
        <div className="mt-1">coherence · τ={cx.tau.toFixed(1)} · λ=1.0</div>
        <div className="mt-1">veritas: {cx.veritas_ratio.toFixed(4)}</div>
      </div>
      <CxSparkline history={cxHistory} />
      <div className="space-y-1.5">
        {Object.entries(cx.zones).map(([key, z]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-16 text-right">{zoneLabels[key] || key}</span>
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-tertiary)" }}>
              <div className="h-full rounded-full transition-all duration-[2000ms]"
                   style={{ width: `${z.A * 100}%`, background: "var(--accent)", opacity: Math.max(0.3, z.A) }} />
            </div>
            <span className="w-10 text-right">{z.A.toFixed(3)}</span>
            <span className="w-8 text-right">{(z.phi * 180 / Math.PI).toFixed(0)}°</span>
          </div>
        ))}
      </div>
      {cx.has_dark_spot && (
        <div className="text-center italic" style={{ color: "var(--signal-destructive)" }}>dark spot detected</div>
      )}
      <div className="pt-2" style={{ borderTop: "1px solid var(--border-subtle)" }}>
        <div className="flex justify-between"><span>exchanges</span><span>{messages.filter(m => m.role === "user").length}</span></div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════
// ─── Main Component ─────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════
export default function RoseGlassChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [latestCx, setLatestCx] = useState<CxReading | null>(null);
  const [cxHistory, setCxHistory] = useState<CxReading[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const bgStyle = useMemo(() => ambientBackground(latestCx), [latestCx]);

  useEffect(() => { setHydrated(true); }, []);
  useEffect(() => {
    if (!sessionId) setSessionId(crypto.randomUUID());
  }, [sessionId]);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // ─── Send message ─────────────────────────────────────────────
  const sendMessage = useCallback(async (overrideContent?: string) => {
    const content = overrideContent || input.trim();
    if (!content || loading) return;

    const isInitiate = content === "__roseglass_initiate__";
    if (!isInitiate) {
      const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content };
      setMessages(prev => [...prev, userMsg]);
      setInput("");
    }
    setLoading(true);

    try {
      const bodyMessage = isInitiate ? `__roseglass_initiate__::${getRandomSeed()}` : content;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/roseglass-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ session_id: sessionId, message: bodyMessage }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(), role: "assistant", content: data.content,
        cx: data.cx || undefined,
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (data.cx && (data.cx.Cx > 0 || data.compute_source === "first-message")) {
        setLatestCx(data.cx);
        if (data.cx.Cx > 0) setCxHistory(prev => [...prev, data.cx]);
      }
      if (!isMobile) setSidebarOpen(true);
    } catch (err) {
      const errMsg: ChatMessage = {
        id: crypto.randomUUID(), role: "assistant",
        content: `Connection interrupted. ${err instanceof Error ? err.message : ""}`,
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const letRoseGlassStart = useCallback(() => {
    sendMessage("__roseglass_initiate__");
  }, [sendMessage]);

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center"
           style={{ background: "#0a0a0e", color: "var(--text-primary)" }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--accent)", animation: "warmPulse 3s ease-in-out infinite" }} />
      </div>
    );
  }

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="flex h-screen w-screen overflow-hidden"
         style={{ background: bgStyle, transition: "background 3s ease-in-out" }}>

      {/* ─── Main chat area ─── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "var(--accent)", opacity: 0.7 }} />
            <h1 className="text-sm tracking-wide" style={{ fontFamily: "var(--font-serif)", color: "var(--text-secondary)" }}>
              rose<span style={{ color: "var(--accent)" }}>glass</span>
            </h1>
            {latestCx && <PresenceIndicator cx={latestCx} />}
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: "var(--text-ghost)" }}>
            <button onClick={() => { setMessages([]); setLatestCx(null); setCxHistory([]); setSidebarOpen(false); setSessionId(""); }}
                    className="hover:opacity-70 transition-opacity">new</button>
            {!isMobile && sidebarOpen && (
              <button onClick={() => setSidebarOpen(false)} className="hover:opacity-70 transition-opacity">×</button>
            )}
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full mb-8"
                   style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", opacity: 0.3 }} />
              <h2 className="text-xl font-light mb-2"
                  style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)", lineHeight: 1.5 }}>
                Not every conversation<br />needs to be helpful.
              </h2>
              <p className="text-sm italic mb-8" style={{ color: "var(--text-ghost)", fontFamily: "var(--font-serif)" }}>
                Some need to be honest.
              </p>
              <button onClick={letRoseGlassStart}
                      className="start-button px-6 py-2.5 rounded-full text-sm transition-all hover:scale-[1.02]"
                      style={{
                        fontFamily: "var(--font-serif)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent)",
                        background: "transparent",
                      }}>
                {loading ? "arriving..." : "Let Rose Glass start"}
              </button>
              <p className="text-[10px] mt-3" style={{ color: "var(--text-ghost)" }}>or type below</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] px-4 py-3 rounded-2xl text-sm"
                           style={{
                             background: "rgba(196,145,107,0.08)",
                             border: "1px solid rgba(196,145,107,0.12)",
                             color: "var(--text-primary)",
                             lineHeight: 1.7,
                           }}>
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {msg.cx && msg.cx.Cx > 0 && (
                        <div className="flex items-center gap-1.5 mb-2">
                          <PresenceIndicator cx={msg.cx} />
                          <span className="text-[9px] font-mono" style={{ color: "var(--text-ghost)" }}>
                            {msg.cx.Cx.toFixed(3)}
                          </span>
                        </div>
                      )}
                      <div className="assistant-prose text-sm" style={{ color: "var(--text-secondary)", lineHeight: 1.85, fontFamily: "var(--font-serif)" }}>
                        {msg.content.split("\n\n").map((para, i) => (
                          <p key={i} className={i > 0 ? "mt-4" : ""}>{para}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-1.5 py-4">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full"
                         style={{ background: "var(--accent)", opacity: 0.4, animation: `warmPulse 1.5s ease-in-out ${i * 0.3}s infinite` }} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 py-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <div className="max-w-2xl mx-auto flex items-end gap-2 rounded-xl px-4 py-3"
               style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                      placeholder="Say what's on your mind"
                      rows={1}
                      className="flex-1 bg-transparent resize-none outline-none text-sm"
                      style={{ color: "var(--text-primary)", fontFamily: "var(--font-serif)", lineHeight: 1.6, maxHeight: "120px" }} />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                    className="text-sm px-1 pb-0.5 transition-opacity"
                    style={{ color: "var(--accent)", opacity: input.trim() ? 1 : 0.3 }}>
              ↑
            </button>
          </div>
        </div>
      </div>

      {/* ─── Sidebar (desktop) ─── */}
      {sidebarOpen && !isMobile && (
        <aside className="w-56 shrink-0 overflow-y-auto px-4 py-3"
               style={{ borderLeft: "1px solid var(--border-subtle)" }}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--text-ghost)" }}>PRESENCE</span>
            <button onClick={() => setShowDetail(!showDetail)}
                    className="text-[9px] font-mono px-2 py-0.5 rounded transition-colors"
                    style={{ color: "var(--text-tertiary)" }}>
              {showDetail ? "simple" : "detail"}
            </button>
          </div>
          {showDetail ? (
            <TopologyDetail cx={latestCx} cxHistory={cxHistory} messages={messages} />
          ) : (
            <div>
              {latestCx ? (
                <div>
                  <div className="text-center py-6">
                    <div className="text-3xl font-light italic tracking-wide transition-all duration-[2000ms]"
                         style={{
                           fontFamily: "var(--font-serif)",
                           color: latestCx.has_dark_spot ? "var(--signal-destructive)" : "var(--accent)",
                         }}>
                      {latestCx.Cx.toFixed(4)}
                    </div>
                    <div className="text-[10px] mt-2" style={{ color: "var(--text-ghost)", fontFamily: "var(--font-mono)" }}>
                      coherence
                    </div>
                  </div>
                  <CxSparkline history={cxHistory} />
                  <div className="mt-4 flex justify-center">
                    <PresenceIndicator cx={latestCx} />
                  </div>
                  {latestCx.has_dark_spot && (
                    <div className="mt-4 text-center text-[10px] italic" style={{ color: "var(--signal-destructive)", fontFamily: "var(--font-serif)" }}>
                      something beneath the surface
                    </div>
                  )}
                  <div className="mt-6 pt-3 text-[9px] font-mono space-y-1"
                       style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-ghost)" }}>
                    <div className="flex justify-between"><span>depth</span><span>{latestCx.tau < 1.5 ? "shallow" : latestCx.tau < 2.5 ? "mid" : "deep"}</span></div>
                    <div className="flex justify-between"><span>exchanges</span><span>{messages.filter(m => m.role === "user").length}</span></div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-center py-8 italic" style={{ color: "var(--text-ghost)", fontFamily: "var(--font-serif)" }}>
                  Waiting to listen.
                </div>
              )}
            </div>
          )}
        </aside>
      )}

      {/* Mobile bottom sheet */}
      {sidebarOpen && isMobile && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl overflow-y-auto"
               style={{ background: "rgba(10,10,14,0.95)", backdropFilter: "blur(20px)", maxHeight: "55vh" }}>
            <div className="p-4">
              <div className="w-8 h-1 rounded-full mx-auto mb-4" style={{ background: "var(--border-focus)" }}
                   onClick={() => setSidebarOpen(false)} />
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-mono tracking-widest" style={{ color: "var(--text-ghost)" }}>PRESENCE</span>
                <button onClick={() => setShowDetail(!showDetail)}
                        className="text-[9px] font-mono px-2 py-0.5 rounded"
                        style={{ color: "var(--text-tertiary)" }}>
                  {showDetail ? "simple" : "detail"}
                </button>
              </div>
              {showDetail
                ? <TopologyDetail cx={latestCx} cxHistory={cxHistory} messages={messages} />
                : latestCx && (
                    <div className="text-center py-4">
                      <div className="text-3xl font-light italic" style={{ fontFamily: "var(--font-serif)", color: "var(--accent)" }}>
                        {latestCx.Cx.toFixed(4)}
                      </div>
                      <div className="mt-3 flex justify-center"><PresenceIndicator cx={latestCx} /></div>
                    </div>
                  )
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}
