"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/*
 * roseglass.chat — C(x) Diffractive Chat Interface (WP-2026-007)
 * Design: editorial minimalism meets scientific instrument.
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
function radToDeg(phi: number) { return (phi * 180 / Math.PI).toFixed(0); }
function isDestructive(phi: number) { return Math.abs(phi) > Math.PI * 0.4; }
function cxColor(cx: number, dark: boolean): string {
  if (dark) return "var(--signal-destructive)";
  if (cx > 0.6) return "var(--signal-constructive)";
  if (cx > 0.3) return "var(--signal-partial)";
  return "#fb923c";
}

// ─── Zone Bar ────────────────────────────────────────────────────
const ZONE_META: Record<string, { label: string; symbol: string; color: string }> = {
  q:   { label: "Sentiment",  symbol: "q", color: "var(--zone-q)" },
  f:   { label: "Belonging",  symbol: "f", color: "var(--zone-f)" },
  rho: { label: "Wisdom",     symbol: "ρ", color: "var(--zone-rho)" },
  psi: { label: "Linguistic", symbol: "Ψ", color: "var(--zone-psi)" },
};

function ZoneBar({ zoneKey, reading }: { zoneKey: string; reading: ZoneReading }) {
  const meta = ZONE_META[zoneKey];
  if (!meta) return null;
  const w = Math.max(2, Math.min(100, reading.A * 100));
  const dest = isDestructive(reading.phi);
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono" style={{ color: "var(--text-secondary)" }}>
          {meta.symbol} <span style={{ color: "var(--text-tertiary)" }}>{meta.label}</span>
        </span>
        <span className="text-xs font-mono">
          {reading.A.toFixed(2)}
          <span className={cn("ml-1.5")} style={{ color: dest ? "var(--signal-destructive)" : "var(--text-tertiary)" }}>
            φ={radToDeg(reading.phi)}°
          </span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
        <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
             style={{ width: `${w}%`, background: meta.color, opacity: dest ? 0.35 : 1 }} />
      </div>
      {dest && <div className="text-[9px] font-mono mt-0.5" style={{ color: "var(--signal-destructive)", opacity: 0.6 }}>DESTRUCTIVE</div>}
    </div>
  );
}

