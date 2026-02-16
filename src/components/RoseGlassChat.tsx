import { useState, useRef, useEffect, useCallback } from "react";

/*
 * roseglass.chat — Cognitive Mirror Interface
 * 
 * A conversation interface where Rose Glass runs silently underneath,
 * tracking the user's dimensional coherence across the conversation
 * and surfacing pattern alerts when reasoning deforms under pressure.
 * 
 * Not a chatbot. A cognitive mirror with mathematical backing.
 */

// ─── Configuration ───────────────────────────────────────────────
const PERCEPTION_WORKER_URL = "https://roseglass-perception.macgregortechnologies.workers.dev";
// Falls back to direct computation if worker unavailable

const LENS_OPTIONS = [
  { id: "auto", name: "Auto-Calibrating", short: "Auto" },
  { id: "conservative_american", name: "Conservative American", short: "Conservative" },
  { id: "liberal_american", name: "Liberal American", short: "Liberal" },
  { id: "venture_capital", name: "Venture Capital Investor", short: "VC" },
  { id: "tech_informed", name: "Tech-Informed", short: "Tech" },
  { id: "non_tech", name: "Non-Technical", short: "Non-Tech" },
  { id: "geopolitical_analyst", name: "Geopolitical Analyst", short: "Geopolitical" },
  { id: "high_net_worth", name: "High Net Worth", short: "HNW" },
  { id: "neurodivergent", name: "Neurodivergent", short: "ND" },
];

