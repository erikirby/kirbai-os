import { NextResponse } from 'next/server';
import { OPS_HELP } from '@/lib/kirbai-ops';

export const dynamic = 'force-dynamic';

/** OpenAPI spec for a ChatGPT Custom GPT Action. Paste this URL into "Import from URL". */
export async function GET(req: Request) {
    const origin = new URL(req.url).origin;
    return NextResponse.json({
        openapi: '3.1.0',
        info: { title: 'Kirbai OS', version: '1.0.0', description: "Read and update Erik's Kirbai planning hub (release calendar, decisions, Cast Sheet, Vault, notes)." },
        servers: [{ url: origin }],
        paths: {
            '/api/ai': {
                get: {
                    operationId: 'getKirbaiState',
                    summary: 'Current calendar, backlog, decisions, cast, Vault projects and notes. Call before suggesting changes.',
                    parameters: [{ name: 'format', in: 'query', required: false, schema: { type: 'string', enum: ['md'] }, description: 'Use "md" for a readable brief.' }],
                    responses: { '200': { description: 'Current state' } },
                },
                post: {
                    operationId: 'updateKirbai',
                    summary: 'Apply a batch of changes after Erik agrees to them.',
                    description: OPS_HELP,
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['ops'],
                                    properties: {
                                        source: { type: 'string', example: 'chatgpt' },
                                        ops: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                required: ['op'],
                                                properties: {
                                                    op: { type: 'string', enum: ['add_item', 'update_item', 'delete_item', 'add_decision', 'resolve_decision', 'upsert_song', 'delete_song', 'update_project', 'add_note'] },
                                                    id: { type: 'string' }, match: { type: 'string' }, title: { type: 'string' },
                                                    date: { type: 'string', description: 'YYYY-MM-DD' }, stream: { type: 'string', enum: ['video', 'carousel', 'comedy'] },
                                                    subtitle: { type: 'string' }, notes: { type: 'string' }, status: { type: 'string' }, text: { type: 'string' },
                                                    era: { type: 'string' }, mains: { type: 'array', items: { type: 'string' } }, cameos: { type: 'array', items: { type: 'string' } },
                                                    note: { type: 'string' }, releaseDate: { type: 'string' }, append_lore: { type: 'string' }, append_worldbuilding: { type: 'string' },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    responses: { '200': { description: 'Per-op results' } },
                },
            },
        },
    });
}
