import { createServerClient } from '@supabase/ssr'
import { NextApiRequest, NextApiResponse } from 'next'
import { GetServerSidePropsContext } from 'next'

type CookieOptions = {
  name: string
  value: string
  options?: { [key: string]: any }
}

// For API routes
export function createClient(req: NextApiRequest, res: NextApiResponse) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.keys(req.cookies).map((name) => ({
            name,
            value: req.cookies[name] || '',
          }))
        },
        setAll(cookiesToSet: CookieOptions[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.setHeader('Set-Cookie', `${name}=${value}; ${options ? Object.entries(options).map(([key, val]) => `${key}=${val}`).join('; ') : ''}`)
          })
        },
      },
    }
  )
}

// For getServerSideProps
export function createClientSSR(context: GetServerSidePropsContext) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return Object.keys(context.req.cookies || {}).map((name) => ({
            name,
            value: context.req.cookies![name] || '',
          }))
        },
        setAll(cookiesToSet: CookieOptions[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            if (context.res) {
              context.res.setHeader('Set-Cookie', `${name}=${value}; ${options ? Object.entries(options).map(([key, val]) => `${key}=${val}`).join('; ') : ''}`)
            }
          })
        },
      },
    }
  )
} 