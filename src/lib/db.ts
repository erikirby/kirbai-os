import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (used in lib/db.ts which runs only on server)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

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

export interface RoadmapPhase {
    id: string;
    title: string;
    description: string;
    status: "Current Objective" | "Pending Trajectory" | "Completed" | "Archived";
}

export interface RoadmapTask {
    id: string;
    text: string;
    status: "todo" | "wip" | "done";
}

export interface Shot {
    id: string;
    timestamp: string;
    lyric?: string;
    visualDescription: string;
    personaCritiques?: {
        director?: string;
        strategist?: string;
    };
    bananaPrompt?: string;
    grokTrigger?: string;
    status: "draft" | "planned" | "rendereded" | "final";
}

export interface Mission {
    id: string;
    conceptId: string;
    title: string;
    alias: string;
    mode: "kirbai" | "factory";
    shots: Shot[];
    createdAt: string;
    updatedAt: string;
}

interface DatabaseSchema {
    metadataHistory: MetadataPack[];
    intelCache: IntelItem[];
    pokemonNews: any[];
    financeAnalysis: any | null;
    roadmap: {
        phases: RoadmapPhase[];
        tasks: RoadmapTask[];
    };
    missions: Mission[];
}

const DEFAULT_DB: DatabaseSchema = {
    metadataHistory: [],
    intelCache: [],
    pokemonNews: [],
    financeAnalysis: null,
    roadmap: { phases: [], tasks: [] },
    missions: []
};

// --- Generic persistence helpers ---
export async function getRow(key: string): Promise<any> {
    const { data } = await supabase
        .from('persistence')
        .select('value')
        .eq('key', key)
        .maybeSingle();
    return data?.value ?? null;
}

export async function setRow(key: string, value: any): Promise<void> {
    await supabase
        .from('persistence')
        .upsert({ key, value }, { onConflict: 'key' });
}

// --- DB helpers (async versions) ---

export async function getDbAsync(): Promise<DatabaseSchema> {
    const data = await getRow('main_db');
    if (!data) return DEFAULT_DB;
    if (!data.roadmap) data.roadmap = { phases: [], tasks: [] };
    return data;
}

export async function saveDbAsync(data: DatabaseSchema): Promise<void> {
    await setRow('main_db', data);
}

// Synchronous shims for compatibility with existing callers.
// These work by scheduling async operations in the background.
// For Vercel (stateless), the async versions are preferred.

export function getDb(): DatabaseSchema {
    // Return cached default; callers should migrate to getDbAsync
    return DEFAULT_DB;
}

export function saveDb(data: DatabaseSchema): void {
    // Fire and forget
    saveDbAsync(data).catch(console.error);
}

export async function addMetadataPackAsync(pack: MetadataPack) {
    const db = await getDbAsync();
    db.metadataHistory.unshift(pack);
    db.metadataHistory = db.metadataHistory.slice(0, 50);
    await saveDbAsync(db);
}

export function addMetadataPack(pack: MetadataPack) {
    addMetadataPackAsync(pack).catch(console.error);
}

export async function setIntelCacheAsync(items: IntelItem[]) {
    const db = await getDbAsync();
    db.intelCache = items;
    await saveDbAsync(db);
}

export function setIntelCache(items: IntelItem[]) {
    setIntelCacheAsync(items).catch(console.error);
}

export async function setFinanceAnalysisAsync(analysis: any) {
    const db = await getDbAsync();
    db.financeAnalysis = { ...analysis, persistedAt: new Date().toISOString() };
    await saveDbAsync(db);
}

export function setFinanceAnalysis(analysis: any) {
    setFinanceAnalysisAsync(analysis).catch(console.error);
}

export async function getFinanceAnalysisAsync() {
    const db = await getDbAsync();
    return db.financeAnalysis;
}

export function getFinanceAnalysis() {
    return null; // async callers use getFinanceAnalysisAsync
}

export async function saveRoadmapAsync(roadmapData: { phases: RoadmapPhase[], tasks: RoadmapTask[] }, mode?: string) {
    const key = mode === 'factory' ? 'roadmap_factory' : 'roadmap';
    await setRow(key, roadmapData);
}

export function saveRoadmap(roadmapData: { phases: RoadmapPhase[], tasks: RoadmapTask[] }) {
    saveRoadmapAsync(roadmapData).catch(console.error);
}

export async function getRoadmapAsync(mode?: string) {
    const key = mode === 'factory' ? 'roadmap_factory' : 'roadmap';
    const data = await getRow(key);
    return data ?? { phases: [], tasks: [] };
}

export function getRoadmap() {
    return { phases: [], tasks: [] }; // async callers use getRoadmapAsync
}

export async function saveMissionAsync(mission: Mission) {
    const mode = mission.mode;
    const key = mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
    let missions = await getRow(key) || [];
    const idx = missions.findIndex((m: any) => m.id === mission.id);
    if (idx !== -1) {
        missions[idx] = mission;
    } else {
        missions.unshift(mission);
    }
    await setRow(key, missions);
}

export async function getMissionsAsync(mode: string): Promise<Mission[]> {
    const key = mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
    return await getRow(key) || [];
}

// --- PULSE / ANALYTICS ---

export async function savePulseStateAsync(mode: string, state: any) {
    const key = mode === 'factory' ? 'pulse_state_factory' : 'pulse_state_kirbai';
    await setRow(key, state);
}

export async function getPulseStateAsync(mode: string) {
    const key = mode === 'factory' ? 'pulse_state_factory' : 'pulse_state_kirbai';
    return await getRow(key);
}

// --- TELEMETRY (stored in persistence table) ---

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

export async function getTelemetryAsync(): Promise<TelemetryData> {
    const data = await getRow('telemetry');
    return data ?? { lifetimeInputTokens: 0, lifetimeOutputTokens: 0, lifetimeCost: 0, logs: [] };
}

export function getTelemetry(): TelemetryData {
    return { lifetimeInputTokens: 0, lifetimeOutputTokens: 0, lifetimeCost: 0, logs: [] };
}

export async function saveTelemetryAsync(data: TelemetryData): Promise<void> {
    await setRow('telemetry', data);
}

export function saveTelemetry(data: TelemetryData) {
    saveTelemetryAsync(data).catch(console.error);
}

export async function logApiUsageAsync(route: string, inputTokens: number, outputTokens: number) {
    const tl = await getTelemetryAsync();
    const cost = (inputTokens / 1_000_000) * 0.10 + (outputTokens / 1_000_000) * 0.40;
    tl.lifetimeInputTokens += inputTokens;
    tl.lifetimeOutputTokens += outputTokens;
    tl.lifetimeCost += cost;
    tl.logs.unshift({ timestamp: Date.now(), route, inputTokens, outputTokens, estimatedCost: cost });
    tl.logs = tl.logs.slice(0, 100);
    await saveTelemetryAsync(tl);
}

export function logApiUsage(route: string, inputTokens: number, outputTokens: number) {
    logApiUsageAsync(route, inputTokens, outputTokens).catch(console.error);
}

export async function resetTelemetryAsync() {
    const initial = { lifetimeInputTokens: 0, lifetimeOutputTokens: 0, lifetimeCost: 0, logs: [] };
    await saveTelemetryAsync(initial);
    return initial;
}

export function resetTelemetry() {
    return resetTelemetryAsync().catch(console.error);
}
