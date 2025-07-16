import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function DisclaimerPage() {
  return (
    <>
      <Head>
        <title>Disclaimer – Fasho.co</title>
        <meta name="description" content="Disclaimer for using Fasho.co's Spotify promotion services." />
      </Head>
      
      <Header transparent={false} />
      
      <main className="min-h-screen bg-black text-white pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
              DISCLAIMER
            </h1>
            <p className="text-gray-400 text-lg">Effective Date: 05/12/2025</p>
          </div>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
              
              <div>
                <p className="text-gray-300 leading-relaxed text-lg">
                  At FASHO.co, we believe in being upfront and real with you—just like we'd want for ourselves.
                </p>
                <p className="text-gray-300 leading-relaxed text-lg mt-4">
                  When it comes to marketing your music, here's the truth: Like any authentic marketing service, we don't guarantee results. No real company can ever promise exact outcomes, because every song, artist, and campaign is unique—and so are the tastes of playlist curators and listeners.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">Why We Don't Guarantee Results (And Why That's a Good Thing)</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>Let's be honest: if you ever run into a company promising you "guaranteed streams" or "guaranteed placements" no matter what… <span className="text-white font-semibold">run for the hills!</span> That usually means bots, fake plays, or shady methods that put your music career at risk.</p>
                  <p>At FASHO.co, our job is to get your music in front of real playlist curators who make their own choices. We pitch your song directly to genuine decision-makers. What happens next depends on the quality of your track and what those curators are looking for at the time.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">We Know What We're Doing</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>While we can't make promises about specific numbers or placements, what we can promise is this:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4 text-gray-300">
                    <li>We've been doing this for years and have built a massive network of trusted playlist curators.</li>
                    <li>Our artists have seen incredible results—many have reached new fans and achieved huge milestones with our help.</li>
                    <li>Your campaign will always be handled by experienced professionals who care about your growth.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">About Those Numbers</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>Any streams or placements mentioned on our website are estimates only. They're based on real data from past campaigns, but your results may differ.</p>
                  <p>We always strive for the best possible outcome, but music is an art—<span className="text-white font-semibold">not a science!</span></p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">Bottom Line</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>You're paying us to pitch your music to real Spotify playlist owners—not for guaranteed numbers. The rest depends on how your music connects with curators and audiences.</p>
                  <p>If you have questions about how our process works or want honest feedback about what to expect for your campaign, reach out anytime at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors font-semibold">support@fasho.co</a>. We'll always keep it real with you.</p>
                  <p className="text-white font-semibold text-lg">Thanks for trusting us with your music. Let's chase greatness together—the right way!</p>
                </div>
              </section>

              <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-xl p-6 border border-white/10 mt-8">
                <p className="text-white font-medium text-center">
                  By using FASHO.co's website and services you acknowledge that you have read and understood this Disclaimer.
                </p>
              </div>

            </div>
          </div>
        </div>

        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[100vh] bg-gradient-to-br from-[#59e3a5]/10 via-[#14c0ff]/5 via-[#8b5cf6]/10 to-[#59e3a5]/5 rounded-full blur-3xl opacity-50"></div>
        </div>
      </main>
      
      <Footer />
    </>
  );
} 