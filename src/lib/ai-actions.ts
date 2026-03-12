import { getRow, setRow, addMetadataPackAsync, MetadataPack } from './db';
import { supabase } from './supabase';

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
 * AI Tool: Save SEO metadata to the Creative Engine history.
 */
export async function save_to_creative(params: { alias: string, keyword: string, titles: string[], descriptions: string[] }) {
    try {
        const pack: MetadataPack = {
            alias: params.alias,
            keyword: params.keyword,
            titles: params.titles,
            descriptions: params.descriptions,
            tags: [], // Tags are usually in descriptions
            timestamp: new Date().toISOString()
        };
        await addMetadataPackAsync(pack);
        return { success: true, message: `Metadata for '${params.keyword}' filed under ${params.alias}.` };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// Tool Definitions for Gemini SDK
export const aiTools = [
    {
        functionDeclarations: [
            {
                name: "save_to_vault",
                description: "Saves or updates a musical project in The Vault. Use this when the user approves a project structure, tracklist, or lore description.",
                parameters: {
                    type: "object",
                    properties: {
                        project: {
                            type: "object",
                            properties: {
                                id: { type: "string", description: "Optional UUID. If omitted, one will be generated." },
                                title: { type: "string", description: "The title of the project." },
                                alias: { type: "string", enum: ["Kirbai", "AELOW", "KURAO"], description: "The artist identity." },
                                lore: { type: "string", description: "Deep background or concept for the project." },
                                tracklist: { type: "array", items: { type: "string" }, description: "List of track titles." },
                                status: { type: "string", enum: ["Draft", "In Progress", "Completed", "Released"], description: "Current state." },
                                visualVibe: { type: "string", description: "Aesthetic description for AI image generation." },
                                targetTrackCount: { type: "number", description: "Goal number of tracks." }
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
                    type: "object",
                    properties: {
                        nodes: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    label: { type: "string" },
                                    type: { type: "string", enum: ["character", "event", "location", "item"] },
                                    description: { type: "string" },
                                    traits: { type: "string" }
                                },
                                required: ["id", "label"]
                            }
                        },
                        edges: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    source: { type: "string", description: "ID of the source node." },
                                    target: { type: "string", description: "ID of the target node." },
                                    label: { type: "string", description: "Relationship label (e.g., 'Rivals', 'Created By')." }
                                },
                                required: ["source", "target"]
                            }
                        }
                    }
                }
            },
            {
                name: "save_to_creative",
                description: "Saves SEO metadata packages to the Creative Engine. Use this after generating YouTube titles and descriptions.",
                parameters: {
                    type: "object",
                    properties: {
                        alias: { type: "string", enum: ["AELOW", "KURAO"] },
                        keyword: { type: "string" },
                        titles: { type: "array", items: { type: "string" } },
                        descriptions: { type: "array", items: { type: "string" } }
                    },
                    required: ["alias", "keyword", "titles", "descriptions"]
                }
            }
        ]
    }
];