// ─── Utility ─────────────────────────────────────────────────────
function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function DimensionBar({ label, symbol, value, baseline, gradient, color }) {
  const delta = gradient !== undefined ? gradient : 0;
  const width = Math.max(2, Math.min(100, value * 100));
  const baselinePos = baseline ? Math.min(100, baseline * 100) : null;

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-mono opacity-70">
          {symbol} <span className="opacity-50">{label}</span>
        </span>
        <span className="text-xs font-mono">
          {value.toFixed(2)}
          {delta !== 0 && (
            <span className={delta > 0 ? "text-emerald-400 ml-1" : "text-rose-400 ml-1"}>
              {delta > 0 ? "+" : ""}{delta.toFixed(3)}
            </span>
          )}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${width}%`, background: color }}
        />
        {baselinePos && (
          <div
            className="absolute top-0 bottom-0 w-px opacity-40"
            style={{ left: `${baselinePos}%`, background: "#fff" }}
          />
        )}
      </div>
    </div>
  );
}

function AlertCard({ alert, index }) {
  const colors = {
    high: { border: "border-rose-500/40", bg: "bg-rose-950/30", icon: "text-rose-400" },
    moderate: { border: "border-amber-500/30", bg: "bg-amber-950/20", icon: "text-amber-400" },
  };
  const c = colors[alert.severity] || colors.moderate;

  return (
    <div
      className={cn("border rounded-lg p-3 mb-2 transition-all duration-500", c.border, c.bg)}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="flex items-start gap-2">
        <span className={cn("text-sm mt-0.5", c.icon)}>
          {alert.severity === "high" ? "◆" : "◇"}
        </span>
        <div>
          <div className="text-xs font-mono opacity-50 mb-1">
            {alert.dimension} — {alert.type.replace("_", " ")}
          </div>
          <p className="text-sm leading-relaxed opacity-80">
            {alert.message}
          </p>
          <div className="text-xs font-mono opacity-40 mt-1">
            {alert.baseline?.toFixed(2)} → {alert.current?.toFixed(2)} ({alert.delta > 0 ? "+" : ""}{alert.delta?.toFixed(3)})
          </div>
        </div>
      </div>
    </div>
  );
}

function CoherenceGraph({ timeline }) {
  if (!timeline || timeline.length < 2) return null;

  const w = 280;
  const h = 60;
  const pad = 4;

  function toPath(data, key) {
    const maxIdx = data.length - 1;
    return data
      .map((d, i) => {
        const x = pad + (i / maxIdx) * (w - pad * 2);
        const y = h - pad - d[key] * (h - pad * 2);
        return `${i === 0 ? "M" : "L"}${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="mb-4">
      <div className="text-xs font-mono opacity-40 mb-1">Coherence Timeline</div>
      <svg width={w} height={h} className="w-full" viewBox={`0 0 ${w} ${h}`}>
        <path d={toPath(timeline, "coherence")} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <path d={toPath(timeline, "psi")} fill="none" stroke="rgba(147,197,253,0.5)" strokeWidth="1" />
        <path d={toPath(timeline, "q")} fill="none" stroke="rgba(252,165,165,0.5)" strokeWidth="1" />
        <path d={toPath(timeline, "rho")} fill="none" stroke="rgba(167,139,250,0.5)" strokeWidth="1" />
        <path d={toPath(timeline, "f")} fill="none" stroke="rgba(134,239,172,0.5)" strokeWidth="1" />
      </svg>
      <div className="flex gap-3 text-[10px] font-mono opacity-30 mt-1">
        <span style={{ color: "rgb(147,197,253)" }}>Ψ</span>
        <span style={{ color: "rgb(167,139,250)" }}>ρ</span>
        <span style={{ color: "rgb(252,165,165)" }}>q</span>
        <span style={{ color: "rgb(134,239,172)" }}>f</span>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>C</span>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export default function RoseGlassChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lens, setLens] = useState("auto");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [perception, setPerception] = useState(null);
  const [gradientHistory, setGradientHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lensMenuOpen, setLensMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Perceive a message through the worker
  const perceive = useCallback(async (text, role = "user") => {
    try {
      const res = await fetch(`${PERCEPTION_WORKER_URL}/perceive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, session_id: sessionId, lens, role }),
      });
      if (res.ok) {
        const data = await res.json();
        if (role === "user") {
          setPerception(data.summary);
          if (data.alerts?.length > 0) {
            setAlerts(prev => [...prev, ...data.alerts]);
          }
          // Update gradient history
          if (data.summary?.latest) {
            setGradientHistory(prev => [...prev, {
              psi: data.summary.latest.psi,
              rho: data.summary.latest.rho,
              q: data.summary.latest.q_optimized,
              f: data.summary.latest.f,
              tau: data.summary.latest.tau,
              coherence: data.summary.latest.coherence,
            }]);
          }
        }
        return data;
      }
    } catch (e) {
      console.error("Perception worker unavailable:", e);
    }
    return null;
  }, [sessionId, lens]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    // Add user message
    const userMsg = { role: "user", content: text, id: crypto.randomUUID() };
    setMessages(prev => [...prev, userMsg]);

    // Perceive user message (fire and forget, don't block)
    perceive(text, "user");

    try {
      // Build conversation history for Claude
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      // Build perception context for system prompt
      let perceptionContext = "";
      if (perception?.latest) {
        const p = perception.latest;
        const g = perception.gradients || {};
        perceptionContext = `

[ROSE GLASS PERCEPTION STATE — message ${perception.message_count || 0}]
Current dimensional readings:
  Ψ (consistency): ${p.psi} ${g.psi ? `(Δ${g.psi > 0 ? "+" : ""}${g.psi})` : ""}
  ρ (wisdom depth): ${p.rho} ${g.rho ? `(Δ${g.rho > 0 ? "+" : ""}${g.rho})` : ""}
  q (activation): ${p.q_optimized} ${g.q ? `(Δ${g.q > 0 ? "+" : ""}${g.q})` : ""}
  f (social): ${p.f} ${g.f ? `(Δ${g.f > 0 ? "+" : ""}${g.f})` : ""}
  τ (temporal): ${p.tau}
  C (coherence): ${p.coherence}
  λ (interference): ${p.lambda}
Lens: ${lens}
${alerts.length > 0 ? `\nRecent alerts:\n${alerts.slice(-3).map(a => `  ${a.dimension}: ${a.message}`).join("\n")}` : ""}
`;
      }

      const systemPrompt = `You are the intelligence behind roseglass.chat — a cognitive mirror for people making complex, high-stakes decisions.

Your role: Have an excellent, substantive conversation with the user about whatever they want to discuss. You are a brilliant thinking partner. You do NOT mention Rose Glass, dimensions, coherence scores, or any framework mechanics unless the user specifically asks about them.

You have access to real-time Rose Glass perception data about the user's communication patterns across this conversation. Use this data SILENTLY to:
- Notice when the user's reasoning shifts (but don't announce it mechanically)
- Adjust your depth and directness based on their coherence state
- If you detect a significant pattern shift, you may gently surface an observation — not as a score report, but as a natural conversational insight. For example: "I notice you shifted from a structural analysis to a more conviction-driven frame — is that intentional?" rather than "Your Ψ dropped 0.15 points."

The user chose the lens: ${LENS_OPTIONS.find(l => l.id === lens)?.name || "Auto-Calibrating"}. This tells you something about how they want to think. Respect it.

You are speaking to someone who values intelligence, directness, and real insight over performance. Don't pad. Don't hedge unnecessarily. Match their level.
${perceptionContext}`;

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [
            ...history,
            { role: "user", content: text },
          ],
        }),
      });

      const data = await res.json();
      const responseText = data.content?.find(b => b.type === "text")?.text || "Error processing response.";

      const assistantMsg = { role: "assistant", content: responseText, id: crypto.randomUUID() };
      setMessages(prev => [...prev, assistantMsg]);

      // Perceive assistant response too (for complete tracking)
      perceive(responseText, "assistant");

    } catch (e) {
      console.error("Chat error:", e);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Connection error. Please try again.",
        id: crypto.randomUUID(),
      }]);
    }

    setLoading(false);
  }, [input, loading, messages, perception, alerts, lens, perceive]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const currentLens = LENS_OPTIONS.find(l => l.id === lens);
  const latestAlerts = alerts.slice(-5);

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
          </div>

          <div className="flex items-center gap-4">
            {/* Lens Selector */}
            <div className="relative">
              <button
                onClick={() => setLensMenuOpen(!lensMenuOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all hover:bg-white/5"
                style={{ border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <span className="opacity-40">lens:</span>
                <span>{currentLens?.short}</span>
                <span className="opacity-30">▾</span>
              </button>

              {lensMenuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 w-64 rounded-lg shadow-2xl z-50 py-1 border"
                  style={{ background: "#141418", borderColor: "rgba(255,255,255,0.08)" }}
                >
                  {LENS_OPTIONS.map(l => (
                    <button
                      key={l.id}
                      onClick={() => { setLens(l.id); setLensMenuOpen(false); }}
                      className={cn(
                        "w-full text-left px-4 py-2.5 text-sm transition-all hover:bg-white/5",
                        lens === l.id && "bg-white/5"
                      )}
                    >
                      <div className="font-medium text-xs">{l.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Toggle */}
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
                  A distillation of your thoughts.
                </div>
                <p className="text-sm opacity-30 leading-relaxed">
                  Think out loud about a complex decision. Rose Glass tracks your coherence in real time —
                  not to judge, but to show you where your reasoning shifts under pressure.
                </p>
                <p className="text-xs opacity-20 mt-4 font-mono">
                  Select a lens above to calibrate perception.
                </p>
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                "max-w-2xl",
                msg.role === "user" ? "ml-auto" : "mr-auto"
              )}
            >
              <div
                className={cn(
                  "rounded-xl px-4 py-3 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-white/5 border border-white/8"
                    : ""
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
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Think out loud..."
              rows={1}
              className="flex-1 resize-none rounded-xl px-4 py-3 text-sm bg-white/5 border border-white/8 placeholder-white/20 focus:outline-none focus:border-white/15 transition-all"
              style={{
                minHeight: "44px",
                maxHeight: "200px",
                fontFamily: "inherit",
              }}
              onInput={e => {
                e.target.style.height = "44px";
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
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

      {/* ─── Perception Sidebar ─── */}
      {sidebarOpen && (
        <aside
          className="w-72 border-l overflow-y-auto flex-shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.01)" }}
        >
          <div className="p-4">
            <div className="text-xs font-mono opacity-30 mb-4 tracking-widest">PERCEPTION</div>

            {/* Coherence Graph */}
            <CoherenceGraph timeline={gradientHistory} />

            {/* Current Dimensions */}
            {perception?.latest ? (
              <div className="mb-6">
                <DimensionBar
                  label="consistency" symbol="Ψ"
                  value={perception.latest.psi}
                  baseline={perception.baseline?.psi}
                  gradient={perception.gradients?.psi}
                  color="rgb(147,197,253)"
                />
                <DimensionBar
                  label="wisdom" symbol="ρ"
                  value={perception.latest.rho}
                  baseline={perception.baseline?.rho}
                  gradient={perception.gradients?.rho}
                  color="rgb(167,139,250)"
                />
                <DimensionBar
                  label="activation" symbol="q"
                  value={perception.latest.q_optimized}
                  baseline={perception.baseline?.q}
                  gradient={perception.gradients?.q}
                  color="rgb(252,165,165)"
                />
                <DimensionBar
                  label="social" symbol="f"
                  value={perception.latest.f}
                  baseline={perception.baseline?.f}
                  gradient={perception.gradients?.f}
                  color="rgb(134,239,172)"
                />
                <DimensionBar
                  label="temporal" symbol="τ"
                  value={perception.latest.tau}
                  baseline={perception.baseline?.tau}
                  gradient={perception.gradients?.tau}
                  color="rgb(253,224,71)"
                />

                <div className="mt-4 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                  <div className="flex justify-between text-xs font-mono">
                    <span className="opacity-40">coherence</span>
                    <span>{perception.latest.coherence.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-mono mt-1">
                    <span className="opacity-40">λ interference</span>
                    <span>{perception.latest.lambda.toFixed(3)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs opacity-20 text-center py-8">
                Perception begins with your first message.
              </div>
            )}

            {/* Alerts */}
            {latestAlerts.length > 0 && (
              <div>
                <div className="text-xs font-mono opacity-30 mb-2 tracking-widest">PATTERN ALERTS</div>
                {latestAlerts.map((alert, i) => (
                  <AlertCard key={i} alert={alert} index={i} />
                ))}
              </div>
            )}

            {/* Session Info */}
            <div className="mt-6 pt-3 border-t text-xs font-mono opacity-20" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
              <div>messages: {messages.filter(m => m.role === "user").length}</div>
              <div>alerts: {alerts.length}</div>
              <div>lens: {currentLens?.name}</div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
