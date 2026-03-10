import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // In a real environment, we would use the Google Gen AI SDK here.
    // For this local build, we simulate the intelligent response based on the new deeper analytics.

    const mvp = data.platformsByRevenue?.[0];
    const highestRate = data.platforms?.[0];
    const topTrack = data.topTracks?.[0];

    // Format date ranges concisely
    const timingStrings = (data.reportTiming || []).map((t: any) =>
      `<span class="text-neutral-500">${t.store}:</span> ${t.minDate} ${t.minDate !== t.maxDate ? `→ ${t.maxDate}` : ''}`
    ).join('<br/>');

    const htmlAdvice = `
            <div class="flex flex-col gap-4 text-sm text-neutral-300 leading-relaxed">
                <p>
                    <strong class="text-accent uppercase tracking-wider text-xs">Volume Leader:</strong><br/> 
                    <span class="text-white">${mvp?.store || 'Unknown'}</span> is your MVP by total revenue, currently driving 
                    <span class="text-white font-mono">$${(mvp?.revenue || 0).toFixed(2)}</span>. 
                    However, your highest payout <em>rate per stream</em> comes from <span class="text-accent">${highestRate?.store || 'Unknown'}</span>. 
                    Consider driving high-intent fans to ${highestRate?.store || 'Unknown'} for premium purchases, while using ${mvp?.store || 'Unknown'} for algorithmic discovery.
                </p>
                <p>
                    <strong class="text-accent uppercase tracking-wider text-xs">Asset Performance:</strong><br/>
                    <span class="text-white font-medium">'${topTrack?.title || 'Unknown'}'</span> is carrying the portfolio with 
                    <span class="text-white font-mono">$${(topTrack?.revenue || 0).toFixed(2)}</span> in earnings. 
                    If this track is currently over-performing relative to its age, recommend doubling down on related AELOW keyword clusters immediately to capture secondary algorithmic waves.
                </p>
                <div class="bg-black/50 border border-border/50 p-3 rounded-sm mt-2">
                    <strong class="text-neutral-400 uppercase tracking-wider text-[10px] mb-2 block">Reporting Windows Detected</strong>
                    <div class="font-mono text-[10px] grid grid-cols-2 gap-x-4 gap-y-1">
                       ${timingStrings}
                    </div>
                </div>
            </div>
        `;

    return NextResponse.json({ advice: htmlAdvice });

  } catch (e: any) {
    console.error("API Error:", e);
    return NextResponse.json({ error: "Failed to process data", details: e.message }, { status: 500 });
  }
}
