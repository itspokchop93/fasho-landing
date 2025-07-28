import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Custom404() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to our custom error page
    router.replace('/error');
  }, [router]);

  // Show loading spinner while redirecting
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#59e3a5]"></div>
    </div>
  );
} 