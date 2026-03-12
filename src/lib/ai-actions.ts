import { getRow, setRow, addMetadataPackAsync, MetadataPack } from './db';
import { supabase } from './supabase';
import { Type } from '@google/genai';

/**
 * AI Tool: Save or update a project in The Vault.
 */
export async function save_to_vault(params: { project: any }) {
    try {
        const { project } = params;
        if (!project.title) throw new Error("Project title is required.");

        const projects = await getRow('vault_projects') || [];
        
        // Find existing project by title or id
        const index = projects.findIndex((p: any) => p.id === project.id || p.title === project.title);
        
        if (index !== -1) {
            // Update
            projects[index] = { ...projects[index], ...project, updatedAt: Date.now() };
        } else {
            // Create
            if (!project.id) project.id = crypto.randomUUID();
            project.createdAt = Date.now();
            projects.unshift(project);
        }

        await setRow('vault_projects', projects);
        return { success: true, message: `Project '${project.title}' saved to The Vault.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * AI Tool: Save nodes/edges to the Lore Matrix.
 */
export async function save_to_lore(params: { nodes?: any[], edges?: any[] }) {
    try {
        const { nodes = [], edges = [] } = params;

        if (nodes.length > 0) {
            const nodeRows = nodes.map(n => ({
                id: n.id,
                type: n.type || 'character',
                label: n.label || n.id,
                description: n.description || '',
                traits: n.traits || '',
                image_path: n.imagePath || '',
                pos_x: n.x ?? Math.random() * 400,
                pos_y: n.y ?? Math.random() * 400
            }));
            const { error } = await supabase.from('lore_nodes').upsert(nodeRows, { onConflict: 'id' });
            if (error) throw error;
        }

        if (edges.length > 0) {
            const edgeRows = edges.map(e => ({
                source: e.source,
                target: e.target,
                label: e.label || ''
            }));
            const { error } = await supabase.from('lore_edges').insert(edgeRows);
            if (error) throw error;
        }

        return { success: true, message: `Successfully added ${nodes.length} nodes and ${edges.length} relationships to Lore.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * AI Tool: Save a brainstorm, reel, or post idea to the Creative Concepts hub.
 */
export async function save_to_concepts(params: { concept: any }) {
    try {
        const { concept } = params;
        if (!concept.title || !concept.body) throw new Error("Title and Body are required.");

        const concepts = await getRow('concepts') || [];
        const now = new Date().toISOString();

        // Check if updating existing
        const index = concepts.findIndex((c: any) => c.id === concept.id || c.title === concept.title);
        
        if (index !== -1) {
            concepts[index] = { ...concepts[index], ...concept, updated_at: now };
        } else {
            const newConcept = {
                id: concept.id || `concept_${Date.now()}`,
                title: concept.title,
                type: concept.type || 'general',
                status: concept.status || 'concept',
                body: concept.body,
                character: concept.character || '',
                created_at: now,
                updated_at: now
            };
            concepts.unshift(newConcept);
        }

        await setRow('concepts', concepts);
        return { success: true, message: `Idea '${concept.title}' filed in the Creative Hub.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// Tool Definitions for Gemini SDK
export const aiTools: any[] = [
    {
        functionDeclarations: [
            {
                name: "save_to_vault",
                description: "Saves or updates a musical project in The Vault. Use this when the user approves a project structure, tracklist, or lore description.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        project: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING, description: "Optional UUID. If omitted, one will be generated." },
                                title: { type: Type.STRING, description: "The title of the project." },
                                alias: { type: Type.STRING, enum: ["Kirbai", "AELOW", "KURAO"], description: "The artist identity." },
                                lore: { type: Type.STRING, description: "Deep background or concept for the project." },
                                tracklist: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of track titles." },
                                status: { type: Type.STRING, enum: ["Draft", "In Progress", "Completed", "Released"], description: "Current state." },
                                visualVibe: { type: Type.STRING, description: "Aesthetic description for AI image generation." },
                                targetTrackCount: { type: Type.NUMBER, description: "Goal number of tracks." }
                            },
                            required: ["title", "alias", "status"]
                        }
                    },
                    required: ["project"]
                }
            },
            {
                name: "save_to_lore",
                description: "Adds entities or relationships to the Lore Matrix. Use this to maintain worldbuilding continuity.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        nodes: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    id: { type: Type.STRING },
                                    label: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ["character", "event", "location", "item"] },
                                    description: { type: Type.STRING },
                                    traits: { type: Type.STRING }
                                },
                                required: ["id", "label"]
                            }
                        },
                        edges: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    source: { type: Type.STRING, description: "ID of the source node." },
                                    target: { type: Type.STRING, description: "ID of the target node." },
                                    label: { type: Type.STRING, description: "Relationship label (e.g., 'Rivals', 'Created By')." }
                                },
                                required: ["source", "target"]
                            }
                        }
                    }
                }
            },
            {
                name: "save_to_concepts",
                description: "Saves a concept, brainstorm, or content idea to the Creative hub. Use this for reels, scripts, and general scene ideas.",
                parameters: {
                    type: Type.OBJECT,
                    properties: {
                        concept: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                title: { type: Type.STRING },
                                body: { type: Type.STRING, description: "The core content of the idea, script, or brainstorm." },
                                type: { type: Type.STRING, enum: ["reel", "post", "music", "general"] },
                                status: { type: Type.STRING, enum: ["concept", "in-dev", "executed", "archived"] },
                                character: { type: Type.STRING, description: "The primary character associated with this idea." }
                            },
                            required: ["title", "body"]
                        }
                    },
                    required: ["concept"]
                }
            }
        ]
    }
];
