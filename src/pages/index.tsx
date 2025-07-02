import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import HeroSection from "../components/HeroSection";

export default function Home() {
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user arrived from email confirmation
    if (router.query.confirmed === 'true') {
      setShowSuccessBanner(true);
      // Clean up the URL parameter
      router.replace('/', undefined, { shallow: true });
    }
  }, [router]);

  const dismissBanner = () => {
    setShowSuccessBanner(false);
  };

  return (
    <>
      <Head>
        <title>Fasho.co – Spotify Promotion Services</title>
        <meta
          name="description"
          content="Promote your Spotify track with targeted campaigns and playlist pitching."
        />
      </Head>
      
      {/* Success Banner */}
      {showSuccessBanner && (
        <div className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] py-4 px-4 relative">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <svg 
                className="h-6 w-6 text-white mr-3" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <div>
                <h3 className="text-white font-semibold text-lg">
                  Successfully signed in! Welcome to Fasho.co! 🎉
                </h3>
                <p className="text-white/90 text-sm">
                  Your email has been confirmed. You can now promote your tracks!
                </p>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="text-white/80 hover:text-white transition-colors p-1"
              aria-label="Dismiss notification"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main>
        <HeroSection />

        {/* How it works */}
        <section className="py-24 px-4 max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">How it works</h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div>
              <span className="text-indigo-600 text-4xl font-extrabold">1</span>
              <h3 className="font-semibold text-xl my-2">Find your track</h3>
              <p>Paste your Spotify link and confirm your song.</p>
            </div>
            <div>
              <span className="text-indigo-600 text-4xl font-extrabold">2</span>
              <h3 className="font-semibold text-xl my-2">Choose a package</h3>
              <p>Select the promotion tier that fits your goals & budget.</p>
            </div>
            <div>
              <span className="text-indigo-600 text-4xl font-extrabold">3</span>
              <h3 className="font-semibold text-xl my-2">Watch the streams</h3>
              <p>We pitch your track to high-quality playlists & audiences.</p>
            </div>
          </div>
        </section>

        {/* FAQ Placeholder */}
        <section className="bg-gray-50 py-24 px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">FAQ</h2>
          <p className="max-w-3xl mx-auto text-gray-700">
            Have questions? Email us at <a className="text-indigo-600" href="mailto:support@fasho.co">support@fasho.co</a>
          </p>
        </section>
      </main>
    </>
  );
} 