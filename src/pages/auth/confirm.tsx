import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../../utils/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Email verification is now disabled, redirect users to dashboard if logged in, otherwise to signup
    const checkAuthAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          // User is logged in, redirect to dashboard
          router.push('/dashboard')
        } else {
          // User not logged in, redirect to signup
          router.push('/signup')
        }
      } catch (error) {
        console.error('Error checking auth status:', error)
        // Fallback to signup page
        router.push('/signup')
      }
    }

    if (router.isReady) {
      checkAuthAndRedirect()
    }
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59e3a5] mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Redirecting...
        </h2>
        <p className="text-gray-400">
          Please wait while we redirect you.
        </p>
      </div>
    </div>
  )
} 