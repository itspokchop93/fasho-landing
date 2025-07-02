import { useRouter } from 'next/router'

export default function AuthError() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="max-w-md w-full bg-gray-900 p-8 rounded-lg border border-gray-800">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">
            Authentication Error
          </h1>
          <p className="text-gray-300 mb-6">
            There was an error with authentication. This could be due to:
          </p>
          <ul className="text-gray-400 text-sm mb-6 text-left space-y-2">
            <li>• Expired or invalid verification link</li>
            <li>• Network connection issues</li>
            <li>• Authentication service temporarily unavailable</li>
          </ul>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/signup')}
              className="w-full bg-gradient-to-r from-green-400 to-blue-500 text-white py-2 px-4 rounded-md hover:opacity-90 transition-opacity"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
            >
              Go to Homepage
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 