import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'persistence.json');

export interface MetadataPack {
    alias: string;
    keyword: string;
    titles: string[];
    descriptions: string[];
    tags: string[];
    timestamp: string;
}

export interface IntelItem {
    id: string;
    tag: string;
    date: string;
    title: string;
    summary: string;
    actionItems: string[];
    url: string;
}

interface DatabaseSchema {
    metadataHistory: MetadataPack[];
    intelCache: IntelItem[];
    pokemonNews: any[];
    financeAnalysis: any | null;
}

export function getDb(): DatabaseSchema {
    try {
        if (!fs.existsSync(DB_PATH)) {
            const initial: DatabaseSchema = { metadataHistory: [], intelCache: [], pokemonNews: [], financeAnalysis: null };
            saveDb(initial);
            return initial;
        }
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to read database:', error);
        return { metadataHistory: [], intelCache: [], pokemonNews: [], financeAnalysis: null };
    }
}

export function saveDb(data: DatabaseSchema) {
    try {
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Failed to save database:', error);
    }
}

export function addMetadataPack(pack: MetadataPack) {
    const db = getDb();
    db.metadataHistory.unshift(pack);
    // Keep last 50
    db.metadataHistory = db.metadataHistory.slice(0, 50);
    saveDb(db);
}

export function setIntelCache(items: IntelItem[]) {
    const db = getDb();
    db.intelCache = items;
    saveDb(db);
}

export function setFinanceAnalysis(analysis: any) {
    const db = getDb();
    db.financeAnalysis = {
        ...analysis,
        persistedAt: new Date().toISOString()
    };
    saveDb(db);
}

export function getFinanceAnalysis() {
    const db = getDb();
    return db.financeAnalysis;
}

// --- TELEMETRY SYSTEM ---
const TELEMETRY_PATH = path.join(process.cwd(), 'data', 'telemetry.json');

export interface ApiLog {
    timestamp: number;
    route: string;
    inputTokens: number;
    outputTokens: number;
    estimatedCost: number;
}

export interface TelemetryData {
    lifetimeInputTokens: number;
    lifetimeOutputTokens: number;
    lifetimeCost: number;
    logs: ApiLog[];
}

export function getTelemetry(): TelemetryData {
    try {
        if (!fs.existsSync(TELEMETRY_PATH)) {
            const initial = { lifetimeInputTokens: 0, lifetimeOutputTokens: 0, lifetimeCost: 0, logs: [] };
            saveTelemetry(initial);
            return initial;
        }
        const data = fs.readFileSync(TELEMETRY_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Failed to read telemetry:', error);
        return { lifetimeInputTokens: 0, lifetimeOutputTokens: 0, lifetimeCost: 0, logs: [] };
    }
}

export function saveTelemetry(data: TelemetryData) {
    try {
        const dir = path.dirname(TELEMETRY_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(TELEMETRY_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Failed to save telemetry:', error);
    }
}

export function logApiUsage(route: string, inputTokens: number, outputTokens: number) {
    const tl = getTelemetry();

    // Pricing for gemini-2.0-flash: $0.10/1M input, $0.40/1M output
    const cost = (inputTokens / 1000000) * 0.10 + (outputTokens / 1000000) * 0.40;

    tl.lifetimeInputTokens += inputTokens;
    tl.lifetimeOutputTokens += outputTokens;
    tl.lifetimeCost += cost;

    tl.logs.unshift({
        timestamp: Date.now(),
        route,
        inputTokens,
        outputTokens,
        estimatedCost: cost
    });

    // Keep last 100 logs
    tl.logs = tl.logs.slice(0, 100);

    saveTelemetry(tl);
}

export function resetTelemetry() {
    const initial = { lifetimeInputTokens: 0, lifetimeOutputTokens: 0, lifetimeCost: 0, logs: [] };
    saveTelemetry(initial);
    return initial;
}
