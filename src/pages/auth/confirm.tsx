import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '../../utils/supabase/client'

export default function ConfirmPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      const { token_hash, type } = router.query

      if (token_hash && type) {
        try {
          const { error } = await supabase.auth.verifyOtp({
            type: type as any,
            token_hash: token_hash as string,
          })

          if (error) {
            console.error('Confirmation error:', error)
            // Redirect to signup with error message
            router.push('/signup?message=confirmation_failed')
          } else {
            // Successful confirmation - redirect to signup with success message
            router.push('/signup?message=email_verified')
          }
        } catch (error) {
          console.error('Unexpected error during confirmation:', error)
          router.push('/signup?message=confirmation_failed')
        }
      } else {
        // No proper parameters - redirect to signup
        router.push('/signup')
      }
    }

    if (router.isReady) {
      handleEmailConfirmation()
    }
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59e3a5] mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Confirming your email...
        </h2>
        <p className="text-gray-400">
          Please wait while we verify your account.
        </p>
      </div>
    </div>
  )
} 