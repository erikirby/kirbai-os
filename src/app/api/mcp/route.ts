import { NextResponse } from 'next/server';
import { applyOps, getContext, OPS_HELP, type Op } from '@/lib/kirbai-ops';

export const dynamic = 'force-dynamic';

// Minimal MCP server (Streamable HTTP, JSON responses) so Claude and ChatGPT can add
// Kirbai OS as a connector: https://kirbai-os.vercel.app/api/mcp

const TOOLS = [
    {
        name: 'get_kirbai_state',
        description: 'Read Kirbai OS: release calendar (with item ids), backlog ideas, open decisions, the Cast Sheet (which Pokémon is in which song), Vault projects and recent notes. Call this before suggesting or making changes.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
        name: 'update_kirbai',
        description: `Apply changes to Kirbai OS in one batch. Use after Erik agrees on plans in chat so the site reflects them.\n${OPS_HELP}`,
        inputSchema: {
            type: 'object',
            properties: {
                ops: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            op: { type: 'string', enum: ['add_item', 'update_item', 'delete_item', 'add_decision', 'resolve_decision', 'upsert_song', 'delete_song', 'update_project', 'add_note'] },
                        },
                        required: ['op'],
                        additionalProperties: true,
                    },
                },
                source: { type: 'string', description: 'Who is making the change, e.g. "claude" or "chatgpt".' },
            },
            required: ['ops'],
        },
    },
    {
        name: 'add_note',
        description: 'Save a free-form note about Erik\'s plans (ideas, direction changes, reminders) so it shows on the Kirbai OS home page. Use when something matters but has no exact date or place yet.',
        inputSchema: { type: 'object', properties: { text: { type: 'string' }, source: { type: 'string' } }, required: ['text'] },
    },
];

function allowed(req: Request) {
    const key = process.env.KIRBAI_AI_KEY;
    return !key || req.headers.get('x-kirbai-key') === key || new URL(req.url).searchParams.get('key') === key;
}

const text = (t: string) => ({ content: [{ type: 'text', text: t }] });

async function handle(msg: { id?: string | number; method: string; params?: any }) {
    switch (msg.method) {
        case 'initialize':
            return {
                protocolVersion: msg.params?.protocolVersion ?? '2025-06-18',
                capabilities: { tools: {} },
                serverInfo: { name: 'kirbai-os', version: '1.0.0' },
                instructions: 'Kirbai OS is Erik\'s planning hub for his Pokémon music project Kirbai. Read with get_kirbai_state, write with update_kirbai or add_note. Confirm with Erik before deleting anything.',
            };
        case 'ping':
            return {};
        case 'tools/list':
            return { tools: TOOLS };
        case 'tools/call': {
            const name = msg.params?.name;
            const args = msg.params?.arguments ?? {};
            if (name === 'get_kirbai_state') {
                const ctx = await getContext();
                return text(ctx.markdown);
            }
            if (name === 'update_kirbai') {
                const ops: Op[] = Array.isArray(args.ops) ? args.ops : [];
                const { results } = await applyOps(ops, String(args.source || 'mcp').slice(0, 40));
                return text(results.map(r => `${r.ok ? '✓' : '✗'} ${r.op}: ${r.detail}`).join('\n') || 'No ops given.');
            }
            if (name === 'add_note') {
                const { results } = await applyOps([{ op: 'add_note', text: String(args.text ?? '') }], String(args.source || 'mcp').slice(0, 40));
                return text(results[0].ok ? 'Saved to Kirbai OS.' : results[0].detail);
            }
            return { ...text(`Unknown tool ${name}`), isError: true };
        }
        default:
            throw Object.assign(new Error(`Method not found: ${msg.method}`), { code: -32601 });
    }
}

export async function POST(req: Request) {
    if (!allowed(req)) return NextResponse.json({ jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized' } }, { status: 401 });
    const body = await req.json();
    const batch = Array.isArray(body) ? body : [body];
    const replies = [];
    for (const msg of batch) {
        if (msg.id === undefined || msg.id === null) continue; // notifications need no reply
        try {
            replies.push({ jsonrpc: '2.0', id: msg.id, result: await handle(msg) });
        } catch (e: any) {
            replies.push({ jsonrpc: '2.0', id: msg.id, error: { code: e.code ?? -32603, message: e.message } });
        }
    }
    if (!replies.length) return new NextResponse(null, { status: 202 });
    return NextResponse.json(Array.isArray(body) ? replies : replies[0]);
}

export async function GET() {
    return NextResponse.json({ name: 'kirbai-os', transport: 'POST JSON-RPC to this URL (MCP Streamable HTTP)', tools: TOOLS.map(t => t.name) }, { status: 405 });
}
