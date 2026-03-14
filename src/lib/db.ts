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
        audience?: string;
    };
    bananaPrompt?: string;
    grokTrigger?: string;
    bananaPromptV2?: string;
    grokPromptV2?: string;
    refLabels?: string[]; // Array of reference labels
    isProduced?: boolean; // Progress tracking
    thumbnailUrl?: string; // Cache of the generated preview (Base64)
    upscaledUrl?: string; // High-res version
    lastGenerationPrompt?: string; // Snapshot for "Edit" context
    status: "draft" | "planned" | "rendered" | "final";
}

export interface Mission {
    id: string;
    conceptId: string;
    title: string;
    conceptDescription?: string;
    alias: string;
    mode: "kirbai" | "factory";
    targetRuntime?: string; // in seconds
    shots: Shot[];
    references?: string[]; // Array of Base64 strings (compressed)
    requiredReferences?: { 
        label: string; 
        description: string; 
        category: "Character" | "Location" | "Object";
        uploadedIndex?: number;
        manualCheck?: boolean; 
    }[]; 
    cameos?: string[];     
    createdAt: string;
    updatedAt: string;
}

export function slimMission(m: Mission): Mission {
    return {
        ...m,
        references: [], 
        shots: m.shots.map(s => ({ ...s, thumbnailUrl: undefined })) 
    };
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
    return null; // legacy synchronous call
}

export interface RoadmapData {
    phases: {
        id: string;
        title: string;
        description: string;
        status: "Current Objective" | "Pending Trajectory" | "Completed" | "Archived";
        tasks?: {
            id: string;
            title: string;
            description: string;
            status: "Todo" | "In Progress" | "Done";
            priority: "Low" | "Medium" | "High";
        }[];
    }[];
}

export async function saveRoadmapAsync(mode: string, roadmap: RoadmapData | { phases: RoadmapPhase[], tasks: RoadmapTask[] }) {
    const key = mode === 'factory' ? 'roadmap_factory' : 'roadmap_kirbai';
    await setRow(key, roadmap);
}

export function saveRoadmap(roadmapData: { phases: RoadmapPhase[], tasks: RoadmapTask[] }, mode: string = 'kirbai') {
    saveRoadmapAsync(mode, roadmapData).catch(console.error);
}

export async function getRoadmapAsync(mode: string): Promise<RoadmapData> {
    const key = mode === 'factory' ? 'roadmap_factory' : 'roadmap_kirbai';
    const data = await getRow(key);
    return data || { phases: [] };
}

export async function addRoadmapTaskAsync(mode: string, title: string, description: string) {
    const roadmap = await getRoadmapAsync(mode);
    const currentPhase = (roadmap.phases as any[]).find(p => p.status === 'Current Objective') || roadmap.phases[0];
    
    if (currentPhase) {
        if (!currentPhase.tasks) currentPhase.tasks = [];
        currentPhase.tasks.push({
            id: crypto.randomUUID(),
            title,
            description,
            status: 'Todo',
            priority: 'High'
        });
        await saveRoadmapAsync(mode, roadmap);
    }
}

export function getRoadmap() {
    return { phases: [], tasks: [] }; // async callers use getRoadmapAsync
}

export async function saveMissionAsync(mission: Mission) {
    const mode = mission.mode;
    const indexKey = mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
    const missionKey = `mission_${mission.id}`;

    // 1. Save Full record (The "Fat" one)
    await setRow(missionKey, mission);

    // 2. Update Index (The "Slim" one)
    let index = await getRow(indexKey) || [];
    const slimmed = slimMission(mission);
    const idx = index.findIndex((m: any) => m.id === mission.id);
    if (idx !== -1) {
        index[idx] = slimmed;
    } else {
        index.unshift(slimmed);
    }
    await setRow(indexKey, index);
}

export async function getMissionByIdAsync(id: string): Promise<Mission | null> {
    return await getRow(`mission_${id}`);
}

export async function getMissionsAsync(mode: string): Promise<Mission[]> {
    const key = mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
    return await getRow(key) || [];
}

export async function deleteMissionAsync(id: string) {
    const keys = ['missions_kirbai', 'missions_factory'];
    for (const key of keys) {
        let index = await getRow(key) || [];
        const filtered = index.filter((m: any) => m.id !== id);
        if (filtered.length !== index.length) {
            await setRow(key, filtered);
        }
    }
    // Delete the individual record
    await setRow(`mission_${id}`, null);
}