// ─── C(x) Sparkline ──────────────────────────────────────────────
function CxSparkline({ history }: { history: CxReading[] }) {
  if (history.length < 2) return null;
  const w = 280, h = 60, pad = 4, maxIdx = history.length - 1;
  function toPath(key: "Cx" | "veritas_ratio") {
    return history.map((d, i) => {
      const x = pad + (i / maxIdx) * (w - pad * 2);
      const y = h - pad - Math.min(1, key === "Cx" ? d.Cx : d.veritas_ratio) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    }).join(" ");
  }
  const darks = history.map((d, i) => ({ i, dark: d.has_dark_spot })).filter(d => d.dark);
  return (
    <div className="mb-4">
      <div className="text-xs font-mono mb-1" style={{ color: "var(--text-tertiary)" }}>C(x) Timeline</div>
      <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`}>
        <path d={toPath("Cx")} fill="none" stroke="var(--zone-q)" strokeWidth="1.5" opacity="0.7" />
        <path d={toPath("veritas_ratio")} fill="none" stroke="var(--text-ghost)" strokeWidth="1" strokeDasharray="3,3" />
        {darks.map(d => <circle key={d.i} cx={pad + (d.i / maxIdx) * (w - pad * 2)} cy={h - pad - 2} r="2.5" fill="var(--signal-destructive)" opacity="0.7" />)}
      </svg>
    </div>
  );
}

// ─── Dark Spot Alert ─────────────────────────────────────────────
function DarkSpotAlert({ cx }: { cx: CxReading }) {
  if (!cx.has_dark_spot) return null;
  return (
    <div className="rounded-lg p-3 mb-4" style={{ border: "1px solid rgba(232,93,111,0.3)", background: "rgba(232,93,111,0.06)" }}>
      <div className="flex items-start gap-2">
        <span style={{ color: "var(--signal-destructive)" }} className="text-sm mt-0.5">◆</span>
        <div>
          <div className="text-xs font-mono mb-1" style={{ color: "var(--signal-destructive)" }}>DARK SPOT</div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            C(x) ≈ {cx.Cx.toFixed(3)}. Zones interfering destructively. The quiet is signal.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── C(x) Dot ────────────────────────────────────────────────────
function CxDot({ cx }: { cx?: CxReading }) {
  if (!cx) return null;
  return (
    <span className="inline-block w-2 h-2 rounded-full ml-2 align-middle"
          style={{ background: cxColor(cx.Cx, cx.has_dark_spot) }}
          title={`C(x)=${cx.Cx.toFixed(3)} τ=${cx.tau.toFixed(1)} V=${cx.veritas_ratio.toFixed(3)}`} />
  );
}

// ─── Topology Content (shared between sidebar and bottom sheet) ──
function TopologyContent({ latestCx, cxHistory, messages }: {
  latestCx: CxReading | null; cxHistory: CxReading[]; messages: ChatMessage[];
}) {
  return (
    <>
      <div className="text-xs font-mono mb-4 tracking-widest" style={{ color: "var(--text-tertiary)" }}>TOPOLOGY</div>
      <CxSparkline history={cxHistory} />
      {latestCx ? (
        <div className="mb-6">
          <div className="text-center mb-6 py-4">
            <div className="text-4xl font-light italic tracking-wide"
                 style={{
                   fontFamily: "var(--font-serif)",
                   color: cxColor(latestCx.Cx, latestCx.has_dark_spot),
                   textShadow: latestCx.Cx > 0.5 ? `0 0 30px ${cxColor(latestCx.Cx, latestCx.has_dark_spot)}33` : "none",
                   transition: "all 0.8s ease-out",
                 }}>
              {latestCx.Cx.toFixed(4)}
            </div>
            <div className="text-[10px] font-mono mt-2" style={{ color: "var(--text-tertiary)" }}>
              C(x, τ={latestCx.tau.toFixed(1)}, λ=1.0)
            </div>
          </div>
          <DarkSpotAlert cx={latestCx} />
          <ZoneBar zoneKey="q" reading={latestCx.zones.q} />
          <ZoneBar zoneKey="f" reading={latestCx.zones.f} />
          <ZoneBar zoneKey="rho" reading={latestCx.zones.rho} />
          <ZoneBar zoneKey="psi" reading={latestCx.zones.psi} />
          <div className="mt-4 pt-3" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <div className="flex justify-between text-xs font-mono">
              <span style={{ color: "var(--text-tertiary)" }}>veritas</span>
              <span>{latestCx.veritas_ratio.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-xs font-mono mt-1">
              <span style={{ color: "var(--text-tertiary)" }}>τ depth</span>
              <span>
                {latestCx.tau.toFixed(1)}
                <span className="ml-1" style={{ color: "var(--text-tertiary)" }}>
                  {latestCx.tau < 1.5 ? "shallow" : latestCx.tau < 2.5 ? "mid" : "deep"}
                </span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-center py-8" style={{ color: "var(--text-ghost)" }}>
          Topology emerges with your first message.
        </div>
      )}
      <div className="mt-6 pt-3 text-xs font-mono" style={{ borderTop: "1px solid var(--border-subtle)", color: "var(--text-ghost)" }}>
        <div>messages: {messages.filter(m => m.role === "user").length}</div>
        <div>readings: {cxHistory.length}</div>
        <div>dark spots: {cxHistory.filter(c => c.has_dark_spot).length}</div>
      </div>
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function RoseGlassChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [cxHistory, setCxHistory] = useState<CxReading[]>([]);
  const [latestCx, setLatestCx] = useState<CxReading | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Hydration + session from localStorage
  useEffect(() => {
    const KEY = "roseglass-session-id";
    let id = localStorage.getItem(KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(KEY, id); }
    setSessionId(id);
    setHydrated(true);
  }, []);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Auto-open sidebar on desktop when first reading arrives
  useEffect(() => {
    if (latestCx && !isMobile) setSidebarOpen(true);
  }, [latestCx, isMobile]);

  // Restore history
  useEffect(() => {
    if (!sessionId) return;
    async function restore() {
      try {
        const [msgRes, cxRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${sessionId}&order=created_at.asc&select=id,role,content`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
          fetch(`${SUPABASE_URL}/rest/v1/coherence_readings?session_id=eq.${sessionId}&order=created_at.asc&select=cx,tau,lambda,veritas_ratio,has_dark_spot,zone_detail`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }),
        ]);
        const msgs = await msgRes.json();
        const cxs = await cxRes.json();
        if (Array.isArray(msgs) && msgs.length > 0)
          setMessages(msgs.map((m: { id: string; role: "user"|"assistant"; content: string }) => ({ id: m.id, role: m.role, content: m.content })));
        if (Array.isArray(cxs) && cxs.length > 0) {
          const readings: CxReading[] = cxs.map((r: Record<string, unknown>) => ({
            Cx: Number(r.cx), tau: Number(r.tau), lambda: Number(r.lambda),
            veritas_ratio: Number(r.veritas_ratio), has_dark_spot: Boolean(r.has_dark_spot),
            zones: (r.zone_detail as Record<string, ZoneReading>) || {},
          }));
          setCxHistory(readings);
          setLatestCx(readings[readings.length - 1]);
        }
      } catch (e) { console.error("History restore failed:", e); }
    }
    restore();
  }, [sessionId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const startNewSession = useCallback(() => {
    localStorage.removeItem("roseglass-session-id");
    window.location.reload();
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    const userMsg: ChatMessage = { role: "user", content: text, id: crypto.randomUUID() };
    setMessages(prev => [...prev, userMsg]);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/roseglass-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${data.error}`, id: crypto.randomUUID() }]);
      } else {
        const cx: CxReading = data.cx;
        setLatestCx(cx);
        setCxHistory(prev => [...prev, cx]);
        setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, cx } : m));
        setMessages(prev => [...prev, { role: "assistant", content: data.content, id: crypto.randomUUID() }]);
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again.", id: crypto.randomUUID() }]);
    }
    setLoading(false);
  }, [input, loading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center"
           style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
        <span className="text-xs font-mono" style={{ color: "var(--text-ghost)" }}>initializing...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden"
         style={{ background: "radial-gradient(ellipse at 50% 0%, #0f0f14 0%, #07070a 50%, #050508 100%)", color: "var(--text-primary)" }}>

      {/* Mobile C(x) pill */}
      {isMobile && latestCx && !sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)}
                className="fixed top-3 right-3 z-40 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-mono backdrop-blur-sm"
                style={{ background: "rgba(7,7,10,0.8)", border: `1px solid ${cxColor(latestCx.Cx, latestCx.has_dark_spot)}33`, color: cxColor(latestCx.Cx, latestCx.has_dark_spot) }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cxColor(latestCx.Cx, latestCx.has_dark_spot) }} />
          {latestCx.Cx.toFixed(3)}
        </button>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg, #e8b4b8, #b4a0d1)" }} />
            <h1 className="text-sm md:text-base tracking-wide" style={{ fontFamily: "var(--font-serif)" }}>
              roseglass<span style={{ color: "var(--text-tertiary)" }}>.chat</span>
            </h1>
            {latestCx && (
              <span className="hidden md:inline text-xs font-mono ml-2" style={{ color: "var(--text-tertiary)" }}>
                C(x)={latestCx.Cx.toFixed(3)}<span className="ml-1.5">τ={latestCx.tau.toFixed(1)}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={startNewSession}
                    className="p-2 rounded-md transition-all hover:bg-white/5 text-xs font-mono"
                    style={{ color: "var(--text-tertiary)" }}>+ new</button>
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-md transition-all hover:bg-white/5 text-xs font-mono"
                    style={{ color: "var(--text-tertiary)" }}>{sidebarOpen ? "◨" : "◧"}</button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-sm px-6">
                <div className="text-3xl md:text-4xl mb-6 italic"
                     style={{ fontFamily: "var(--font-serif)", color: "var(--text-tertiary)", lineHeight: 1.3 }}>
                  The dark spots are<br/>where the signal is.
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-ghost)" }}>
                  Every message passes through four perception zones.
                  What surfaces may not be what matters.
                </p>
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={cn("max-w-full md:max-w-2xl", msg.role === "user" ? "ml-auto" : "mr-auto")}>
              {msg.role === "assistant" ? (
                <div className="pl-4 py-1 text-[15px] leading-[1.8]"
                     style={{ fontFamily: "var(--font-serif)", borderLeft: "2px solid var(--border-light)" }}>
                  {msg.content.split("\n").map((line, i) => <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>)}
                </div>
              ) : (
                <div>
                  <div className="rounded-xl px-4 py-3 text-sm leading-relaxed"
                       style={{ background: "var(--bg-surface)", border: "1px solid var(--border-light)" }}>
                    {msg.content.split("\n").map((line, i) => <p key={i} className={i > 0 ? "mt-2" : ""}>{line}</p>)}
                  </div>
                  {msg.cx && (
                    <div className="flex items-center justify-end mt-1 gap-1.5">
                      <CxDot cx={msg.cx} />
                      <span className="text-[10px] font-mono" style={{ color: "var(--text-ghost)" }}>{msg.cx.Cx.toFixed(3)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="max-w-full md:max-w-2xl mr-auto py-3 px-4">
              <div className="text-xs italic" style={{ fontFamily: "var(--font-serif)", color: "var(--text-ghost)" }}>
                perceiving...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 md:px-6 md:py-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-end gap-2 max-w-3xl mx-auto">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say something real..."
              rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-base md:text-sm focus:outline-none transition-all"
              style={{ minHeight: "48px", maxHeight: "200px", background: "var(--bg-surface)", border: "1px solid var(--border-light)", color: "var(--text-primary)" }}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = "48px"; t.style.height = Math.min(t.scrollHeight, 200) + "px"; }}
            />
            <button onClick={sendMessage} disabled={!input.trim() || loading}
                    className="px-4 py-3 rounded-xl text-base md:text-sm font-medium transition-all disabled:opacity-20"
                    style={{ background: input.trim() ? "var(--accent-glow)" : "transparent", border: "1px solid var(--border-light)", minHeight: "48px" }}>
              →
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      {sidebarOpen && !isMobile && (
        <aside className="w-72 border-l overflow-y-auto flex-shrink-0"
               style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}>
          <div className="p-4">
            <TopologyContent latestCx={latestCx} cxHistory={cxHistory} messages={messages} />
          </div>
        </aside>
      )}

      {/* Mobile bottom sheet */}
      {sidebarOpen && isMobile && (
        <div className="fixed inset-x-0 bottom-0 z-50"
             style={{ background: "var(--bg-primary)", borderTop: "1px solid var(--border-light)", maxHeight: "60vh", overflowY: "auto", borderRadius: "16px 16px 0 0" }}>
          <div className="p-4">
            <div className="w-10 h-1 rounded-full mx-auto mb-4"
                 style={{ background: "var(--border-focus)" }}
                 onClick={() => setSidebarOpen(false)} />
            <TopologyContent latestCx={latestCx} cxHistory={cxHistory} messages={messages} />
          </div>
        </div>
      )}
    </div>
  );
}
