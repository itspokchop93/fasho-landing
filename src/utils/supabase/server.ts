import { createServerClient } from '@supabase/ssr'
import { NextApiRequest, NextApiResponse } from 'next'
import { GetServerSidePropsContext } from 'next'

function validateEnvironmentVariables() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your environment configuration.\n' +
      'Required variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- NEXT_PUBLIC_SUPABASE_ANON_KEY'
    )
  }

  return { supabaseUrl, supabaseKey }
}

// For API routes
export function createClient(req: NextApiRequest, res: NextApiResponse) {
  const { supabaseUrl, supabaseKey } = validateEnvironmentVariables()
  
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return req?.cookies?.[name] || undefined
        },
        set(name: string, value: string, options: any) {
          if (res && res.setHeader) {
            res.setHeader('Set-Cookie', `${name}=${value}; ${options ? Object.entries(options).map(([key, val]) => `${key}=${val}`).join('; ') : ''}`)
          }
        },
        remove(name: string, options: any) {
          if (res && res.setHeader) {
            res.setHeader('Set-Cookie', `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${options ? Object.entries(options).map(([key, val]) => `${key}=${val}`).join('; ') : ''}`)
          }
        },
      },
    }
  )
}

// For getServerSideProps
export function createClientSSR(context: GetServerSidePropsContext) {
  const { supabaseUrl, supabaseKey } = validateEnvironmentVariables()
  
  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return context.req.cookies[name]
        },
        set(name: string, value: string, options: any) {
          context.res.setHeader('Set-Cookie', `${name}=${value}; ${options ? Object.entries(options).map(([key, val]) => `${key}=${val}`).join('; ') : ''}`)
        },
        remove(name: string, options: any) {
          context.res.setHeader('Set-Cookie', `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; ${options ? Object.entries(options).map(([key, val]) => `${key}=${val}`).join('; ') : ''}`)
        },
      },
    }
  )
}

// For admin operations - uses service role key to bypass RLS
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables for admin operations.\n' +
      'Required variables:\n' +
      '- NEXT_PUBLIC_SUPABASE_URL\n' +
      '- SUPABASE_SERVICE_ROLE_KEY'
    )
  }

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    }
  )
} 