"use client";

import { useState, useEffect, useRef } from "react";
import { 
    Clapperboard, Play, Check, Copy, AlertCircle, Sparkles, Video,
    ChevronRight, MessageSquare, Download, Trash2, Loader2, RefreshCw,
    Camera, Users, Layout, Image as ImageIcon, Upload, X, Plus, Send
} from "lucide-react";

interface Shot {
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
    refLabels?: string[];
    isProduced?: boolean;
    thumbnailUrl?: string;
    upscaledUrl?: string;
    lastGenerationPrompt?: string;
    status: string;
}

interface Mission {
    id: string;
    conceptId: string;
    title: string;
    conceptDescription?: string;
    alias: string;
    mode: "kirbai" | "factory";
    targetRuntime?: string;
    shots: Shot[];
    references?: string[];
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

type TabType = "outline" | "references" | "cameos" | "blocking" | "frames";

export default function DirectorSuite({ mode }: { mode: "kirbai" | "factory" }) {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [activeMission, setActiveMission] = useState<Mission | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>("blocking");
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [targetingReqIdx, setTargetingReqIdx] = useState<number | null>(null);
    const [isAssetPromptLoading, setIsAssetPromptLoading] = useState<string | null>(null);
    const [generatingShotId, setGeneratingShotId] = useState<string | null>(null);
    const [generatingType, setGeneratingType] = useState<"new" | "edit" | null>(null);
    const [editingShotId, setEditingShotId] = useState<string | null>(null);
    const [addingRefCategory, setAddingRefCategory] = useState<string | null>(null);
    const [managingRefsShotId, setManagingRefsShotId] = useState<string | null>(null);
    const [newRefLabel, setNewRefLabel] = useState("");
    const [tempPrompt, setTempPrompt] = useState("");
    const [forgingVideoShotId, setForgingVideoShotId] = useState<string | null>(null);
    const [telemetry, setTelemetry] = useState<any>(null);
    const [costShieldOverridden, setCostShieldOverridden] = useState(false);
    const [editingRefLabel, setEditingRefLabel] = useState<string | null>(null);
    const [refTempDescription, setRefTempDescription] = useState("");
    const [isRegeneratingRef, setIsRegeneratingRef] = useState<string | null>(null);

    useEffect(() => {
        const fetchMissionsAndTelemetry = async () => {
            setIsLoading(true);
            try {
                const [mRes, tRes] = await Promise.all([
                    fetch(`/api/missions?mode=${mode}`),
                    fetch('/api/telemetry')
                ]);
                const mData = await mRes.json();
                const tData = await tRes.json();
                setMissions(mData.data || []);
                if (tData.success) setTelemetry(tData.data);
            } catch (e) {
                console.error("Fetch failed:", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMissionsAndTelemetry();
    }, [mode]);

    const refreshTelemetry = async () => {
        const res = await fetch('/api/telemetry');
        const data = await res.json();
        if (data.success) setTelemetry(data.data);
    };

    const getMonthlySpend = () => {
        if (!telemetry?.logs) return 0;
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
        return telemetry.logs
            .filter((l: any) => l.timestamp >= startOfMonth)
            .reduce((acc: number, l: any) => acc + (l.estimatedCost || 0), 0);
    };

    const monthlySpend = getMonthlySpend();
    const isOverBudget = monthlySpend > 10.00;

    const toggleReferenceManual = async (idx: number) => {
        if (!activeMission) return;
        const newReqs = [...(activeMission.requiredReferences || [])];
        newReqs[idx] = { ...newReqs[idx], manualCheck: !newReqs[idx].manualCheck };
        const updated = { ...activeMission, requiredReferences: newReqs };
        setActiveMission(updated);
        
        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const toggleShotProduced = async (shotId: string) => {
        if (!activeMission) return;
        const newShots = activeMission.shots.map(s => 
            s.id === shotId ? { ...s, isProduced: !s.isProduced } : s
        );
        const updated = { ...activeMission, shots: newShots };
        setActiveMission(updated);

        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const handleForgeVideoPrompt = async (shot: Shot) => {
        if (!activeMission || !shot.thumbnailUrl) return;
        setForgingVideoShotId(shot.id);
        try {
            const res = await fetch('/api/director/video-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    thumbnailUrl: shot.thumbnailUrl,
                    visualDescription: shot.visualDescription,
                    shotId: shot.id
                })
            });
            const data = await res.json();
            if (data.success) {
                const newShots = activeMission.shots.map(s => 
                    s.id === shot.id ? { ...s, grokPromptV2: data.prompt } : s
                );
                const updated = { ...activeMission, shots: newShots };
                setActiveMission(updated);
                
                await fetch('/api/missions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode, mission: updated })
                });
            } else {
                alert(data.error || "Failed to forge video prompt.");
            }
        } catch (e) {
            console.error(e);
            alert("Connection error: Could not reach Video Architect.");
        } finally {
            setForgingVideoShotId(null);
        }
    };

    const handleUploadShot = async (shotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeMission || !e.target.files?.[0]) return;
        
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            
            // Compression logic (simplified for shots, same as handleUploadReference but targeted)
            const img = new Image();
            img.src = base64;
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const max = 1024;
                if (width > max || height > max) {
                    if (width > height) {
                        height *= max / width;
                        width = max;
                    } else {
                        width *= max / height;
                        height = max;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const compressed = canvas.toDataURL('image/jpeg', 0.6); // Tightened for scanner cost efficiency

                const newShots = activeMission.shots.map(s => 
                    s.id === shotId ? { ...s, thumbnailUrl: compressed, lastGenerationPrompt: "Manual Upload (Photoshop/External)" } : s
                );
                const updated = { ...activeMission, shots: newShots };
                setActiveMission(updated);
                setMissions(prev => prev.map(m => m.id === updated.id ? updated : m));

                await fetch('/api/missions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode, mission: updated })
                });
            };
        };
        reader.readAsDataURL(file);
    };

    const handleClearShot = async (shotId: string) => {
        if (!activeMission) return;
        const newShots = activeMission.shots.map(s => 
            s.id === shotId ? { ...s, thumbnailUrl: undefined } : s
        );
        const updated = { ...activeMission, shots: newShots };
        setActiveMission(updated);
        setMissions(prev => prev.map(m => m.id === updated.id ? updated : m));

        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const handleGenerateImage = async (shot: Shot, isEdit: boolean = false) => {
        if (!activeMission) return;
        
        // Cost Shield Logic (Monthly $10)
        if (isOverBudget && !costShieldOverridden) {
            alert("⚠️ COST SHIELD ACTIVE: You have exceeded the monthly $10.00 budget. Please check the 'Unlock Over-Budget Generations' box in the API Health bar to continue.");
            return;
        }

        setGeneratingShotId(shot.id);
        setGeneratingType(isEdit ? "edit" : "new");
        try {
            // OPTIMIZATION: Strip out references that are NOT relevant to this shot to prevent Vercel 413 Payload Too Large
            const relevantRefIndices = new Set<number>();
            if (shot.refLabels) {
                shot.refLabels.forEach(label => {
                    const req = activeMission.requiredReferences?.find(r => r.label === label);
                    if (req && req.uploadedIndex !== undefined) relevantRefIndices.add(req.uploadedIndex);
                });
            }

            const optimizedMission = {
                ...activeMission,
                references: activeMission.references?.map((ref, i) => relevantRefIndices.has(i) ? ref : null)
            };

            const res = await fetch('/api/director/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mission: optimizedMission,
                    shot,
                    isEdit,
                    customPrompt: editingShotId === shot.id ? tempPrompt : (shot.bananaPromptV2 || shot.bananaPrompt)
                })
            });

