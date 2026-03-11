import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const IDENTITY_KEY = 'brand_identity';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('brand_identity')
            .select('value')
            .eq('key', IDENTITY_KEY)
            .single();

        if (error || !data) {
            return NextResponse.json({
                brandIdentity: '',
                aestheticRules: '',
                narrativeRules: '',
                workflowTools: '',
                ultimateGoal: ''
            });
        }

        return NextResponse.json(data.value);
    } catch (error) {
        console.error('Error reading identity:', error);
        return NextResponse.json({ error: 'Failed to read identity' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const { error } = await supabase
            .from('brand_identity')
            .upsert({ key: IDENTITY_KEY, value: body }, { onConflict: 'key' });

        if (error) throw error;

        return NextResponse.json({ success: true, data: body });
    } catch (error: any) {
        console.error('Error saving identity:', error);
        return NextResponse.json({ error: 'Failed to save identity' }, { status: 500 });
    }
}
