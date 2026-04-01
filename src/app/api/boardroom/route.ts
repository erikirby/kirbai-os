import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { 
    getRow, 
    logApiUsageAsync, 
    getBoardroomHistoryAsync, 
    saveBoardroomBriefAsync,
    getAuditLedgerAsync,
    saveAuditLedgerEntryAsync,
    getHeartScaleDbAsync,
    saveHeartScaleNodeAsync
} from "@/lib/db";
import { AGENTS } from "@/config/agents";
import { safeCallGemini } from "@/lib/intel";

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    const writeStream = async (agent: string, text: string, type: 'thought' | 'action' | 'brief' | 'conflict' | 'referee' | 'risk', agentId?: string) => {
        await writer.write(encoder.encode(JSON.stringify({ agent, text, type, agentId }) + '\n'));
    };

    try {
        const { prompt, mode, history: conversationHistory, forceRuling } = await req.json();
        
        if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY missing");

        // Keyword trigger for ruling
        const forceKeywords = ["rule", "decide", "enough", "final", "brief", "ruling"];
        const hasForceKeyword = forceKeywords.some(k => prompt.toLowerCase().includes(k));
        const finalForce = forceRuling || hasForceKeyword;

        // Count previous MD probes to prevent loops
        const probeCount = (conversationHistory || []).filter((m: any) => 
            m.role === 'assistant' && (m.content.includes('"clash"') || m.content.includes('Missing Info'))
        ).length;

        // Gather context (Two-Layer Memory)
        const [identity, finance, pulse, roadmap, history, ledger, heartScale] = await Promise.all([
            getRow('brand_identity'),
            getRow('main_db').then(db => db?.financeAnalysis),
            getRow(mode === 'factory' ? 'pulse_state_factory' : 'pulse_state_kirbai'),
            getRow(mode === 'factory' ? 'roadmap_factory' : 'roadmap_kirbai'),
            getBoardroomHistoryAsync(),
            getAuditLedgerAsync(), // Layer 2: Decisions
            getHeartScaleDbAsync() // Layer 2: Hard Facts
        ]);

        const context = `
            STRATEGIC CONSTRAINTS (MANDATORY):
            1. USER (Erik Henry) is an AI-NATIVE BRAND.
            2. Workflow: Suno/Udio/Logic Pro for music, AI engines for visuals/video.
            3. WE DO NOT OUTSOURCE. Never recommend "commissioning" videos or "hiring" human producers/studios. We do everything in-house with AI.
            4. Decisions must leverage the "Music Factory" (Quantity/SEO) or "Kirbai" (High-Fidelity AI Lore) models.

            Identity: ${JSON.stringify(identity)}
            Finance: ${JSON.stringify({ totals: finance?.totals, topTracks: finance?.tracks?.slice(0, 10) })}
            Analytics: ${JSON.stringify(pulse)}
            Roadmap: ${JSON.stringify(roadmap)}
            Layer 2 Memory (AUDIT LEDGER): ${JSON.stringify(ledger.slice(0, 10))}
            Layer 2 Memory (HEART SCALE DB): ${JSON.stringify(heartScale)}
            Current Discussion Record: ${JSON.stringify(conversationHistory || [])}
        `;

        const BANNED_SLOP = "collaborate, synergy, mandated, teamwork, roadmap, compliance, leverage, friction, trajectory, alignment, deployment, non-compliance, strategizing, inherent, Disney-energy, mid-ness, synthesis, feedback, inputs, specialist, outcomes, branches, logic, Action:, next steps, strategic ruling, framework, methodology, positioning, stakeholders";

        (async () => {
            try {
                // --- PHASE 1: THE MOVE ---
                await writeStream('System', 'DEBATING THE MOVE...', 'action');
                
                const md = AGENTS.find(a => a.id === 'md');
                const triagePrompt = `
                    ${md?.persona}
                    BANNED SLOP: ${BANNED_SLOP}
                    Current Play: "${prompt}".
                    TASK: Select exactly 3 agents to analyze this. 
                    Available: ${AGENTS.filter(a => a.id !== 'md').map(a => a.id).join(', ')}.
                    MD INITIAL: One blunt sentence about the request.
                    Return ONLY JSON: { "selected": ["id1", "id2", "id3"], "md_initial": "One blunt sentence." }
                `;
                
                const triageResponse = await safeCallGemini('gemini-2.5-flash', {
                    contents: [{ role: 'user', parts: [{ text: triagePrompt }] }]
                });
                const triageText = triageResponse.text || "{}";
                let triageData: { selected: string[], md_initial: string } = { selected: [], md_initial: "" };
                try {
                    triageData = JSON.parse(triageText.replace(/```json|```/g, '').trim());
                } catch (e) {
                    // Fallback to random selection if AI fails JSON
                    triageData.selected = AGENTS.filter(a => a.id !== 'md').slice(0, 3).map(a => a.id);
                }
                
                const specialistInsights: Record<string, string> = {};
                
                // SEQUENTIAL ANALYSIS for diversity
                for (const [index, id] of triageData.selected.entries()) {
                    const agent = AGENTS.find(a => a.id === id);
                    if (!agent) continue;

                    let logicType = "Direct Analysis";
                    if (id === 'growth') logicType = "ReAct Reasoning (Trend + Hook fact-check)";
                    if (id === 'arbiter') logicType = "Recursion of Thought (Draft -> Self-Critique -> Result)";

                    const previousComments = Object.entries(specialistInsights)
                        .map(([aid, text]) => `${AGENTS.find(a => a.id === aid)?.name}: ${text}`)
                        .join('\n');

                    const isDirectInquiry = prompt.toLowerCase().includes(`@${agent.id}`) || prompt.toLowerCase().includes(agent.name.toLowerCase());

                    const specPrompt = `
                        ${agent.persona}
                        CONTEXT: ${context}
                        Logic to Analyze: "${prompt}"
                        BANNED SLOP: ${BANNED_SLOP}
                        
                        EARNED AGREEMENT POLICY: Do NOT agree with previous specialists or the user unless their reasoning is undeniably sound. If you agree, you MUST state the specific "earned" reason why. Otherwise, find a new angle, a hidden risk, or a missed opportunity.
                        
                        ${isDirectInquiry ? `DIRECT INQUIRY: You have been addressed directly. Give an unfiltered, independent take.` : ""}
                        ${index > 0 ? `PREVIOUS COMMENTS:\n${previousComments}\nTASK: Do NOT repeat what others said. Build upon it or challenge it.` : `TASK: One blunt, human sentence. No corporate slop.`}
                        
                        REASONING MODEL: ${logicType}
                        CONSTRAINT: Speak like you're in a Slack thread. Max 1-2 blunt sentences.
                    `;

                    const res = await safeCallGemini('gemini-2.5-flash', {
                        contents: [{ role: 'user', parts: [{ text: specPrompt }] }]
                    });

                    if (res.usageMetadata) {
                        await logApiUsageAsync(`/api/boardroom (${id})`, res.usageMetadata.promptTokenCount || 0, res.usageMetadata.candidatesTokenCount || 0);
                    }

                    const text = res.text || "Skipping.";
                    
                    // Handle [INVOKE:AgentName]
                    if (text.includes('[INVOKE:')) {
                        const invokedId = text.match(/\[INVOKE:(\w+)\]/)?.[1]?.toLowerCase();
                        const invokedAgent = AGENTS.find(a => a.id === invokedId);
                        if (invokedAgent) {
                            await writeStream('System', `PULLING CONTEXT: ${invokedAgent.name}`, 'action');
                            const invokePrompt = `${invokedAgent.persona}\nProvide context for: "${text}"\nBANNED SLOP: ${BANNED_SLOP}\nMax 1 sentence.`;
                            const invokeRes = await safeCallGemini('gemini-2.5-flash', {
                                contents: [{ role: 'user', parts: [{ text: invokePrompt }] }]
                            });
                            await writeStream(invokedAgent.name, invokeRes.text || "...", 'thought', invokedId);
                        }
                    }
                    
                    specialistInsights[id] = text;
                    await writeStream(agent.name, text, 'thought', id);
                }

                // --- PHASE 2: THE CRITIQUE (INTERNAL ONLY) ---
                await writeStream('System', 'DE-SLOPPING INTERNALLY...', 'action');
                const critics = ['surgeon', 'arbiter'];
                
                await Promise.all(critics.map(async (id) => {
                    const agent = AGENTS.find(a => a.id === id);
                    const contributions = JSON.stringify(specialistInsights);
                    const critiquePrompt = `
                        ${agent?.persona}
                        Review these contributions for "Disney-energy" or "Slop": ${contributions}
                        BANNED SLOP: ${BANNED_SLOP}
                        TASK: Internal critique. NO JARGON.
                    `;
                    const res = await safeCallGemini('gemini-2.5-flash', {
                        contents: [{ role: 'user', parts: [{ text: critiquePrompt }] }]
                    });
                }));

                // --- PHASE 3: THE PROBE ---
                await writeStream('System', 'PROBING FOR FACTS...', 'action');
                
                const isFollowUp = prompt.toLowerCase().includes("the answer is") || prompt.toLowerCase().includes("the fact is");
                
                const mdSynthesisPrompt = `
                    You are the Managing Director. A lead producer in a hurry.
                    Play: "${prompt}"
                    The noise from the team: ${JSON.stringify(specialistInsights)}
                    BANNED SLOP: ${BANNED_SLOP}
                    PROBE COUNT: ${probeCount}
                    FORCE RULING: ${finalForce}
                    
                    IS CRITICAL INFO MISSING? (Performance data, Time estimates, the Vibe).
                    If FORCE RULING is true or PROBE COUNT > 0, you MUST set "ready" to true.
                    
                    If MISSING and it's Turn 0 and NOT a follow-up:
                    - If binary (Yes/No), set "binary" to true and "clash" to the question.
                    - If open-ended (Runtime, Name, Number), set "binary" to false and "clash" to the concise question.
                    - If we have enough info, or Turn > 0, set "ready" to true.

                    Return ONLY JSON: { 
                        "ready": boolean, 
                        "binary": boolean,
                        "clash": "Concise fact-probe question (if ready is false)", 
                        "outcomes": ["If this hits: x", "If we fail: y", "The pivot: z"] 
                    }
                `;
                const mdRes = await safeCallGemini('gemini-2.5-flash', {
                    contents: [{ role: 'user', parts: [{ text: mdSynthesisPrompt }] }]
                });
                const mdText = mdRes.text || "{}";
                let mdData = { ready: true, binary: true, clash: "Continue?", outcomes: ["Analyzing..."] };
                try {
                    mdData = JSON.parse(mdText.replace(/```json|```/g, '').trim());
                } catch (e) {
                    mdData.clash = mdText;
                }
                
                // Enforce turn limit and force flag
                if (finalForce || probeCount > 0) mdData.ready = true;

                if (!mdData.ready && !isFollowUp) {
                    await writeStream('Managing Director', JSON.stringify({ clash: mdData.clash, binary: mdData.binary }), 'referee', 'md');
                    await writer.close();
                    return;
                }

                await writeStream('Managing Director', mdData.outcomes.join('\n'), 'thought', 'md');
                await writeStream('Managing Director', 'Got the data. Making the call.', 'thought', 'md');

                // --- PHASE 4: THE LORE ---
                await writeStream('System', 'LORE LOGGED.', 'action');
                const keeper = AGENTS.find(a => a.id === 'retention');
                const lorePrompt = `
                    ${keeper?.persona}
                    Extract the core hard fact or decision from this sequence regarding "${prompt}".
                    NO FLUFF.
                    Return ONLY JSON: { "entity": "Subject", "truth": "The hard fact" }
                `;
                const loreRes = await safeCallGemini('gemini-2.5-flash', {
                    contents: [{ role: 'user', parts: [{ text: lorePrompt }] }]
                });
                const loreText = loreRes.text || "{}";
                let loreData = { entity: "Session", truth: "Strategy updated." };
                try {
                    loreData = JSON.parse(loreText.replace(/```json|```/g, '').trim());
                } catch (e) {
                    console.error("Lore Parse Error:", e);
                }
                
                await saveHeartScaleNodeAsync({
                    id: crypto.randomUUID(),
                    entity: loreData.entity,
                    truth: loreData.truth,
                    updatedAt: new Date().toISOString()
                });

                // Final MD Ruling
                const finalPrompt = `
                    Managing Director. Final ruling for: "${prompt}".
                    BANNED SLOP: ${BANNED_SLOP}
                    FORMAT: Clean Markdown. No headers like "# STRATEGIC RULING". Just speak to me.
                    
                    Start with: "Alright, here's the move."
                    Then give a short, blunt paragraph on why.
                    Then give 3-Bullet "Immediate Moves".
                    
                    End with the 3 "Producer Instinct" outcomes from ${JSON.stringify(mdData.outcomes)}.
                `;
                // Final MD Ruling (Flash for RPM safety)
                const finalRes = await safeCallGemini('gemini-2.5-flash', {
                    contents: [{ role: 'user', parts: [{ text: finalPrompt }] }]
                });
                if (finalRes.usageMetadata) {
                    await logApiUsageAsync("/api/boardroom (Final Ruling)", finalRes.usageMetadata.promptTokenCount || 0, finalRes.usageMetadata.candidatesTokenCount || 0);
                }
                const finalBriefText = finalRes.text || "Strategy Brief preparation failed.";
                
                await saveBoardroomBriefAsync({
                    id: crypto.randomUUID(),
                    timestamp: new Date().toISOString(),
                    prompt,
                    brief: finalBriefText,
                    agents: triageData.selected
                });

                await writeStream('Managing Director', finalBriefText, 'brief', 'md');

            } catch (err: any) {
                console.error("Boardroom Error:", err);
                await writeStream('System', `Boardroom Error: ${err.message}`, 'action');
            } finally {
                await writer.close();
            }
        })();

        return new Response(stream.readable, {
            headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-cache' }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
