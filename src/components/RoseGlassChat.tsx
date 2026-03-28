"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/*
 * roseglass.chat — C(x) Diffractive Chat Interface (WP-2026-007)
 *
 * Conversation interface powered by the roseglass-chat edge function.
 * Every message is perceived through four Fresnel zones. The interference
 * pattern is computed, stored, and injected into the LLM's perception.
 * The topology is visible in the sidebar.
 */

// ─── Configuration ───────────────────────────────────────────────
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://boupwgkkzexwisctrhdr.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// ─── Types ───────────────────────────────────────────────────────
interface ZoneReading {
  A: number;
  phi: number;
}

interface CxReading {
  Cx: number;
  tau: number;
  lambda: number;
  veritas_ratio: number;
  has_dark_spot: boolean;
  zones: Record<string, ZoneReading>;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cx?: CxReading;
}

// ─── Utility ─────────────────────────────────────────────────────
function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(" ");
}

function radToDeg(phi: number): string {
  return (phi * 180 / Math.PI).toFixed(0);
}

function isDestructive(phi: number): boolean {
  return Math.abs(phi) > Math.PI * 0.4;
}

function cxColor(cx: number, hasDarkSpot: boolean): string {
  if (hasDarkSpot) return "rgb(239,68,68)";
  if (cx > 0.6) return "rgb(74,222,128)";
  if (cx > 0.3) return "rgb(250,204,21)";
  return "rgb(251,146,60)";
}

// ─── Zone Bar Component ──────────────────────────────────────────
const ZONE_META: Record<string, { label: string; symbol: string; color: string }> = {
  q:   { label: "Sentiment",  symbol: "q", color: "rgb(252,165,165)" },
  f:   { label: "Belonging",  symbol: "f", color: "rgb(134,239,172)" },
  rho: { label: "Wisdom",     symbol: "ρ", color: "rgb(167,139,250)" },
  psi: { label: "Linguistic",  symbol: "Ψ", color: "rgb(147,197,253)" },
};

function ZoneBar({ zoneKey, reading }: { zoneKey: string; reading: ZoneReading }) {
  const meta = ZONE_META[zoneKey];
  if (!meta) return null;

  const ampWidth = Math.max(2, Math.min(100, reading.A * 100));
  const dest = isDestructive(reading.phi);

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono opacity-70">
          {meta.symbol} <span className="opacity-50">{meta.label}</span>
        </span>
        <span className="text-xs font-mono">
          A={reading.A.toFixed(2)}
          <span className={cn("ml-1.5", dest ? "text-rose-400" : "opacity-40")}>
            φ={radToDeg(reading.phi)}°
          </span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${ampWidth}%`, background: meta.color, opacity: dest ? 0.4 : 1 }}
        />
      </div>
      {dest && (
        <div className="text-[9px] font-mono text-rose-400/60 mt-0.5">DESTRUCTIVE</div>
      )}
    </div>
  );
}

// ─── C(x) Sparkline ──────────────────────────────────────────────
function CxSparkline({ history }: { history: CxReading[] }) {
  if (history.length < 2) return null;

  const w = 280, h = 60, pad = 4;
  const maxIdx = history.length - 1;

  function toPath(key: "Cx" | "veritas_ratio") {
    return history
      .map((d, i) => {
        const x = pad + (i / maxIdx) * (w - pad * 2);
        const val = Math.min(1, key === "Cx" ? d.Cx : d.veritas_ratio);
        const y = h - pad - val * (h - pad * 2);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  // Dark spot markers
  const darkSpots = history
    .map((d, i) => ({ i, dark: d.has_dark_spot }))
    .filter((d) => d.dark);

  return (
    <div className="mb-4">
      <div className="text-xs font-mono opacity-40 mb-1">C(x) Timeline</div>
      <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`}>
        <path d={toPath("Cx")} fill="none" stroke="rgba(232,180,184,0.7)" strokeWidth="1.5" />
        <path d={toPath("veritas_ratio")} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
        {darkSpots.map((d) => {
          const x = pad + (d.i / maxIdx) * (w - pad * 2);
          return <circle key={d.i} cx={x} cy={h - pad - 2} r="2.5" fill="rgb(239,68,68)" opacity="0.7" />;
        })}
      </svg>
      <div className="flex gap-3 text-[10px] font-mono opacity-30 mt-1">
        <span style={{ color: "rgb(232,180,184)" }}>C(x)</span>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>veritas</span>
        {darkSpots.length > 0 && <span style={{ color: "rgb(239,68,68)" }}>● dark spots</span>}
      </div>
    </div>
  );
}

