import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function AuthenticityGuaranteePage() {
  return (
    <>
      <Head>
        <title>Authenticity Guarantee – Fasho.co</title>
        <meta name="description" content="Our guarantee for 100% real streams and real playlists. No bots, no fake plays - just authentic Spotify promotion." />
      </Head>
      
      <Header transparent={false} />
      
      <main className="min-h-screen bg-black text-white pt-24 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent leading-tight">
              Authenticity Guarantee
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              At FASHO.co, we're all about <span className="text-[#59e3a5] font-semibold">REAL</span> results for real artists. We know there's a lot of noise out there—and even more scams that promise the world but deliver nothing but fake plays and risky shortcuts.
            </p>
            <p className="text-xl md:text-2xl text-white mt-4 font-bold -mb-5">
              That's not us. Here's our Authenticity Guarantee:
            </p>
          </div>

          {/* Main Promise */}
          <div className="text-center mb-16">
            <div className="bg-gradient-to-r from-[#59e3a5]/20 via-[#14c0ff]/20 to-[#8b5cf6]/20 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/20 relative overflow-hidden">
              {/* Background glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 blur-3xl"></div>
              
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-black mb-2 text-white">
                  100% Real Streams.
                </h2>
                <h2 className="text-3xl md:text-5xl font-black mb-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
                  100% Real Playlists.
                </h2>
                <p className="text-lg md:text-xl text-gray-200 max-w-3xl mx-auto leading-relaxed">
                  When you work with FASHO, you can rest easy knowing every stream and every playlist placement we deliver comes from actual Spotify users and real playlist curators. We never use bots, click farms, or shady "black hat" methods that risk your reputation or Spotify account.
                </p>
              </div>
            </div>
          </div>

          {/* Why This Matters Section */}
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-white">
              Why This <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Matters</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* No Bots Card */}
              <div className="group relative bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/10 hover:border-[#59e3a5]/30 transition-all duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-[#59e3a5]/5 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="text-4xl md:text-5xl mb-4">🚫</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4 text-[#59e3a5]">No Bots. No Click Farms.</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Your music will never be artificially inflated by fake users. Every play comes from a genuine listener on Spotify.
                  </p>
                </div>
              </div>

              {/* Real Curators Card */}
              <div className="group relative bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/10 hover:border-[#14c0ff]/30 transition-all duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-[#14c0ff]/5 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="text-4xl md:text-5xl mb-4">🎵</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4 text-[#14c0ff]">Real Playlist Curators Only.</h3>
                  <p className="text-gray-300 leading-relaxed">
                    All of our connections are with legitimate playlist owners who review your music personally before deciding to add it to their playlists.
                  </p>
                </div>
              </div>

              {/* Safe Account Card */}
              <div className="group relative bg-gradient-to-br from-gray-900/80 to-gray-800/60 backdrop-blur-xl rounded-2xl p-6 md:p-8 border border-white/10 hover:border-[#8b5cf6]/30 transition-all duration-500 hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-[#8b5cf6]/5 via-transparent to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <div className="relative z-10">
                  <div className="text-4xl md:text-5xl mb-4">🛡️</div>
                  <h3 className="text-xl md:text-2xl font-bold mb-4 text-[#8b5cf6]">Your Account is Safe.</h3>
                  <p className="text-gray-300 leading-relaxed">
                    Our process is fully compliant with Spotify's terms of service. You never have to worry about bans, penalties, or sudden drops in your stats.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Our Promise Section */}
          <div className="mb-16">
            <div className="bg-gradient-to-br from-gray-900/70 to-gray-800/50 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-white/20">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 text-white">
                Our <span className="bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] bg-clip-text text-transparent">Promise</span>
              </h2>
              
              <div className="text-center mb-8">
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] rounded-full flex items-center justify-center text-black font-bold text-xl shrink-0 mt-1">✓</div>
                  <div>
                    <p className="text-white font-semibold text-xl leading-relaxed">Every campaign is built on real promotion and authentic outreach</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#14c0ff] to-[#8b5cf6] rounded-full flex items-center justify-center text-black font-bold text-xl shrink-0 mt-1">✓</div>
                  <div>
                    <p className="text-white font-semibold text-xl leading-relaxed">No fake streams, no shortcuts—ever</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#8b5cf6] to-[#59e3a5] rounded-full flex items-center justify-center text-black font-bold text-xl shrink-0 mt-1">✓</div>
                  <div>
                    <p className="text-white font-semibold text-xl leading-relaxed">Your career and your credibility are always protected</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Transparency Section */}
          <div className="mb-16">
            <div className="text-center bg-gradient-to-r from-[#59e3a5]/10 via-[#14c0ff]/10 to-[#8b5cf6]/10 backdrop-blur-xl rounded-2xl p-8 md:p-12 border border-white/15">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-6">
                Transparency is Our <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Strength</span>
              </h3>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
                If you ever have questions about how our process works or want to know more about how we keep things 100% legit, just reach out! We're transparent about what we do and proud of the results we help artists achieve.
              </p>
            </div>
          </div>

          {/* Questions Section */}
          <div className="text-center mb-12">
            <div className="bg-gradient-to-r from-gray-900/90 to-gray-800/80 backdrop-blur-xl rounded-2xl p-8 md:p-12 border border-white/20">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">Questions?</h3>
              <p className="text-lg text-gray-300 mb-6">
                If you have any doubts or want more details on our authenticity standards, email us anytime at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors font-semibold">support@fasho.co</a>.
              </p>
              <div className="w-full h-1 bg-gradient-to-r from-[#59e3a5] via-[#14c0ff] to-[#8b5cf6] rounded-full mb-6"></div>
              <p className="text-xl md:text-2xl font-bold text-white">
                With FASHO.co, you always get the <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">real deal</span>—guaranteed.
              </p>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mb-20">
            <a 
              href="/#hero-search"
              className="inline-block bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold px-8 md:px-12 py-4 md:py-5 rounded-xl md:rounded-2xl text-lg md:text-xl hover:shadow-2xl hover:shadow-[#14c0ff]/30 transition-all duration-300 transform hover:scale-105 active:scale-95"
            >
              Start My Campaign Now →
            </a>
          </div>
        </div>

        {/* Background Effects */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-[#8b5cf6]/10 to-[#59e3a5]/10 rounded-full blur-3xl opacity-60"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[100vh] bg-gradient-to-br from-[#59e3a5]/5 via-[#14c0ff]/5 via-[#8b5cf6]/5 to-[#59e3a5]/5 rounded-full blur-3xl opacity-40"></div>
        </div>
      </main>
      
      <Footer />
    </>
  );
} 