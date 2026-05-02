import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const getIpAddress = (req: Request) => {
  const forwardedFor = req.headers.get('x-forwarded-for')
  const realIp = req.headers.get('x-real-ip')
  
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }
  
  if (realIp) {
    return realIp.trim()
  }
  
  return 'unknown-ip'
}

export async function GET(req: Request) {
  try {
    const ip = getIpAddress(req)
    if (ip === 'unknown-ip') {
      return NextResponse.json({ used: false }) // Allow if we can't detect IP, though rare
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data } = await supabaseAdmin
      .from('anonymous_usage')
      .select('ip_address')
      .eq('ip_address', ip)
      .single()

    return NextResponse.json({ used: !!data })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ used: false }) // Fail open to not block real users if DB is down
  }
}

export async function POST(req: Request) {
  try {
    const ip = getIpAddress(req)
    if (ip === 'unknown-ip') {
      return NextResponse.json({ success: true })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabaseAdmin
      .from('anonymous_usage')
      .insert({ ip_address: ip })

    // If error is 23505 (unique_violation), they already used it
    if (error && error.code === '23505') {
      return NextResponse.json({ success: false, reason: 'already_used' })
    }
    
    if (error) throw error;

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
