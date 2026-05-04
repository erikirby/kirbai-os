import { NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { setFinanceAnalysisAsync, getFinanceAnalysisAsync, logApiUsageAsync } from "@/lib/db";
import { safeCallGemini, callOpenRouter, callGroq } from "@/lib/intel";



export async function GET() {
    try {
        const stored = await getFinanceAnalysisAsync();
        return NextResponse.json({ analysis: stored });
    } catch (err: any) {
        return NextResponse.json({ error: "Failed to retrieve stored data" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { tsv, rawData } = body;
        const fileContent = rawData || tsv;

        if (!fileContent) {
            return NextResponse.json({ error: "No data provided." }, { status: 400 });
        }

        // Native TSV/CSV Parsing
        // Handle varying newline formats (\r\n, \n, \r)
        const lines = fileContent.split(/\r\n|\n|\r/).filter((line: string) => line.trim() !== '');

        if (lines.length < 2) {
            return NextResponse.json({ error: "Invalid format. Not enough rows." }, { status: 400 });
        }

        // Detect Delimiter (TSV vs CSV)
        const firstLine = lines[0];
        const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(',') ? ',' : '\t');

        function parseLine(line: string, delim: string) {
            if (delim !== ',') return line.split(delim);
            const cols = [];
            let inQuotes = false;
            let currentVal = '';
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    cols.push(currentVal.replace(/^"|"$/g, ''));
                    currentVal = '';
                } else {
                    currentVal += char;
                }
            }
            cols.push(currentVal.replace(/^"|"$/g, ''));
            return cols;
        }

        const headers = parseLine(firstLine, delimiter).map((h: string) => h.trim().toLowerCase());

        // DistroKid and other standard distributors often utilize these variations
        const storeIdx = headers.findIndex((h: string) => h === 'store' || h.includes('service') || h.includes('platform'));
        const titleIdx = headers.findIndex((h: string) => h === 'title' || h.includes('track') || h.includes('song'));
        const quantityIdx = headers.findIndex((h: string) => h === 'quantity' || h.includes('stream') || h.includes('play') || h === 'qty' || h.includes('count'));

        // Prioritize actual earnings columns and avoid 'withheld' or 'recoup'
        let earningsIdx = headers.findIndex((h: string) => h === 'earnings (usd)' || h === 'earnings');
        if (earningsIdx === -1) {
            earningsIdx = headers.findIndex((h: string) => (h.includes('earning') || h.includes('revenue') || h.includes('usd') || h.includes('amount') || h.includes('total') || h.includes('net')) && !h.includes('withheld') && !h.includes('recoup'));
        }

        // Latency Detection Headers
        const reportDateIdx = headers.findIndex((h: string) => h.includes('report') && h.includes('date'));
        const saleMonthIdx = headers.findIndex((h: string) => h === 'sale month' || h.includes('month'));

        if (storeIdx === -1 || titleIdx === -1 || quantityIdx === -1 || earningsIdx === -1) {
            console.error("Finance Analysis Missing Columns. Headers:", headers);
            return NextResponse.json({ error: `File missing core columns. Found: ${headers.slice(0, 8).join(', ')}...` }, { status: 400 });
        }

        let totalRevenue = 0;
        let totalStreams = 0;
        const platformMap = new Map<string, { streams: number, revenue: number, lastReportDate?: string, lastSaleMonth?: string }>();
        const trackMap = new Map<string, { streams: number, revenue: number }>();

        // Process data rows
        let parsedRows = 0;
        for (let i = 1; i < lines.length; i++) {
            const rowStr = lines[i];
            const cols = parseLine(rowStr, delimiter);

            // If the row is malformed and doesn't reach the needed columns, skip it
            if (cols.length <= Math.max(storeIdx, titleIdx, quantityIdx, earningsIdx)) continue;

            const store = cols[storeIdx]?.trim() || "Unknown Platform";
            const title = cols[titleIdx]?.trim() || "Unknown Track";

            // Quantity might have commas depending on formatting "10,000"
            const quantityStr = cols[quantityIdx]?.replace(/,/g, '') || "0";
            const quantity = parseInt(quantityStr, 10) || 0;

            // Earnings might be "$0.0053", strip everything except numbers, decmials, and negative signs
            let earningsStr = cols[earningsIdx]?.replace(/[^0-9.-]+/g, "") || "0";
            const earnings = parseFloat(earningsStr) || 0;

            // Distrokid sometimes adds summary rows at the bottom with empty titles. Skip if title is empty.
            if (!title) continue;

            parsedRows++;
            totalRevenue += earnings;
            totalStreams += quantity;

            // Platform aggregate
            const pData = platformMap.get(store) || { streams: 0, revenue: 0 };
            pData.streams += quantity;
            pData.revenue += earnings;

            // Track reporting dates for latency analysis
            if (reportDateIdx !== -1 && cols[reportDateIdx]) {
                const rowDate = cols[reportDateIdx].trim();
                if (!pData.lastReportDate || rowDate > pData.lastReportDate) pData.lastReportDate = rowDate;
            }
            if (saleMonthIdx !== -1 && cols[saleMonthIdx]) {
                const rowMonth = cols[saleMonthIdx].trim();
                if (!pData.lastSaleMonth || rowMonth > pData.lastSaleMonth) pData.lastSaleMonth = rowMonth;
            }

            platformMap.set(store, pData);

            // Track aggregate
            const tData = trackMap.get(title) || { streams: 0, revenue: 0 };
            tData.streams += quantity;
            tData.revenue += earnings;
            trackMap.set(title, tData);
        }

        console.log(`Parsed ${parsedRows} rows. Total Revenue: ${totalRevenue}, Total Streams: ${totalStreams}`);

        // Format for frontend requirement
        const platforms = Array.from(platformMap.entries()).map(([store, data]) => ({
            store,
            revenue: data.revenue,
            streams: data.streams,
            rate: data.streams > 0 ? data.revenue / data.streams : 0,
            reportingLatency: data.lastReportDate && data.lastSaleMonth ? {
                reportDate: data.lastReportDate,
                saleMonth: data.lastSaleMonth
            } : null
        })).sort((a, b) => b.revenue - a.revenue);

        const tracks = Array.from(trackMap.entries()).map(([title, data]) => ({
            title,
            revenue: data.revenue,
            streams: data.streams
        })).sort((a, b) => b.revenue - a.revenue);

        const analysisData = {
            totals: { revenue: totalRevenue, streams: totalStreams },
            platforms,
            tracks
        };

        // LLM Synthesis (Low Token Summarization)
        let adviceHtml = "<p>Data parsed. Awaiting strategic intelligence overlay...</p>";

        try {
            const summaryForLLM = JSON.stringify({
                current_date: new Date().toISOString().split('T')[0],
                total_revenue: totalRevenue.toFixed(2),
                total_streams: totalStreams,
                platforms: platforms.slice(0, 5), // Top 5 platforms with latency data
                top_tracks: tracks.slice(0, 3)
            }, null, 2);

            const prompt = `You are an elite music industry financial advisor for "Kirbai OS".
Analyze the following performance summary (Current Date: ${new Date().toISOString().split('T')[0]}):
${summaryForLLM}

Provide a "Tactical Intelligence Brief" based on this data. 
CRITICAL FORMATTING INSTRUCTIONS:
1. Use a bulleted list (<ul> and <li>). NO long paragraphs.
2. THE AUDIT TRAIL: For each major platform (Spotify, YouTube, etc.), explicitly state how current the data is based on the 'reportingLatency' field. 
   Example: "Spotify: Streams accounted for through [saleMonth] (reported on [reportDate]), indicating a [X]-month reporting lag."
3. DO NOT use my example dates. Use the ACTUAL dates found in the JSON. If a date is missing, say "unknown reporting window".
4. Identify which platforms have the most recent data (likely YouTube) vs the oldest (likely Spotify).
5. Explain that this reporting lag is why DistroKid numbers will always be lower than real-time dashboard apps.
6. Tone: Cybernetic, professional, concise.
7. Return ONLY the safe HTML fragment. NO markdown code blocks. NO TRIPLE BACKTICKS.`;

            let textResponse = "";
            try {
                const response = await safeCallGemini("gemini-2.5-flash", { contents: prompt });
                textResponse = typeof (response as any).text === 'function' ? (response as any).text() : response.text;
                if (response.usageMetadata) await logApiUsageAsync("/api/analyze-finance", response.usageMetadata.promptTokenCount || 0, response.usageMetadata.candidatesTokenCount || 0);
            } catch (geminiErr: any) {
                console.warn(`[analyze-finance] Gemini failed: ${geminiErr.message?.slice(0, 60)}`);
                try {
                    textResponse = await callOpenRouter(prompt, "", false);
                } catch (orErr: any) {
                    console.warn(`[analyze-finance] OpenRouter failed: ${orErr.message?.slice(0, 60)}`);
                    textResponse = await callGroq(prompt, "", false);
                }
            }

            if (!textResponse) throw new Error("AI returned empty content");

            adviceHtml = textResponse.replace(/\`\`\`(html)?/g, '').trim();

            const analysisWithAdvice = {
                ...analysisData,
                advice: adviceHtml
            };

            // PERSIST result for dashboard longevity
            await setFinanceAnalysisAsync(analysisWithAdvice);

            return NextResponse.json({
                analysis: analysisWithAdvice
            });
        } catch (llmErr: any) {
            console.error("LLM Analysis Failed:", llmErr);
            // Even if AI fails, return the raw data and persist what we have
            const fallback = { ...analysisData, advice: "<p>Strategic narrative generation failed. Raw metrics aggregated successfully.</p>" };
            await setFinanceAnalysisAsync(fallback);
            return NextResponse.json({
                analysis: fallback
            });
        }
    } catch (error: any) {
        console.error("Finance API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