// ─── Dark Spot Alert ─────────────────────────────────────────────
function DarkSpotAlert({ cx }: { cx: CxReading }) {
  if (!cx.has_dark_spot) return null;
  return (
    <div className="border border-rose-500/40 bg-rose-950/30 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <span className="text-rose-400 text-sm mt-0.5">◆</span>
        <div>
          <div className="text-xs font-mono text-rose-400 mb-1">DARK SPOT DETECTED</div>
          <p className="text-sm leading-relaxed opacity-80">
            C(x) ≈ {cx.Cx.toFixed(3)} with nonzero amplitudes. Zones are interfering
            destructively. The quiet is signal.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── C(x) Dot on Messages ────────────────────────────────────────
function CxDot({ cx }: { cx?: CxReading }) {
  if (!cx) return null;
  const color = cxColor(cx.Cx, cx.has_dark_spot);
  return (
    <span
      className="inline-block w-2 h-2 rounded-full ml-2 align-middle"
      style={{ background: color }}
      title={`C(x)=${cx.Cx.toFixed(3)} τ=${cx.tau.toFixed(1)} veritas=${cx.veritas_ratio.toFixed(3)}${cx.has_dark_spot ? " [DARK SPOT]" : ""}`}
    />
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fix 1: Session ID from localStorage, not server render
  useEffect(() => {
    const KEY = "roseglass-session-id";
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(KEY, id);
    }
    setSessionId(id);
    setHydrated(true);
  }, []);

  // Fix 3: Restore history from DB on mount
  useEffect(() => {
    if (!sessionId) return;
    async function restore() {
      try {
        const [msgRes, cxRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/chat_messages?session_id=eq.${sessionId}&order=created_at.asc&select=id,role,content`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/coherence_readings?session_id=eq.${sessionId}&order=created_at.asc&select=cx,tau,lambda,veritas_ratio,has_dark_spot,zone_detail`,
            { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
          ),
        ]);
        const msgs = await msgRes.json();
        const cxs = await cxRes.json();
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs.map((m: { id: string; role: "user" | "assistant"; content: string }) => ({
            id: m.id, role: m.role, content: m.content,
          })));
        }
        if (Array.isArray(cxs) && cxs.length > 0) {
          const readings: CxReading[] = cxs.map((r: Record<string, unknown>) => ({
            Cx: Number(r.cx), tau: Number(r.tau), lambda: Number(r.lambda),
            veritas_ratio: Number(r.veritas_ratio), has_dark_spot: Boolean(r.has_dark_spot),
            zones: (r.zone_detail as Record<string, ZoneReading>) || {},
          }));
          setCxHistory(readings);
          setLatestCx(readings[readings.length - 1]);
        }
      } catch (e) {
        console.error("History restore failed:", e);
      }
    }
    restore();
  }, [sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/roseglass-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });

      const data = await res.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `Error: ${data.error}`, id: crypto.randomUUID() },
        ]);
      } else {
        const cx: CxReading = data.cx;
        setLatestCx(cx);
        setCxHistory((prev) => [...prev, cx]);

        // Update user message with cx reading
        setMessages((prev) =>
          prev.map((m) => (m.id === userMsg.id ? { ...m, cx } : m))
        );

        const assistantMsg: ChatMessage = {
          role: "assistant",
          content: data.content,
          id: crypto.randomUUID(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Connection error. Please try again.", id: crypto.randomUUID() },
      ]);
    }

    setLoading(false);
  }, [input, loading, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!hydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center"
           style={{ background: "#0a0a0c", color: "#e2e0dc" }}>
        <span className="text-xs font-mono opacity-40">initializing...</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "#0a0a0c", color: "#e2e0dc" }}>
      {/* ─── Main Chat Area ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg, #e8b4b8, #b4a0d1)" }} />
            <h1 className="text-base tracking-wide" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
              roseglass<span className="opacity-40">.chat</span>
            </h1>
            {latestCx && (
              <span className="text-xs font-mono opacity-40 ml-2">
                C(x)={latestCx.Cx.toFixed(3)}
                <span className="ml-1.5">τ={latestCx.tau.toFixed(1)}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={startNewSession}
              className="p-2 rounded-md transition-all hover:bg-white/5 text-xs font-mono opacity-50 hover:opacity-80"
            >
              + new
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md transition-all hover:bg-white/5 text-xs font-mono opacity-50 hover:opacity-80"
            >
              {sidebarOpen ? "◨" : "◧"}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="text-2xl mb-4 opacity-20" style={{ fontFamily: "'Crimson Text', Georgia, serif" }}>
                  The lens is not the light.
                </div>
                <p className="text-sm opacity-30 leading-relaxed">
                  Every message is perceived through four Fresnel zones. The interference
                  pattern tells the model what it cannot see on the surface.
                </p>
                <p className="text-xs opacity-20 mt-4 font-mono">
                  Dark spots are where the signal is.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("max-w-2xl", msg.role === "user" ? "ml-auto" : "mr-auto")}
            >
              <div
                className={cn(
                  "rounded-xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user" ? "bg-white/5 border border-white/8" : ""
                )}
                style={{
                  fontFamily: msg.role === "assistant" ? "'Crimson Text', Georgia, serif" : "inherit",
                  fontSize: msg.role === "assistant" ? "15px" : "14px",
                  lineHeight: "1.7",
                }}
              >
                {msg.content.split("\n").map((line, i) => (
                  <p key={i} className={i > 0 ? "mt-2" : ""}>
                    {line}
                  </p>
                ))}
              </div>
              {msg.role === "user" && msg.cx && (
                <div className="flex items-center justify-end mt-1 gap-1.5">
                  <CxDot cx={msg.cx} />
                  <span className="text-[10px] font-mono opacity-25">
                    {msg.cx.Cx.toFixed(3)}
                  </span>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="max-w-2xl mr-auto">
              <div className="flex gap-1 py-3 px-4">
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: "0.2s" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-end gap-3 max-w-3xl mx-auto">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Say something real..."
              rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/8 placeholder-white/20 focus:outline-none focus:border-white/15 transition-all"
              style={{ minHeight: "44px", maxHeight: "200px" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "44px";
                t.style.height = Math.min(t.scrollHeight, 200) + "px";
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="px-4 py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-20"
              style={{
                background: input.trim() ? "rgba(232,180,184,0.15)" : "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* ─── Topology Sidebar ─── */}
      {sidebarOpen && (
        <aside
          className="w-72 border-l overflow-y-auto flex-shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
        >
          <div className="p-4">
            <div className="text-xs font-mono opacity-30 mb-4 tracking-widest">TOPOLOGY</div>

            {/* C(x) Sparkline */}
            <CxSparkline history={cxHistory} />

            {/* Current Reading */}
            {latestCx ? (
              <div className="mb-6">
                {/* C(x) Value */}
                <div className="text-center mb-4">
                  <div
                    className="text-3xl italic"
                    style={{
                      fontFamily: "'Crimson Text', Georgia, serif",
                      color: cxColor(latestCx.Cx, latestCx.has_dark_spot),
                    }}
                  >
                    {latestCx.Cx.toFixed(4)}
                  </div>
                  <div className="text-[10px] font-mono opacity-30 mt-1">
                    C(x, τ={latestCx.tau.toFixed(1)}, λ=1.0)
                  </div>
                </div>

                {/* Dark Spot Alert */}
                <DarkSpotAlert cx={latestCx} />

                {/* Zone Bars */}
                <ZoneBar zoneKey="q" reading={latestCx.zones.q} />
                <ZoneBar zoneKey="f" reading={latestCx.zones.f} />
                <ZoneBar zoneKey="rho" reading={latestCx.zones.rho} />
                <ZoneBar zoneKey="psi" reading={latestCx.zones.psi} />

                {/* Veritas + τ */}
                <div className="mt-4 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="opacity-40">veritas</span>
                    <span>{latestCx.veritas_ratio.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono mt-1">
                    <span className="opacity-40">τ depth</span>
                    <span>
                      {latestCx.tau.toFixed(1)}
                      {latestCx.tau < 1.5 && (
                        <span className="opacity-30 ml-1">shallow</span>
                      )}
                      {latestCx.tau >= 1.5 && latestCx.tau < 2.5 && (
                        <span className="opacity-30 ml-1">mid</span>
                      )}
                      {latestCx.tau >= 2.5 && (
                        <span className="opacity-30 ml-1">deep</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs opacity-20 text-center py-8">
                Topology emerges with your first message.
              </div>
            )}

            {/* Session Info */}
            <div className="mt-6 pt-3 border-t text-xs font-mono opacity-20" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <div>messages: {messages.filter((m) => m.role === "user").length}</div>
              <div>readings: {cxHistory.length}</div>
              <div>dark spots: {cxHistory.filter((c) => c.has_dark_spot).length}</div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
