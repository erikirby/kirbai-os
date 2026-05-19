import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Server-side Supabase client (used in lib/db.ts which runs only on server)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Switching to Service Role Key (secret) to bypass RLS internally while locking public access.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_build_key';

const supabase = createClient(supabaseUrl || 'https://dummy.supabase.co', supabaseKey);

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

export interface CompetitorProfile {
    id: string;
    name: string;
    platform: 'youtube' | 'instagram' | 'tiktok' | 'other';
    handleUrl: string;
    notes: string;
    createdAt: string;
}

export interface RoadmapTask {
    id: string;
    title: string;
    description: string;
    status: "Todo" | "In Progress" | "Done";
    priority: "Low" | "Medium" | "High";
}

export interface RoadmapPhase {
    id: string;
    title: string;
    description: string;
    status: "Current Objective" | "Pending Trajectory" | "Completed" | "Archived";
    tasks?: RoadmapTask[];
}

export interface RoadmapData {
    phases: RoadmapPhase[];
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
    shotCount?: number; // Metadata for slim index
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
        shots: [], // REMOVE shots from the index to prevent master-list bloat
        shotCount: m.shots.length // Preserve the count for the list view
    };
}

interface DatabaseSchema {
    metadataHistory: MetadataPack[];
    intelCache: IntelItem[];
    pokemonNews: any[];
    financeAnalysis: any | null;
    roadmap: RoadmapData;
    missions: Mission[];
}

const DEFAULT_DB: DatabaseSchema = {
    metadataHistory: [],
    intelCache: [],
    pokemonNews: [],
    financeAnalysis: null,
    roadmap: { phases: [] },
    missions: []
};

// --- Generic persistence helpers ---
export async function getRow(key: string): Promise<any> {
    const { data, error } = await supabase
        .from('persistence')
        .select('value')
        .eq('key', key)
        .maybeSingle();
    
    if (error) {
        console.error(`[Supabase Read Error] Key: ${key}:`, error);
        throw new Error(`Database connection failed: ${error.message}`);
    }
    return data?.value ?? null;
}

