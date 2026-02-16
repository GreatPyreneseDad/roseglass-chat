// app/api/chat/route.ts
// 
// This API route:
// 1. Receives user message + conversation history
// 2. Calls the Rose Glass Perception Worker to analyze the message
// 3. Injects perception state into Claude's system prompt
// 4. Returns Claude's response + perception data
//
// The worker does real computation. The system prompt gives Claude 
// awareness of what the computation found. Claude decides what to do with it.

import { NextResponse } from 'next/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const PERCEPTION_WORKER_URL = process.env.PERCEPTION_WORKER_URL || 'https://roseglass-perception.macgregortechnologies.workers.dev';

const LENS_DESCRIPTIONS = {
  auto: "Auto-Calibrating — detecting context dynamically",
  conservative_american: "Conservative American — traditional values, institutional trust, individual agency",
  liberal_american: "Liberal American — systemic analysis, collective action, equity framing",
  venture_capital: "Venture Capital — risk assessment, conviction vs herd, pattern matching",
  tech_informed: "Tech-Informed — first-principles, builder mindset, precision",
  non_tech: "Non-Technical — narrative reasoning, trust-based evaluation, analogies",
  geopolitical_analyst: "Geopolitical — multi-actor game theory, structural forces, temporal depth",
  high_net_worth: "High Net Worth — multi-generational thinking, asset preservation, advisory fatigue",
  neurodivergent: "Neurodivergent — pattern-recognition depth, direct communication, systematic"
};

export async function POST(request) {
  try {
    const { message, history, session_id, lens } = await request.json();

    // Step 1: Perceive user message through the worker
    let perceptionData = null;
    try {
      const perceptionRes = await fetch(`${PERCEPTION_WORKER_URL}/perceive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          session_id,
          lens: lens || 'auto',
          role: 'user'
        })
      });
      if (perceptionRes.ok) {
        perceptionData = await perceptionRes.json();
      }
    } catch (e) {
      console.warn('Perception worker unavailable, proceeding without:', e.message);
    }

    // Step 2: Build system prompt with perception context
    const lensName = LENS_DESCRIPTIONS[lens] || LENS_DESCRIPTIONS.auto;

    let perceptionContext = '';
    if (perceptionData?.summary?.latest) {
      const p = perceptionData.summary.latest;
      const g = perceptionData.summary.gradients || {};
      const alertText = perceptionData.summary.recent_alerts?.length > 0
        ? `\nActive alerts:\n${perceptionData.summary.recent_alerts.map(a => `  ${a.dimension}: ${a.message}`).join('\n')}`
        : '';

      perceptionContext = `

[ROSE GLASS — Live Perception State]
Message ${perceptionData.summary.message_count || 1} in conversation
Dimensions: Ψ=${p.psi}${g.psi ? ` (Δ${g.psi > 0 ? '+' : ''}${g.psi})` : ''} | ρ=${p.rho}${g.rho ? ` (Δ${g.rho > 0 ? '+' : ''}${g.rho})` : ''} | q=${p.q_optimized}${g.q ? ` (Δ${g.q > 0 ? '+' : ''}${g.q})` : ''} | f=${p.f}${g.f ? ` (Δ${g.f > 0 ? '+' : ''}${g.f})` : ''}
τ=${p.tau} | λ=${p.lambda} | C=${p.coherence}
Lens: ${lensName}${alertText}`;
    }

    const systemPrompt = `You are the intelligence behind roseglass.chat — a cognitive mirror for people navigating complex, high-stakes decisions.

You are a brilliant, direct thinking partner. You match the user's intelligence level. You do not pad, hedge unnecessarily, or perform insight you don't have.

You have access to real-time Rose Glass perception data about the user's coherence patterns across this conversation. This data tracks dimensional shifts in their reasoning — consistency, wisdom depth, emotional activation, social influence, and temporal framing.

HOW TO USE PERCEPTION DATA:
- It runs silently. You do NOT report scores, dimensions, or framework mechanics.
- Use it to notice shifts in the user's thinking and respond accordingly.
- If a significant pattern emerges (e.g., emotional activation spiking during what should be analytical reasoning, or consistency dropping after introducing a new variable), you may surface a natural observation. Not as data — as insight.
- Example: "You started with a structural thesis but shifted to conviction language when discussing timing — is the timing driving the thesis or the other way around?"
- Never say "your Ψ dropped" or "I notice your coherence score." That's mechanical. Translate the pattern into plain language insight.

LENS CONTEXT:
The user selected: ${lensName}
This shapes what patterns are significant. A VC lens flags herd behavior and FOMO. A geopolitical lens tracks temporal depth collapse. A conservative lens weights institutional wisdom. Respect the frame.

YOUR QUALITIES:
- Substantive depth over surface breadth
- Direct disagreement when warranted — the user values honesty over comfort
- Pattern recognition across domains
- Willingness to say "I don't know" or "that's a bad idea"
- No sycophancy. No performance. Real engagement.
${perceptionContext}`;

    // Step 3: Call Anthropic
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...(history || []).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message }
        ]
      })
    });

    const anthropicData = await anthropicRes.json();
    const responseText = anthropicData.content?.find(b => b.type === 'text')?.text || 'Error processing response.';

    // Step 4: Perceive assistant response for tracking
    try {
      await fetch(`${PERCEPTION_WORKER_URL}/perceive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: responseText,
          session_id,
          lens: lens || 'auto',
          role: 'assistant'
        })
      });
    } catch (e) {
      // Non-critical
    }

    // Step 5: Return response + perception data
    return NextResponse.json({
      response: responseText,
      perception: perceptionData?.summary || null,
      alerts: perceptionData?.alerts || [],
      usage: {
        input_tokens: anthropicData.usage?.input_tokens,
        output_tokens: anthropicData.usage?.output_tokens
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}
