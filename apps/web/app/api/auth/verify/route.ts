import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { password } = await req.json();
        const appPassword = process.env.APP_PASSWORD || 'wedding2026';

        if (password === appPassword) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