            if (res.status === 413) {
                throw new Error("Payload too large. Try reducing the number of reference images.");
            }

            const data = await res.json();
            if (data.success) {
                const newShots = activeMission.shots.map(s => 
                    s.id === shot.id ? { 
                        ...s, 
                        thumbnailUrl: data.thumbnailUrl,
                        lastGenerationPrompt: data.prompt
                    } : s
                );
                const updated = { ...activeMission, shots: newShots };
                setActiveMission(updated);
                setMissions(prev => prev.map(m => m.id === updated.id ? updated : m));
                refreshTelemetry();
                
                await fetch('/api/missions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode, mission: updated })
                });
                
                setEditingShotId(null);
            } else {
                alert(data.error || "Nano Banana was unable to visualize this frame.");
            }
        } catch (e: any) {
            console.error("Generation failed:", e);
            alert("Connection error: Could not reach Nano Banana.");
        } finally {
            setGeneratingShotId(null);
            setGeneratingType(null);
        }
    };

    const handleAddCustomReference = async (category: string) => {
        if (!activeMission || !newRefLabel.trim()) return;
        
        const newReq = {
            label: newRefLabel.trim(),
            description: `Manual source for ${newRefLabel.trim()}`,
            category: category as "Character" | "Location" | "Object",
            manualCheck: false,
            isCustom: true
        };

        const updated = {
            ...activeMission,
            requiredReferences: [...(activeMission.requiredReferences || []), newReq]
        };

        setActiveMission(updated);
        setAddingRefCategory(null);
        setNewRefLabel("");

        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const deleteCustomReference = async (label: string) => {
        if (!activeMission) return;
        const updatedReqs = (activeMission.requiredReferences || []).filter(r => r.label !== label);
        const updated = { ...activeMission, requiredReferences: updatedReqs };
        setActiveMission(updated);
        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const clearReferenceImage = async (idx: number) => {
        if (!activeMission) return;
        const updatedReqs = [...(activeMission.requiredReferences || [])];
        if (updatedReqs[idx]) {
            updatedReqs[idx] = { ...updatedReqs[idx], uploadedIndex: undefined };
        }
        const updated = { ...activeMission, requiredReferences: updatedReqs };
        setActiveMission(updated);
        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const toggleRefForShot = async (shotId: string, label: string) => {
        if (!activeMission) return;
        const newShots = activeMission.shots.map(s => {
            if (s.id !== shotId) return s;
            const currentRefs = s.refLabels || [];
            const newRefs = currentRefs.includes(label)
                ? currentRefs.filter(l => l !== label)
                : [...currentRefs, label];
            return { ...s, refLabels: newRefs };
        });
        const updated = { ...activeMission, shots: newShots };
        setActiveMission(updated);

        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const getAssetPrompt = async (req: any, forShot: boolean = false, shotId: string | null = null) => {
        if (!activeMission) return;
        const loadingKey = shotId || req.label;
        setIsAssetPromptLoading(loadingKey);
        try {
            const resp = await fetch("/api/director/asset-prompt", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mission: activeMission, requirement: req })
            });
            const data = await resp.json();
            if (data.prompt) {
                if (forShot && shotId) {
                    setTempPrompt(data.prompt);
                } else if (editingRefLabel === req.label) {
                    return data.prompt;
                } else {
                    await navigator.clipboard.writeText(data.prompt);
                    setCopiedId(req.label);
                    setTimeout(() => setCopiedId(null), 2000);
                }
            }
        } catch (e) {
            console.error("Failed to generate asset prompt.", e);
        } finally {
            setIsAssetPromptLoading(null);
        }
    };

    const saveReferenceDescription = async (label: string) => {
        if (!activeMission) return;
        const updatedReqs = (activeMission.requiredReferences || []).map(r => 
            r.label === label ? { ...r, description: refTempDescription } : r
        );
        const updated = { ...activeMission, requiredReferences: updatedReqs };
        setActiveMission(updated);
        setEditingRefLabel(null);
        
        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const handleRegenerateReference = async (req: any) => {
        if (!activeMission) return;
        
        // Cost Shield Logic (Monthly $10)
        if (isOverBudget && !costShieldOverridden) {
            alert("⚠️ COST SHIELD ACTIVE: You have exceeded the monthly $10.00 budget. Please check the 'Unlock Over-Budget Generations' box in the API Health bar to continue.");
            return;
        }

        setIsRegeneratingRef(req.label);
        try {
            // 1. Get updated prompt from Asset Artist
            const prompt = await getAssetPrompt(req);
            if (!prompt) throw new Error("Could not forge vision prompt.");

            // 2. Generate image using Nano Banana
            // We create a pseudo-shot for the API
            const pseudoShot = {
                id: `ref-${req.label}`,
                visualDescription: req.description,
                bananaPrompt: prompt
            };

            // OPTIMIZATION: Only send the specific reference needed for regeneration
            const optimizedMission = {
                ...activeMission,
                references: activeMission.references?.map((ref, i) => i === req.uploadedIndex ? ref : null)
            };

            const res = await fetch('/api/director/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mission: optimizedMission,
                    shot: pseudoShot,
                    isEdit: false,
                    customPrompt: prompt
                })
            });

            if (res.status === 413) {
                throw new Error("Payload too large. The reference image might be too high resolution.");
            }

            const data = await res.json();
            if (data.success) {
                // 3. Update references array and mission mapping
                const updatedRefs = [...(activeMission.references || [])];
                let newIdx = req.uploadedIndex;

                if (newIdx !== undefined && newIdx < updatedRefs.length) {
                    updatedRefs[newIdx] = data.thumbnailUrl;
                } else {
                    updatedRefs.push(data.thumbnailUrl);
                    newIdx = updatedRefs.length - 1;
                }

                const updatedReqs = [...(activeMission.requiredReferences || [])].map(r => 
                    r.label === req.label ? { ...r, uploadedIndex: newIdx } : r
                );

                const updated = { 
                    ...activeMission, 
                    references: updatedRefs, 
                    requiredReferences: updatedReqs,
                    updatedAt: new Date().toISOString()
                };

                setActiveMission(updated);
                setMissions(prev => prev.map(m => m.id === updated.id ? updated : m));
                refreshTelemetry();

                await fetch('/api/missions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mode, mission: updated })
                });
                
                setEditingRefLabel(null);
            } else {
                alert(data.error || "Nano Banana failed to regenerate asset.");
            }
        } catch (e: any) {
            console.error("Reference regeneration failed:", e);
            alert(e.message || "Connection error: Could not reach AI Engine.");
        } finally {
            setIsRegeneratingRef(null);
        }
    };
    
    // Cameo state
    const [newCameo, setNewCameo] = useState("");
    
    // Smart Edit state
    const [instruction, setInstruction] = useState("");
    const [isEditing, setIsEditing] = useState(false);

    // Deletion & Editing state
    const [deletingMissionId, setDeletingMissionId] = useState<string | null>(null);
    const [isEditingOutline, setIsEditingOutline] = useState(false);
    const [outlineDraft, setOutlineDraft] = useState("");

    // File upload ref
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchMissions();
    }, [mode]);

    useEffect(() => {
        if (activeMission) {
            setOutlineDraft(activeMission.conceptDescription || "");
        }
    }, [activeMission]);

    const fetchMissions = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/missions?mode=${mode}`);
            const data = await res.json();
            if (data.success) {
                setMissions(data.data);
                if (data.data.length > 0 && !activeMission) {
                    setActiveMission(data.data[0]);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const deleteMission = async (id: string) => {
        try {
            const res = await fetch('/api/missions', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            if (res.ok) {
                setMissions(missions.filter(m => m.id !== id));
                if (activeMission?.id === id) setActiveMission(null);
                setDeletingMissionId(null);
            }
        } catch (error) {
            console.error("Delete failed:", error);
        }
    };

    const saveOutline = async () => {
        if (!activeMission) return;
        const updated = { ...activeMission, conceptDescription: outlineDraft };
        setActiveMission(updated);
        setIsEditingOutline(false);
        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const handleSmartEdit = async () => {
        if (!instruction.trim() || !activeMission) return;
        setIsEditing(true);
        try {
            const res = await fetch('/api/director/edit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instruction,
                    mission: activeMission
                })
            });
            const data = await res.json();
            if (data.success) {
                setActiveMission(data.mission);
                setMissions(prev => prev.map(m => m.id === data.mission.id ? data.mission : m));
                setInstruction("");
                setActiveTab("blocking");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsEditing(false);
        }
    };

    const compressImage = (base64Str: string): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% quality jpeg
            };
        });
    };

    const handleUploadReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeMission) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64Raw = event.target?.result as string;
            const compressed = await compressImage(base64Raw);
            
            const updatedRefs = [...(activeMission.references || []), compressed];
            const newIndex = updatedRefs.length - 1;
            
            // Auto-assign to the targeted req slot OR the first empty one
            const updatedReqs = [...((activeMission as any).requiredReferences || [])];
            
            if (targetingReqIdx !== null && updatedReqs[targetingReqIdx]) {
                updatedReqs[targetingReqIdx].uploadedIndex = newIndex;
            }

            const updatedMission = {
                ...activeMission,
                references: updatedRefs,
                requiredReferences: updatedReqs,
                updatedAt: new Date().toISOString()
            };
            
            // Save immediately
            await fetch('/api/missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, mission: updatedMission })
            });
            
            setActiveMission(updatedMission);
            setMissions(prev => prev.map(m => m.id === updatedMission.id ? updatedMission : m));
            setTargetingReqIdx(null); // Clear targeting state
        };
        reader.readAsDataURL(file);
    };

    const removeReference = async (idx: number) => {
        if (!activeMission) return;
        
        const updatedRefs = (activeMission.references || []).filter((_, i) => i !== idx);
        
        // Clear requirements that were mapped to this index
        const updatedReqs = ((activeMission as any).requiredReferences || []).map((r: any) => {
            if (r.uploadedIndex === idx) return { ...r, uploadedIndex: undefined };
            // Shift down any indices that were after this one
            if (r.uploadedIndex !== undefined && r.uploadedIndex > idx) {
                return { ...r, uploadedIndex: r.uploadedIndex - 1 };
            }
            return r;
        });

        const updated = {
            ...activeMission,
            references: updatedRefs,
            requiredReferences: updatedReqs,
            updatedAt: new Date().toISOString()
        };

        setActiveMission(updated);
        setMissions(prev => prev.map(m => m.id === updated.id ? updated : m));

        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const addCameo = async () => {
        if (!newCameo.trim() || !activeMission) return;
        const updated = {
            ...activeMission,
            cameos: [...(activeMission.cameos || []), newCameo.trim()]
        };
        setActiveMission(updated);
        setNewCameo("");
        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const removeCameo = async (idx: number) => {
        if (!activeMission) return;
        const updated = {
            ...activeMission,
            cameos: (activeMission.cameos || []).filter((_, i) => i !== idx)
        };
        setActiveMission(updated);
        await fetch('/api/missions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, mission: updated })
        });
    };

    const regenerateVision = async () => {
        if (!activeMission) return;

        // Safety Shield: Check if assets/work exists
        const hasWork = activeMission.shots.some(s => s.thumbnailUrl) || activeMission.references?.length;
        if (hasWork) {
            const confirmed = window.confirm("⚠️ DESTRUCTIVE: This will replace your current storyboard and regenerate all vision prompts based on the latest references. Manual edits to frame prompts will be lost. Are you sure?");
            if (!confirmed) return;
        }

        setIsRegenerating(true);
        try {
            const res = await fetch('/api/director/plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    concept: { 
                        id: activeMission.conceptId, 
                        title: activeMission.title, 
                        description: activeMission.conceptDescription || "" 
                    },
                    lyrics: activeMission.shots.map(s => s.lyric).filter(Boolean).join("\n") || "No lyrics provided.",
                    mode: activeMission.mode,
                    alias: activeMission.alias,
                    references: activeMission.references,
                    cameos: activeMission.cameos,
                    targetRuntime: (activeMission as any).targetRuntime
                })
            });
            const data = await res.json();
            if (data.success) {
                setActiveMission(data.mission);
                setMissions(prev => prev.map(m => m.id === activeMission.id ? data.mission : m));
                setActiveTab("blocking");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleCloneMission = async () => {
        if (!activeMission) return;
        
        setIsRegenerating(true); // Re-using loading state for feedback
        try {
            const clonedMission = {
                ...activeMission,
                id: `m-${Math.random().toString(36).substr(2, 9)}`,
                title: `${activeMission.title} (Copy)`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const res = await fetch('/api/missions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, mission: clonedMission })
            });

            if (res.ok) {
                setMissions(prev => [clonedMission, ...prev]);
                setActiveMission(clonedMission);
                setActiveTab("blocking");
            }
        } catch (e) {
            console.error("Cloning failed:", e);
        } finally {
            setIsRegenerating(false);
        }
    };

    const copyPrompt = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center py-40 gap-6">
            <Loader2 className="w-12 h-12 animate-spin text-accent" />
            <span className="text-[11px] font-black text-accent uppercase tracking-[0.6em] animate-pulse">Initializing Studio</span>
        </div>
    );

    return (
        <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* API Health / Cost Shield Bar */}
            <div className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between p-4 bg-black/40 border border-white/5 rounded-3xl backdrop-blur-xl">
                <div className="flex items-center gap-6">
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-accent uppercase tracking-widest">Monthly Spend</span>
                        <span className={`text-sm font-mono font-black ${isOverBudget ? 'text-red-400 animate-pulse' : 'text-foreground'}`}>
                            ${monthlySpend.toFixed(2)}
                        </span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col gap-0.5">
                        <span className="text-[8px] font-black text-accent uppercase tracking-widest">Session Logic</span>
                        <span className="text-xs font-bold text-green-400 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            Nano Banana Online
                        </span>
                    </div>
                    {telemetry && (
                        <>
                            <div className="w-px h-8 bg-white/5" />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] font-black text-accent uppercase tracking-widest">Est. Trial Used</span>
                                <span className="text-xs font-bold text-foreground/60">
                                    ${(telemetry.lifetimeCost || 0).toFixed(2)} / $300
                                </span>
                            </div>
                        </>
                    )}
                </div>

                {isOverBudget && (
                    <div className="flex items-center gap-3 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in zoom-in">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-tight">Monthly Limit Reached</span>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={costShieldOverridden} 
                                onChange={e => setCostShieldOverridden(e.target.checked)}
                                className="w-4 h-4 rounded border-red-500/40 bg-black/40 text-red-500 focus:ring-red-500 focus:ring-offset-0 transition-all cursor-pointer"
                            />
                            <span className="text-[9px] font-bold text-foreground/40 group-hover:text-foreground transition-colors uppercase">Unlock Over-Budget</span>
                        </label>
                    </div>
                )}
            </div>
            {/* Header Area: Synchronized with 4-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6 items-end">
                <div className="lg:col-span-1 flex flex-col gap-1 ml-1">
                    <h2 className="text-2xl font-black tracking-tighter text-foreground uppercase leading-tight">The Director's Suite</h2>
                    <p className="text-[10px] text-foreground/60 uppercase tracking-[0.4em] font-black">Multi-Agent Narrative Planning</p>
                </div>
                
                <div className="lg:col-span-3">
                    {activeMission && (
                        <div className="px-6 py-2 bg-accent/5 border border-accent/20 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-2 duration-500">
                            <Sparkles className="w-5 h-5 text-accent animate-pulse" />
                            <input 
                                value={instruction}
                                onChange={e => setInstruction(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSmartEdit()}
                                placeholder="Ask AI to make changes (e.g. 'Add 3 cameos', 'Make the end dramatic')"
                                className="flex-1 bg-transparent border-none text-sm font-bold text-white focus:outline-none placeholder:text-foreground/30"
                            />
                            <button 
                                onClick={handleSmartEdit}
                                disabled={isEditing || !instruction.trim()}
                                className="px-4 py-2 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isEditing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                Ask AI
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Missions Sidebar */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2">Live Missions</h3>
                    {missions.length === 0 ? (
                        <div className="p-8 border border-dashed border-border/20 rounded-3xl text-center">
                            <p className="text-[10px] uppercase font-black text-foreground/20 leading-loose">No active missions.<br/>Promote a concept from the Creative Hub to begin.</p>
                        </div>
                    ) : (
                        missions.map(m => (
                            <div key={m.id} className="relative group">
                                <button
                                    onClick={() => { setActiveMission(m); setActiveTab("blocking"); }}
                                    className={`w-full p-4 rounded-2xl border transition-all text-left flex flex-col gap-2 ${activeMission?.id === m.id ? 'bg-accent/10 border-accent/40 shadow-lg' : 'bg-surface/30 border-border/10 hover:border-accent/20'}`}
                                >
                                    <span className={`text-[9px] font-black uppercase tracking-widest ${activeMission?.id === m.id ? 'text-accent' : 'text-foreground/40'}`}>{m.alias}</span>
                                    <span className="text-xs font-bold truncate pr-6">{m.title}</span>
                                    <span className="text-[9px] font-mono text-foreground/30 uppercase">{m.shots.length} SHOTS</span>
                                </button>
                                
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    {deletingMissionId === m.id ? (
                                        <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2">
                                            <button 
                                                onClick={() => deleteMission(m.id)}
                                                className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow-xl"
                                                title="Confirm Delete"
                                            >
                                                <Check className="w-3 h-3" />
                                            </button>
                                            <button 
                                                onClick={() => setDeletingMissionId(null)}
                                                className="p-1.5 bg-surface border border-border/20 text-foreground/40 rounded-lg hover:text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setDeletingMissionId(m.id); }}
                                            className="p-1.5 bg-red-500/10 text-red-500/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Main Workshop Area */}
                <div className="lg:col-span-3 flex flex-col gap-2">
                    {!activeMission ? (
                        <div className="flex-1 bg-surface/20 border border-border/5 rounded-[40px] p-20 flex flex-col items-center justify-center text-center gap-6">
                            <Clapperboard className="w-16 h-16 text-foreground/5 opacity-20" />
                            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-foreground/20">Select a mission to view the matrix</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">

                            {/* Mission Header */}
                            <div className="p-6 bg-surface/40 border border-border/10 rounded-[40px] flex flex-col gap-4 glass">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mobile-stack-header">
                                    <div className="flex items-center gap-4 sm:gap-6">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl bg-accent/20 flex items-center justify-center border border-accent/20 shadow-inner shrink-0">
                                            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-accent fill-accent" />
                                        </div>
                                        <div className="flex flex-col gap-0.5 sm:gap-1">
                                            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight max-w-[200px] sm:max-w-none">{activeMission.title}</h3>
                                            <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-foreground/40">
                                                <span className="text-accent underline shrink-0">Active Mission</span>
                                                <span className="shrink-0">•</span>
                                                <span className="font-mono truncate">{activeMission.id}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Mission Controls */}
                                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 w-full lg:w-auto">
                                        <button 
                                            onClick={handleCloneMission}
                                            disabled={isRegenerating}
                                            title="Branch/Clone Mission (Save progress and experiment)"
                                            className="w-full lg:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-accent/60 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 hover:text-accent transition-all disabled:opacity-50"
                                        >
                                            <Copy className="w-3 h-3" />
                                            Clone
                                        </button>
                                        <div className="flex flex-col items-start lg:items-end gap-1 w-full lg:w-auto">
                                            <button 
                                                onClick={regenerateVision}
                                                disabled={isRegenerating}
                                                title="Regenerate all shots based on latest refs/cameos"
                                                className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-accent/10 border border-accent/20 text-accent rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-accent hover:text-white transition-all disabled:opacity-50"
                                            >
                                                {isRegenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                {isRegenerating ? "Syncing" : "Regenerate Vision"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Tab Navigation */}
                                <div className="tabs-container pb-2">
                                    <div className="flex items-center bg-black/20 p-1 rounded-2xl border border-white/5 w-fit">
                                        <button 
                                            onClick={() => setActiveTab("outline")}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'outline' ? 'bg-accent text-white' : 'text-foreground/40 hover:text-white'}`}
                                        >
                                            <Sparkles className="w-3 h-3" /> Outline
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab("references")}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'references' ? 'bg-accent text-white' : 'text-foreground/40 hover:text-white'}`}
                                        >
                                            <Camera className="w-3 h-3" /> Refs
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab("cameos")}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'cameos' ? 'bg-accent text-white' : 'text-foreground/40 hover:text-white'}`}
                                        >
                                            <Users className="w-3 h-3" /> Cameos
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab("blocking")}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'blocking' ? 'bg-accent text-white' : 'text-foreground/40 hover:text-white'}`}
                                        >
                                            <Layout className="w-3 h-3" /> Blocking
                                        </button>
                                        <button 
                                            onClick={() => setActiveTab("frames")}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 ${activeTab === 'frames' ? 'bg-accent text-white' : 'text-foreground/40 hover:text-white'}`}
                                        >
                                            <ImageIcon className="w-3 h-3" /> Frames
                                        </button>
                                    </div>
                                </div>
                            </div>

                             {/* Tab Content */}
                            <div className="bg-surface/20 border border-border/10 rounded-[40px] overflow-hidden p-6 min-h-[400px]">
                                {activeTab === "outline" && (
                                    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-sm font-black uppercase tracking-widest">Mission Outline</h4>
                                                <p className="text-[10px] text-foreground/40 uppercase">Broad strokes vision exported from the Brainstorm phase</p>
                                            </div>
                                            {!isEditingOutline ? (
                                                <button 
                                                    onClick={() => setIsEditingOutline(true)}
                                                    className="p-2 bg-white/5 border border-white/10 rounded-xl text-foreground/40 hover:text-accent transition-all"
                                                >
                                                    <Layout className="w-4 h-4" /> {/* Pencil icon replacement if needed, but Layout works for block editing */}
                                                </button>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={saveOutline}
                                                        className="px-4 py-2 bg-accent text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all"
                                                    >
                                                        Save
                                                    </button>
                                                    <button 
                                                        onClick={() => setIsEditingOutline(false)}
                                                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {isEditingOutline ? (
                                            <textarea 
                                                value={outlineDraft}
                                                onChange={e => setOutlineDraft(e.target.value)}
                                                className="w-full h-64 p-8 bg-black/40 border border-accent/20 rounded-[32px] font-medium text-sm text-foreground/80 leading-relaxed focus:outline-none focus:border-accent transition-all resize-none"
                                            />
                                        ) : (
                                            <div className="p-8 bg-black/40 border border-white/5 rounded-[32px] font-medium text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap max-w-4xl">
                                                {activeMission.conceptDescription || "No concept description available."}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {activeTab === "references" && (
                                    <div className="flex flex-col gap-10 animate-in fade-in duration-300">
                                        {/* Visual Requirements Section (Categorized) */}
                                        {(activeMission.requiredReferences || []).length > 0 && (
                                            <div className="flex flex-col gap-8">
                                                {["Character", "Location", "Object"].map(category => {
                                                    const filtered = (activeMission.requiredReferences || []).filter(r => r.category === category);
                                                    if (filtered.length === 0) return null;
                                                    
                                                    return (
                                                        <div key={category} className="flex flex-col gap-4">
                                                                 <div className="flex items-center justify-between border-l-2 border-accent/20 pl-4">
                                                                    <div>
                                                                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-accent/60">{category} Sources</h4>
                                                                        <p className="text-[8px] text-foreground/30 uppercase font-bold tracking-widest">Mandatory visual data for {category.toLowerCase()} consistency</p>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => setAddingRefCategory(category)}
                                                                        className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-accent/60 hover:text-accent transition-all"
                                                                    >
                                                                        <Plus className="w-3 h-3" /> Add Source
                                                                    </button>
                                                                 </div>
                                                                 
                                                                 {addingRefCategory === category && (
                                                                     <div className="p-4 bg-accent/5 border border-dashed border-accent/20 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                                                                         <input 
                                                                             value={newRefLabel}
                                                                             onChange={e => setNewRefLabel(e.target.value)}
                                                                             placeholder="e.g. Pheromosa High-Def"
                                                                             className="flex-1 bg-black/40 border border-accent/20 rounded-xl px-4 py-2 text-[10px] font-mono text-white focus:outline-none"
                                                                             autoFocus
                                                                             onKeyDown={e => e.key === 'Enter' && handleAddCustomReference(category)}
                                                                         />
                                                                         <button 
                                                                             onClick={() => handleAddCustomReference(category)}
                                                                             className="px-4 py-2 bg-accent text-white rounded-xl text-[9px] font-black uppercase"
                                                                         >
                                                                             Add
                                                                         </button>
                                                                         <button 
                                                                             onClick={() => setAddingRefCategory(null)}
                                                                             className="p-2 hover:bg-white/5 rounded-xl text-foreground/20"
                                                                         >
                                                                             <X className="w-4 h-4" />
                                                                         </button>
                                                                     </div>
                                                                 )}
                                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                {filtered.map((req) => {
                                                                    // Find actual index in original array
                                                                    const originalIdx = (activeMission.requiredReferences || []).findIndex(r => r.label === req.label);
                                                                    
                                                                    return (
                                                                        <div key={req.label} className={`p-4 rounded-2xl flex flex-col gap-3 group transition-all border ${req.manualCheck || req.uploadedIndex !== undefined ? 'bg-accent/10 border-accent/40 shadow-[0_0_20px_rgba(255,51,102,0.1)]' : 'bg-accent/5 border-accent/20 hover:bg-accent/8'}`}>
                                                                            <div className="flex justify-between items-start">
                                                                                <div className="flex items-center gap-2">
                                                                                    <button 
                                                                                        onClick={() => toggleReferenceManual(originalIdx)}
                                                                                        className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${req.manualCheck ? 'bg-accent border-accent text-white' : 'border-accent/40 hover:border-accent'}`}
                                                                                    >
                                                                                        {req.manualCheck && <Check className="w-3 h-3" />}
                                                                                    </button>
                                                                                    <span className="text-[10px] font-black uppercase tracking-tighter text-accent">{req.label}</span>
                                                                                </div>
                                                                                <div className="flex items-center gap-2">
                                                                                    {editingRefLabel !== req.label && (
                                                                                        <button 
                                                                                            onClick={() => {
                                                                                                setEditingRefLabel(req.label);
                                                                                                setRefTempDescription(req.description);
                                                                                            }}
                                                                                            className="p-1.5 hover:bg-white/5 rounded-lg text-foreground/20 hover:text-accent transition-all"
                                                                                            title="Edit Description"
                                                                                        >
                                                                                            <Layout className="w-3 h-3" />
                                                                                        </button>
                                                                                    )}
                                                                                    {req.uploadedIndex !== undefined ? (
                                                                                     <div className="flex items-center gap-2">
                                                                                         <div className="w-8 h-8 rounded-lg border border-green-500/30 overflow-hidden shadow-lg shadow-green-500/10 shrink-0">
                                                                                             <img src={activeMission.references?.[req.uploadedIndex]} className="w-full h-full object-cover" alt="" />
                                                                                         </div>
                                                                                         <div className="px-2 py-0.5 bg-green-500/20 text-green-400 text-[8px] font-black uppercase rounded-md border border-green-500/20 whitespace-nowrap">Linked</div>
                                                                                         <button 
                                                                                            onClick={() => clearReferenceImage(originalIdx)}
                                                                                            className="p-1.5 hover:bg-white/5 rounded-lg text-foreground/20 hover:text-accent transition-all"
                                                                                            title="Clear Reference Image"
                                                                                         >
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                         </button>
                                                                                     </div>
                                                                                 ) : (
                                                                                    <button 
                                                                                        onClick={() => {
                                                                                            setTargetingReqIdx(originalIdx);
                                                                                            fileInputRef.current?.click();
                                                                                        }}
                                                                                        className="px-2 py-0.5 bg-accent/20 text-accent text-[8px] font-black uppercase rounded-md border border-accent/20 hover:bg-accent hover:text-white transition-all shadow-lg"
                                                                                    >
                                                                                        Upload
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                            {editingRefLabel === req.label ? (
                                                                                <div className="flex flex-col gap-2 animate-in fade-in duration-200">
                                                                                    <textarea 
                                                                                        value={refTempDescription}
                                                                                        onChange={e => setRefTempDescription(e.target.value)}
                                                                                        className="w-full h-20 p-3 bg-black/40 border border-accent/40 rounded-xl font-medium text-[10px] text-foreground/80 leading-relaxed focus:outline-none focus:border-accent transition-all resize-none"
                                                                                        autoFocus
                                                                                    />
                                                                                    <div className="flex gap-2">
                                                                                        <button 
                                                                                            onClick={() => handleRegenerateReference(req)}
                                                                                            disabled={isRegeneratingRef === req.label}
                                                                                            className="flex-1 px-3 py-1.5 bg-accent text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-accent/80 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                                                        >
                                                                                            {isRegeneratingRef === req.label ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                                                                                            Regenerate Image
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={() => saveReferenceDescription(req.label)}
                                                                                            className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                                                                                        >
                                                                                            Save Only
                                                                                        </button>
                                                                                        <button 
                                                                                            onClick={() => setEditingRefLabel(null)}
                                                                                            className="px-3 py-1.5 bg-white/5 text-foreground/40 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                                                                        >
                                                                                            Cancel
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ) : (
                                                                                <p className="text-[10px] text-foreground/60 leading-relaxed font-medium line-clamp-2">{req.description}</p>
                                                                            )}
                                                                            
                                                                            <div className="mt-auto flex gap-2">
                                                                                 <button 
                                                                                     onClick={() => getAssetPrompt(req)}
                                                                                     disabled={isAssetPromptLoading === req.label}
                                                                                     className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 ${copiedId === req.label ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-black/40 border border-white/5 text-foreground/40 hover:text-accent hover:border-accent/20'}`}
                                                                                 >
                                                                                     {isAssetPromptLoading === req.label ? <Loader2 className="w-3 h-3 animate-spin" /> : (copiedId === req.label ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3 text-accent" />)}
                                                                                     {isAssetPromptLoading === req.label ? "Forging..." : (copiedId === req.label ? "Copied" : "Get Prompt help")}
                                                                                 </button>
                                                                                {(req as any).isCustom && (
                                                                                    <button 
                                                                                        onClick={() => deleteCustomReference(req.label)}
                                                                                        className="p-2 bg-black/40 border border-white/5 rounded-xl text-foreground/20 hover:text-red-400 hover:border-red-400/20 transition-all"
                                                                                        title="Delete Custom Source"
                                                                                    >
                                                                                        <X className="w-3 h-3" />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        <div className="flex justify-between items-center bg-black/40 border border-white/5 p-6 rounded-3xl">
                                            <div className="flex flex-col gap-1">
                                                <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80">Reference Library</h4>
                                                <p className="text-[10px] text-foreground/40 uppercase">Assets linked to requirements above</p>
                                            </div>
                                            <input type="file" ref={fileInputRef} onChange={handleUploadReference} className="hidden" accept="image/*" />
                                        </div>
 
                                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                            {(activeMission.references || []).map((ref, i) => (
                                                <div key={i} className="relative group aspect-[3/4] rounded-2xl overflow-hidden border border-white/5 bg-black/20 shadow-2xl">
                                                    <img src={ref} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center">
                                                        <span className="text-[8px] font-black uppercase text-white/60">Source #{i+1}</span>
                                                        <button 
                                                            onClick={() => removeReference(i)}
                                                            className="p-1.5 bg-red-500 text-white rounded-lg shadow-xl hover:bg-red-600"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            <button 
                                                onClick={() => fileInputRef.current?.click()}
                                                className="aspect-[3/4] rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3 text-foreground/20 hover:text-accent hover:border-accent/40 transition-all bg-white/2 hover:bg-accent/5"
                                            >
                                                <Plus className="w-6 h-6" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">New Reference</span>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "cameos" && (
                                    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                                        <div className="flex flex-col gap-1">
                                            <h4 className="text-sm font-black uppercase tracking-widest">Secondary Cast (Cameos)</h4>
                                            <p className="text-[10px] text-foreground/40 uppercase">Supporting Pokemon appearing in the background or specific shots</p>
                                        </div>

                                        <div className="flex flex-col gap-4 max-w-md">
                                            <div className="flex gap-2">
                                                <input 
                                                    value={newCameo}
                                                    onChange={e => setNewCameo(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && addCameo()}
                                                    placeholder="e.g. Munchlax"
                                                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-accent"
                                                />
                                                <button 
                                                    onClick={addCameo}
                                                    className="px-4 bg-accent text-white rounded-xl hover:bg-accent/80 transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {(activeMission.cameos || []).length === 0 ? (
                                                    <div className="flex flex-col gap-3 p-4 bg-accent/5 border border-dashed border-accent/20 rounded-2xl w-full">
                                                        <p className="text-[10px] uppercase font-black text-accent/60">Suggested Defaults</p>
                                                        <div className="flex gap-2">
                                                            {["Munchlax", "Trubbish"].map(suggested => (
                                                                <button 
                                                                    key={suggested}
                                                                    onClick={() => {
                                                                        const updated = {
                                                                           ...activeMission,
                                                                           cameos: [...(activeMission.cameos || []), suggested]
                                                                        };
                                                                        setActiveMission(updated);
                                                                        fetch('/api/missions', {
                                                                            method: 'POST',
                                                                            headers: { 'Content-Type': 'application/json' },
                                                                            body: JSON.stringify({ mode, mission: updated })
                                                                        });
                                                                    }}
                                                                    className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-lg text-[10px] font-bold text-accent hover:bg-accent/20 transition-all"
                                                                >
                                                                    + {suggested}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    (activeMission.cameos || []).map((c, i) => (
                                                        <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-xl">
                                                            <span className="text-[11px] font-bold text-foreground/80">{c}</span>
                                                            <button onClick={() => removeCameo(i)}>
                                                                <X className="w-3 h-3 text-foreground/30 hover:text-red-400" />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "blocking" && (
                                    <div className="animate-in fade-in duration-300">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse responsive-table">
                                                <thead>
                                                    <tr className="border-b border-border/10 bg-black/20">
                                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/40">Time</th>
                                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/40">Lyric Sync</th>
                                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/40">Director's vision</th>
                                                        <th className="p-6 text-[10px] font-black uppercase tracking-widest text-foreground/40">Round Table critiques</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/5">
                                                    {activeMission.shots.map((shot, idx) => (
                                                        <tr key={shot.id} className="group hover:bg-white/5 transition-colors">
                                                            <td className="p-6 align-top">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="lg:hidden text-[9px] font-black uppercase tracking-widest text-accent mb-1 opacity-50">Timestamp</span>
                                                                    <span className="text-[11px] font-mono font-black text-accent bg-accent/5 px-2 py-1 rounded-md w-fit">
                                                                        {shot.timestamp}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-6 lg:p-6 align-top max-w-none lg:max-w-[150px]">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="lg:hidden text-[9px] font-black uppercase tracking-widest text-accent mb-1 opacity-50">Lyric Sync</span>
                                                                    <p className="text-[10px] font-mono text-pink-400 leading-relaxed italic m-0">{shot.lyric || "—"}</p>
                                                                </div>
                                                            </td>
                                                            <td className="p-6 lg:p-6 align-top max-w-none lg:max-w-sm">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="lg:hidden text-[9px] font-black uppercase tracking-widest text-accent mb-1 opacity-50">Director's Vision</span>
                                                                    <p className="text-sm leading-relaxed font-medium text-foreground/80 m-0">{shot.visualDescription}</p>
                                                                </div>
                                                            </td>
                                                            <td className="p-6 lg:p-6 align-top max-w-none lg:max-w-sm">
                                                                <div className="flex flex-col gap-3">
                                                                    <span className="lg:hidden text-[9px] font-black uppercase tracking-widest text-accent mb-1 opacity-50">Critiques</span>
                                                                    {shot.personaCritiques?.director && (
                                                                        <div className="flex gap-2">
                                                                            <Sparkles className="w-2.5 h-2.5 text-purple-400 mt-1 shrink-0" />
                                                                            <p className="text-[10px] leading-relaxed text-foreground/50 m-0"><span className="text-purple-400 font-black uppercase tracking-tighter">Director:</span> {shot.personaCritiques.director}</p>
                                                                        </div>
                                                                    )}
                                                                    {shot.personaCritiques?.strategist && (
                                                                        <div className="flex gap-2">
                                                                            <Sparkles className="w-2.5 h-2.5 text-emerald-400 mt-1 shrink-0" />
                                                                            <p className="text-[10px] leading-relaxed text-foreground/50 m-0"><span className="text-emerald-400 font-black uppercase tracking-tighter">Strategist:</span> {shot.personaCritiques.strategist}</p>
                                                                        </div>
                                                                    )}
                                                                    {shot.personaCritiques?.audience && (
                                                                        <div className="flex gap-2">
                                                                            <Sparkles className="w-2.5 h-2.5 text-pink-400 mt-1 shrink-0" />
                                                                            <p className="text-[10px] leading-relaxed text-foreground/50 m-0"><span className="text-pink-400 font-black uppercase tracking-tighter">Audience:</span> {shot.personaCritiques.audience}</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "frames" && (
                                    <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                                        {/* Production Progress Bar */}
                                        <div className="p-6 bg-accent/5 border border-accent/20 rounded-3xl flex flex-col gap-3">
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col gap-1">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-accent">Production Progress</h4>
                                                    <p className="text-[10px] text-foreground/40 uppercase">Tracking finished assets for this mission</p>
                                                </div>
                                                <span className="text-xl font-black text-accent">
                                                    {Math.round(((activeMission.shots.filter(s => s.isProduced).length) / activeMission.shots.length) * 100)}%
                                                </span>
                                            </div>
                                            <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className="h-full bg-accent transition-all duration-700 ease-out shadow-[0_0_15px_rgba(255,51,102,0.5)]"
                                                    style={{ width: `${((activeMission.shots.filter(s => s.isProduced).length) / activeMission.shots.length) * 100}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {activeMission.shots.map((shot, idx) => (
                                                <div key={shot.id} className={`p-6 rounded-[2.5rem] flex flex-col gap-6 border transition-all relative overflow-hidden group ${shot.isProduced ? 'bg-accent/[0.03] border-accent/20 opacity-80' : 'bg-black/60 border-white/5'}`}>
                                                    {shot.thumbnailUrl && (
                                                        <div className="absolute top-0 right-0 w-64 h-full pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                                                            <img src={shot.thumbnailUrl} className="w-full h-full object-cover blur-sm" alt="" />
                                                            <div className="absolute inset-0 bg-gradient-to-l from-black via-black/40 to-transparent" />
                                                        </div>
                                                    )}
                                                    
                                                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 relative z-10">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[10px] font-black text-white border border-white/10 shrink-0">
                                                                {idx + 1}
                                                            </div>
                                                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border ${shot.isProduced ? 'bg-accent/20 border-accent/40 text-accent' : 'bg-accent/5 border-white/5 text-accent'}`}>
                                                                {shot.timestamp}
                                                            </div>
                                                            <button 
                                                                onClick={() => toggleShotProduced(shot.id)}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${shot.isProduced ? 'bg-accent text-white shadow-lg shadow-accent/20' : 'bg-white/5 text-foreground/40 hover:bg-white/10'}`}
                                                            >
                                                                {shot.isProduced ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 rounded-full border-2 border-current opacity-30" />}
                                                                {shot.isProduced ? "Produced" : "Mark Finished"}
                                                            </button>
                                                        </div>
                                                        <div className="flex gap-2 items-center flex-wrap">
                                                            <button 
                                                                onClick={() => handleGenerateImage(shot)}
                                                                disabled={generatingShotId === shot.id}
                                                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all bg-yellow-400 text-black hover:bg-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.2)] active:scale-95 disabled:opacity-50`}
                                                            >
                                                                {generatingShotId === shot.id && generatingType === "new" ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className="text-sm">🍌</span>}
                                                                {generatingShotId === shot.id && generatingType === "new" ? "Forging..." : "Generate"}
                                                            </button>
                                                                       {shot.thumbnailUrl && (
                                                                <button 
                                                                    onClick={() => handleForgeVideoPrompt(shot)}
                                                                    disabled={forgingVideoShotId === shot.id}
                                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 shadow-lg active:scale-95 disabled:opacity-50`}
                                                                >
                                                                    {forgingVideoShotId === shot.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                                                                    {forgingVideoShotId === shot.id ? "Forging..." : "📽️ Prompt"}
                                                                </button>
                                                             )}

                                                             <div className="h-6 w-px bg-white/10 mx-2 hidden lg:block" />

                                                             {shot.thumbnailUrl && (
                                                                <button 
                                                                    onClick={() => handleGenerateImage(shot, true)}
                                                                    disabled={generatingShotId === shot.id}
                                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-white/5 border border-white/5 text-foreground/60 hover:text-white hover:bg-white/10 shadow-lg active:scale-95 disabled:opacity-50`}
                                                                >
                                                                    {generatingShotId === shot.id && generatingType === "edit" ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                                                                    {generatingShotId === shot.id && generatingType === "edit" ? "Refining..." : "🖼️ Edit"}
                                                                </button>
                                                             )}
           

                                                            <div className="h-6 w-px bg-white/10 mx-2 hidden lg:block" />

                                                            
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
                                                        <div className="lg:col-span-8 flex flex-col gap-3">
                                                            {editingShotId === shot.id ? (
                                                                <div className="flex flex-col gap-2">
                                                                       <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-[10px] font-black uppercase tracking-widest text-accent/60">Banana Image Prompt</span>
                                                                            <div className="flex items-center gap-2">
                                                                                <button 
                                                                                    onClick={() => copyPrompt(shot.bananaPromptV2 || shot.bananaPrompt || "", `${shot.id}-banana`)}
                                                                                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${copiedId === `${shot.id}-banana` ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/5 text-accent/40 hover:text-accent hover:border-accent'}`}
                                                                                >
                                                                                    <Copy className={`w-2.5 h-2.5 ${copiedId === `${shot.id}-banana` ? 'hidden' : 'block'}`} />
                                                                                    {copiedId === `${shot.id}-banana` ? 'Copied' : 'Copy Banana'}
                                                                                </button>
                                                                                <button 
                                                                                    onClick={() => getAssetPrompt({ label: shot.id, description: shot.visualDescription, category: 'Shot' }, true, shot.id)}
                                                                                    className="p-1.5 hover:bg-white/5 rounded-lg text-accent/40 hover:text-accent transition-all"
                                                                                    title="Regenerate Prompt from Vision"
                                                                                >
                                                                                    {isAssetPromptLoading === shot.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <textarea 
                                                                            value={tempPrompt}
                                                                        onChange={(e) => setTempPrompt(e.target.value)}
                                                                        className="w-full h-32 p-4 bg-black/40 border border-accent/40 rounded-2xl font-mono text-[11px] text-white focus:outline-none resize-none"
                                                                        autoFocus
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button 
                                                                            onClick={async () => {
                                                                                if (!activeMission) return;
                                                                                const newShots = activeMission.shots.map(s => 
                                                                                    s.id === shot.id ? { ...s, bananaPromptV2: tempPrompt } : s
                                                                                );
                                                                                const updated = { ...activeMission, shots: newShots };
                                                                                setActiveMission(updated);
                                                                                await fetch('/api/missions', {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify({ mode, mission: updated })
                                                                                });
                                                                                setEditingShotId(null);
                                                                            }}
                                                                            className="px-3 py-1 bg-accent rounded-lg text-[9px] font-black uppercase"
                                                                        >
                                                                            Save
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => setEditingShotId(null)}
                                                                            className="px-3 py-1 bg-white/5 rounded-lg text-[9px] font-black uppercase"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-2">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent/60">Banana Image Prompt</span>
                                                                        <div className="flex items-center gap-2">
                                                                            <button 
                                                                                onClick={() => copyPrompt(shot.bananaPromptV2 || shot.bananaPrompt || "", `${shot.id}-banana`)}
                                                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${copiedId === `${shot.id}-banana` ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-white/5 border-white/5 text-accent/40 hover:text-accent hover:border-accent'}`}
                                                                            >
                                                                                <Copy className={`w-2.5 h-2.5 ${copiedId === `${shot.id}-banana` ? 'hidden' : 'block'}`} />
                                                                                {copiedId === `${shot.id}-banana` ? 'Copied' : 'Copy Banana'}
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => getAssetPrompt({ label: shot.id, description: shot.visualDescription, category: 'Shot' }, true, shot.id)}
                                                                                className="p-1.5 hover:bg-white/5 rounded-lg text-accent/40 hover:text-accent transition-all"
                                                                                title="Regenerate Prompt from Vision"
                                                                            >
                                                                                {isAssetPromptLoading === shot.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div 
                                                                        onClick={() => {
                                                                            setEditingShotId(shot.id);
                                                                            setTempPrompt(shot.bananaPromptV2 || shot.bananaPrompt || "");
                                                                        }}
                                                                        className="p-4 bg-black/60 rounded-2xl border border-white/5 font-mono text-[11px] text-foreground/60 leading-relaxed whitespace-pre-wrap cursor-edit hover:border-accent/30 transition-all min-h-[100px]"
                                                                    >
                                                                        {shot.bananaPromptV2 || shot.bananaPrompt || "No prompt generated yet."}
                                                                    </div>
                                                                </div>
                                                             )}
                                                            
                                                            {shot.grokPromptV2 && (
                                                                <div className="flex flex-col gap-2 mt-4">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${shot.grokPromptV2?.startsWith("models stay consistent") ? 'text-purple-400' : 'text-purple-400/50'}`}>
                                                                            {shot.grokPromptV2?.startsWith("models stay consistent") ? "Grok Anti-Morph Forge (Vision-Aware)" : "Grok Movement (Initial Draft)"}
                                                                        </span>
                                                                        <button 
                                                                            onClick={() => copyPrompt(shot.grokPromptV2!, `${shot.id}-grok`)}
                                                                            className={`px-3 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest transition-all ${copiedId === `${shot.id}-grok` ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-surface/40 border-border/10 hover:border-accent'}`}
                                                                        >
                                                                            {copiedId === `${shot.id}-grok` ? 'Copied' : 'Copy Command'}
                                                                        </button>
                                                                    </div>
                                                                    <textarea 
                                                                        value={shot.grokPromptV2}
                                                                        onChange={async (e) => {
                                                                            const newVal = e.target.value;
                                                                            const newShots = activeMission.shots.map(s => 
                                                                                s.id === shot.id ? { ...s, grokPromptV2: newVal } : s
                                                                            );
                                                                            const updated = { ...activeMission, shots: newShots };
                                                                            setActiveMission(updated);
                                                                            await fetch('/api/missions', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({ mode, mission: updated })
                                                                            });
                                                                        }}
                                                                        className="w-full h-24 p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl font-mono text-[11px] text-foreground/80 focus:outline-none resize-none"
                                                                    />
                                                                </div>
                                                             )}
                                                            {shot.lyric && (
                                                                <p className="px-1 text-[10px] font-black uppercase tracking-widest text-accent/80 italic">
                                                                    "{shot.lyric}"
                                                                </p>
                                                            )}
                                                            <div className="flex flex-col gap-4 mt-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-accent/40">Visual References</span>
                                                                    <button 
                                                                        onClick={() => setManagingRefsShotId(managingRefsShotId === shot.id ? null : shot.id)}
                                                                        className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[8px] font-black uppercase tracking-widest text-accent/60 hover:text-accent transition-all"
                                                                    >
                                                                        <Plus className="w-3 h-3" /> Manage
                                                                    </button>
                                                                </div>

                                                                {managingRefsShotId === shot.id && (
                                                                    <div className="p-4 bg-accent/5 border border-accent/20 rounded-2xl flex flex-wrap gap-2 animate-in slide-in-from-top-2 duration-300">
                                                                        {(activeMission.requiredReferences || []).map((req, ri) => (
                                                                            <button 
                                                                                key={ri}
                                                                                onClick={() => toggleRefForShot(shot.id, req.label)}
                                                                                className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${shot.refLabels?.includes(req.label) ? 'bg-accent text-white border-accent' : 'bg-black/40 border-white/5 text-foreground/40 hover:border-accent/30'}`}
                                                                            >
                                                                                {req.label}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {shot.refLabels && shot.refLabels.map((lbl, li) => {
                                                                    const req = activeMission.requiredReferences?.find(r => r.label === lbl);
                                                                    const hasImage = req && req.uploadedIndex !== undefined && activeMission.references?.[req.uploadedIndex];
                                                                    
                                                                    return (
                                                                        <div key={li} className="flex flex-col gap-2">
                                                                            <div className="px-3 py-1 bg-accent/5 border border-accent/20 rounded-lg flex items-center gap-2 w-fit">
                                                                                <Camera className="w-3 h-3 text-accent" />
                                                                                <span className="text-[8px] font-black uppercase tracking-widest text-accent/60">USE: {lbl}</span>
                                                                            </div>
                                                                            {hasImage && (
                                                                                <div className="w-16 h-16 rounded-xl border border-white/10 overflow-hidden shadow-2xl ml-1">
                                                                                    <img src={activeMission.references![req.uploadedIndex!]} className="w-full h-full object-cover" alt={lbl} />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })}
                                                             </div>
                                                        </div>

                                                        <div className="lg:col-span-4 flex flex-col gap-3">
                                                            {shot.thumbnailUrl ? (
                                                                <div className="aspect-[9/16] rounded-3xl overflow-hidden border border-white/10 bg-black/40 shadow-2xl relative group/img">
                                                                     <img src={shot.thumbnailUrl} className="w-full h-full object-cover" alt="Generated Frame" />
                                                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3 p-6">
                                                                         <button 
                                                                             onClick={() => {
                                                                                 const link = document.createElement('a');
                                                                                 link.href = shot.thumbnailUrl!;
                                                                                 link.download = `frame-${shot.timestamp}.jpg`;
                                                                                 link.click();
                                                                             }}
                                                                             className="w-full flex items-center justify-center gap-2 py-2 bg-accent text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                                                                         >
                                                                             <Download className="w-3 h-3" /> Download High-Fi
                                                                         </button>
                                                                         
                                                                         <div className="grid grid-cols-2 gap-2 w-full">
                                                                             <label className="flex items-center justify-center gap-2 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer transition-all">
                                                                                 <Upload className="w-3 h-3" /> Swap
                                                                                 <input 
                                                                                     type="file" 
                                                                                     className="hidden" 
                                                                                     accept="image/*"
                                                                                     onChange={(e) => handleUploadShot(shot.id, e)}
                                                                                 />
                                                                             </label>
                                                                             <button 
                                                                                 onClick={() => handleClearShot(shot.id)}
                                                                                 className="flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                                             >
                                                                                 <Trash2 className="w-3 h-3" /> Clear
                                                                             </button>
                                                                         </div>
                                                                     </div>
                                                                 </div>
                                                            ) : (
                                                                <div className="aspect-[9/16] rounded-3xl border border-dashed border-white/5 bg-black/20 flex flex-col items-center justify-center gap-4 text-foreground/10">
                                                                    <div className="w-12 h-12 rounded-full border border-current flex items-center justify-center animate-pulse">
                                                                        <ImageIcon className="w-6 h-6" />
                                                                    </div>
                                                                    <span className="text-[9px] font-black uppercase tracking-widest">Awaiting Vision</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