export async function setRow(key: string, value: any): Promise<void> {
    const json = JSON.stringify(value);
    const sizeKB = Math.round(json.length / 1024);
    
    // Safety Audit: Log large writes
    if (sizeKB > 500) {
        console.warn(`[Vault Warning] Large Write Detected! Key: ${key}, Size: ${sizeKB}KB`);
    } else {
        console.log(`[Vault Write] Key: ${key}, Size: ${sizeKB}KB`);
    }

    const { error } = await supabase
        .from('persistence')
        .upsert({ key, value }, { onConflict: 'key' });
    if (error) {
        console.error(`Supabase persistence Error [Key: ${key}] Size: ${sizeKB}KB:`, error);
        throw error; // Propagate for API Route 500s
    }
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

// NOTE: All synchronous shims have been removed in favor of async/await 
// to ensure consistency in serverless environments.

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

export async function getCompetitorsAsync(mode: string): Promise<CompetitorProfile[]> {
    const key = mode === 'factory' ? 'competitors_factory' : 'competitors_kirbai';
    return await getRow(key) || [];
}

export async function saveCompetitorsAsync(mode: string, competitors: CompetitorProfile[]) {
    const key = mode === 'factory' ? 'competitors_factory' : 'competitors_kirbai';
    await setRow(key, competitors);
}

export async function setFinanceAnalysisAsync(analysis: any) {
    const db = await getDbAsync();
    db.financeAnalysis = { ...analysis, persistedAt: new Date().toISOString() };
    await saveDbAsync(db);
}

export async function getFinanceAnalysisAsync() {
    const db = await getDbAsync();
    return db.financeAnalysis;
}

export async function saveRoadmapAsync(mode: string, roadmap: RoadmapData) {
    const key = mode === 'factory' ? 'roadmap_factory' : 'roadmap_kirbai';
    await setRow(key, roadmap);
}

export async function getRoadmapAsync(mode: string): Promise<RoadmapData> {
    const key = mode === 'factory' ? 'roadmap_factory' : 'roadmap_kirbai';
    const data = await getRow(key);
    return data || { phases: [] };
}

export async function addRoadmapTaskAsync(mode: string, title: string, description: string) {
    const roadmap = await getRoadmapAsync(mode);
    const phases = roadmap.phases || [];
    const currentPhase = phases.find(p => p.status === 'Current Objective') || phases[0];
    
    if (currentPhase) {
        if (!currentPhase.tasks) currentPhase.tasks = [];
        const taskId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `task_${Date.now()}`;
        currentPhase.tasks.push({
            id: taskId,
            title,
            description,
            status: 'Todo',
            priority: 'High'
        });
        await saveRoadmapAsync(mode, roadmap);
    }
}

export async function saveMissionAsync(mission: Mission) {
    const mode = mission.mode;
    const indexKey = mode === 'factory' ? 'missions_factory' : 'missions_kirbai';
    const missionId = mission.id;
    const missionKey = `mission_${missionId}`;

    // --- DEFRAGMENTATION ENGINE ---
    // Automatically extract large assets (references and thumbnails) if they are in Base64
    
    const v = Date.now();
    
    // 1. Process References
    if (mission.references && Array.isArray(mission.references)) {
        for (let i = 0; i < mission.references.length; i++) {
            const data = mission.references[i];
            if (data && data.startsWith('data:image')) {
                await saveMissionAssetAsync(missionId, 'reference', i.toString(), data);
                mission.references[i] = `/api/director/asset/${missionId}/reference/${i}?v=${v}`;
            }
        }
    }

    // 2. Process Shot Thumbnails
    if (mission.shots && Array.isArray(mission.shots)) {
        for (const shot of mission.shots) {
            if (shot.thumbnailUrl && shot.thumbnailUrl.startsWith('data:image')) {
                await saveMissionAssetAsync(missionId, 'shot', shot.id, shot.thumbnailUrl);
                shot.thumbnailUrl = `/api/director/asset/${missionId}/shot/${shot.id}?v=${v}`;
            }
        }
    }

    // 1. Save Full record (Now Slimmed by the Defragmentation Engine)
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

export async function saveMissionAssetAsync(missionId: string, type: 'reference' | 'shot', identifier: string, base64: string): Promise<void> {
    const assetKey = `asset_${missionId}_${type}_${identifier}`;
    await setRow(assetKey, base64);
}

export async function getMissionAssetAsync(missionId: string, type: 'reference' | 'shot', identifier: string): Promise<string | null> {
    const assetKey = `asset_${missionId}_${type}_${identifier}`;
    return await getRow(assetKey);
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

// --- DISTRO / DESCRIPTION GENERATOR SESSIONS ---

export async function saveDistroSessionAsync(mode: string, session: { messages: any[], platforms: any }) {
    const key = mode === 'factory' ? 'distro_session_factory' : 'distro_session_kirbai';
    await setRow(key, session);
}

export async function getDistroSessionAsync(mode: string) {
    const key = mode === 'factory' ? 'distro_session_factory' : 'distro_session_kirbai';
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

export async function saveTelemetryAsync(data: TelemetryData): Promise<void> {
    await setRow('telemetry', data);
}

export async function logApiUsageAsync(route: string, inputTokens: number, outputTokens: number) {
    try {
        const tl = await getTelemetryAsync();
        const cost = (inputTokens / 1_000_000) * 0.10 + (outputTokens / 1_000_000) * 0.40;
        tl.lifetimeInputTokens += inputTokens;
        tl.lifetimeOutputTokens += outputTokens;
        tl.lifetimeCost += cost;
        tl.logs = tl.logs || [];
        tl.logs.unshift({ timestamp: Date.now(), route, inputTokens, outputTokens, estimatedCost: cost });
        tl.logs = tl.logs.slice(0, 100);
        await saveTelemetryAsync(tl);
    } catch (error) {
        console.error("Failed to log API usage. Telemetry skipped.", error);
    }
}

export async function logImageUsageAsync(count: number = 1, model: string = "nano-banana") {
    try {
        const tl = await getTelemetryAsync();
        const perImageCost = model.includes("pro") ? 0.09 : 0.045; // Defaulting to Nate Herk's mention for banana
        const cost = count * perImageCost;
        
        tl.imageCount = (tl.imageCount || 0) + count;
        tl.lifetimeImageCost = (tl.lifetimeImageCost || 0) + cost;
        tl.lifetimeCost += cost;
        
        tl.logs = tl.logs || [];
        tl.logs.unshift({ 
            timestamp: Date.now(), 
            route: `/image-gen/${model}`, 
            inputTokens: 0, 
            outputTokens: 0, 
            estimatedCost: cost 
        });
        tl.logs = tl.logs.slice(0, 100);
        await saveTelemetryAsync(tl);
    } catch (error) {
        console.error("Failed to log Image usage. Telemetry skipped.", error);
    }
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

// --- BOARDROOM STRATEGIC ARCHIVE ---

export interface BoardroomBrief {
    id: string;
    timestamp: string;
    prompt: string;
    brief: string;
    agents: string[];
}

export async function saveBoardroomBriefAsync(brief: BoardroomBrief) {
    const history = await getBoardroomHistoryAsync();
    history.unshift(brief);
    await setRow('boardroom_history', history.slice(0, 50)); // Keep last 50 briefs
}

export async function getBoardroomHistoryAsync(): Promise<BoardroomBrief[]> {
    return await getRow('boardroom_history') || [];
}

// --- BOARDROOM 5.4: LAYER 2 MEMORY (AUDIT LEDGER) ---

export interface AuditLedgerEntry {
    id: string;
    timestamp: string;
    decision: string;
    context: string;
    type: 'fact' | 'decision';
}

export interface HeartScaleNode {
    id: string;
    entity: string; // e.g., "Pheromosa"
    truth: string; // e.g., "Is a Ditto"
    updatedAt: string;
}

export async function saveAuditLedgerEntryAsync(entry: AuditLedgerEntry) {
    const ledger = await getAuditLedgerAsync();
    ledger.unshift(entry);
    await setRow('audit_ledger', ledger.slice(0, 100));
}

export async function getAuditLedgerAsync(): Promise<AuditLedgerEntry[]> {
    return await getRow('audit_ledger') || [];
}

export async function saveHeartScaleNodeAsync(node: HeartScaleNode) {
    const nodes = await getHeartScaleDbAsync();
    const idx = nodes.findIndex(n => n.entity === node.entity);
    if (idx !== -1) nodes[idx] = node;
    else nodes.push(node);
    await setRow('heart_scale_db', nodes);
}

export async function getHeartScaleDbAsync(): Promise<HeartScaleNode[]> {
    return await getRow('heart_scale_db') || [];
}
