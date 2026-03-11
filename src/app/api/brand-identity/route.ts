import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const IDENTITY_FILE = path.join(process.cwd(), 'data', 'vault', 'brand', 'identity.json');

export async function GET() {
    try {
        if (!fs.existsSync(IDENTITY_FILE)) {
            return NextResponse.json({ 
                brandIdentity: '', 
                aestheticRules: '', 
                narrativeRules: '', 
                workflowTools: '',
                ultimateGoal: ''
            });
        }
        const data = fs.readFileSync(IDENTITY_FILE, 'utf8');
        return NextResponse.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading identity:', error);
        return NextResponse.json({ error: 'Failed to read identity' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        
        // Ensure directory exists
        const dir = path.dirname(IDENTITY_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(IDENTITY_FILE, JSON.stringify(body, null, 2));
        return NextResponse.json({ success: true, data: body });
    } catch (error) {
        console.error('Error saving identity:', error);
        return NextResponse.json({ error: 'Failed to save identity' }, { status: 500 });
    }
}