export async function backupMissionAsync(id: string) {
    const original = await getMissionByIdAsync(id);
    if (original) {
        await setRow(`mission_${id}_backup`, original);
    }
}

export async function restoreMissionFromBackupAsync(id: string) {
    const backup = await getRow(`mission_${id}_backup`);
    if (backup) {
        await saveMissionAsync(backup);
    }
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

// --- YOUTUBE STATS CACHE ---

export async function saveYouTubeStatsAsync(mode: string, stats: any[]) {
    const key = mode === 'factory' ? 'yt_stats_factory' : 'yt_stats_kirbai';
    const data = {
        stats,
        persistedAt: new Date().toISOString()
    };
    await setRow(key, data);
}

export async function getYouTubeStatsAsync(mode: string) {
    const key = mode === 'factory' ? 'yt_stats_factory' : 'yt_stats_kirbai';
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
    imageCount: number;
    lifetimeImageCost: number;
    logs: ApiLog[];
}

export async function getTelemetryAsync(): Promise<TelemetryData> {
    const data = await getRow('telemetry');
    return data ?? { 
        lifetimeInputTokens: 0, 
        lifetimeOutputTokens: 0, 
        lifetimeCost: 0, 
        imageCount: 0,
        lifetimeImageCost: 0,
        logs: [] 
    };
}

export function getTelemetry(): TelemetryData {
    return { 
        lifetimeInputTokens: 0, 
        lifetimeOutputTokens: 0, 
        lifetimeCost: 0, 
        imageCount: 0,
        lifetimeImageCost: 0,
        logs: [] 
    };
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

export async function logImageUsageAsync(count: number = 1, model: string = "nano-banana") {
    const tl = await getTelemetryAsync();
    const perImageCost = model.includes("pro") ? 0.09 : 0.045; // Defaulting to Nate Herk's mention for banana
    const cost = count * perImageCost;
    
    tl.imageCount = (tl.imageCount || 0) + count;
    tl.lifetimeImageCost = (tl.lifetimeImageCost || 0) + cost;
    tl.lifetimeCost += cost;
    
    tl.logs.unshift({ 
        timestamp: Date.now(), 
        route: `/image-gen/${model}`, 
        inputTokens: 0, 
        outputTokens: 0, 
        estimatedCost: cost 
    });
    tl.logs = tl.logs.slice(0, 100);
    await saveTelemetryAsync(tl);
}

export function logApiUsage(route: string, inputTokens: number, outputTokens: number) {
    logApiUsageAsync(route, inputTokens, outputTokens).catch(console.error);
}

export function logImageUsage(count: number = 1, model: string = "nano-banana") {
    logImageUsageAsync(count, model).catch(console.error);
}
export async function resetTelemetryAsync() {
    const initial = { 
        lifetimeInputTokens: 0, 
        lifetimeOutputTokens: 0, 
        lifetimeCost: 0, 
        imageCount: 0,
        lifetimeImageCost: 0,
        logs: [] 
    };
    await saveTelemetryAsync(initial);
    return initial;
}

export function resetTelemetry() {
    return resetTelemetryAsync().catch(console.error);
}

// --- MUSE ADVISORY SUITE ---

export interface MuseCard {
    id: string;
    type: 'content' | 'workflow' | 'monetization' | 'competitor' | 'mental_health';
    title: string;
    description: string;
    reason: string; // The "Scout" or "Strategist" justification
    source?: string; // e.g. "YouTube Trends", "Competitor X Analysis"
    status: 'pending' | 'yes' | 'no' | 'maybe';
    debateLog: string; // The transcript of the Symposium
    actionMatrix: {
        time: 'low' | 'med' | 'high';
        revenue: 'low' | 'med' | 'high';
        creativeValue: 'low' | 'med' | 'high';
    };
    createdAt: string;
}

export interface UserPsyche {
    mood: string;
    recentTriggers: string[];
    wins: string[];
    motivationLevel: number; // 0-100
    burnoutRisk: number; // 0-100
    notes: string[]; // Self-reflection from The Advocate
    updatedAt: string;
}

export async function saveMuseCardsAsync(cards: MuseCard[]) {
    await setRow('muse_cards', cards);
}

export async function getMuseCardsAsync(): Promise<MuseCard[]> {
    return await getRow('muse_cards') || [];
}

export async function saveUserPsycheAsync(psyche: UserPsyche) {
    await setRow('user_psyche', psyche);
}

export async function getUserPsycheAsync(): Promise<UserPsyche | null> {
    return await getRow('user_psyche');
}
