import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: { path?: string; maxAge?: number; expires?: Date; secure?: boolean; sameSite?: 'lax' | 'strict' | 'none' }) {
          try {
            cookieStore.set(name, value, options)
          } catch {
          }
        },
        remove(name: string, options: { path?: string; sameSite?: 'lax' | 'strict' | 'none' }) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch {
          }
        },
      },
    }
  )
}