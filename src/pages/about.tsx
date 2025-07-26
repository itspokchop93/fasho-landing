import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function About() {
  return (
    <>
      <Head>
        <title>About FASHO.co - The Real Story Behind The Industry's Most Connected Spotify Marketing Service</title>
        <meta name="description" content="Learn about FASHO.co's founding team of industry veterans from Universal, Sony, RCA, Atlantic, and Roc Nation. Discover why we left the corporate world to help independent artists succeed." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#18192a] via-[#1a1b2e] via-[#16213e] to-[#0a0a13] relative">
        {/* Subtle overlay gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a13]/20 via-transparent to-[#18192a]/10"></div>
        
        <Header transparent={true} />
        
        <main className="pt-16 relative z-10" style={{ paddingTop: 'calc(4rem + 50px)' }}>
          {/* Hero Section */}
          <section className="py-1 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
                About <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">FASHO.co</span>
              </h1>
              <p className="text-xl md:text-2xl text-white mb-8">
                The Real Story Behind The Industry's Most Connected Spotify Marketing Service
              </p>
            </div>
          </section>

          {/* Main Content */}
          <section className="py-16 px-4">
            <div className="max-w-4xl mx-auto">
              
              {/* Origin Story */}
              <div className="mb-16">
                <p className="text-xl text-gray-300 leading-relaxed mb-6">
                  FASHO.co was born out of frustration.
                </p>
                <p className="text-xl text-gray-300 leading-relaxed mb-6">
                  In 2014, we watched talented artists pour their souls into their music, only to get chewed up by Spotify's algorithm. We saw fake promotion companies charging thousands for bot plays. We witnessed the music industry's gatekeepers keeping independent artists locked out of the playlists that actually matter.
                </p>
                <p className="text-xl text-gray-300 leading-relaxed">
                  We knew there had to be a better way.
                </p>
              </div>

              {/* Who We Are */}
              <div className="mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                  Who We <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Actually Are</span>
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed mb-6">
                  Our founding team isn't a bunch of random marketers who decided to try music promotion. We're industry veterans with decades of combined experience at Universal, Sony, RCA, Atlantic, and Roc Nation.
                </p>
                <p className="text-xl text-gray-300 leading-relaxed mb-6">
                  We've run campaigns for platinum artists. We've broken new talent from zero to global recognition. We've been in the rooms where playlist decisions get made.
                </p>
                <p className="text-xl text-gray-300 leading-relaxed mb-6">
                  But here's what bothered us: Why should only major label artists have access to these connections? Why should independent creators have to choose between staying invisible or getting scammed?
                </p>
                <p className="text-xl text-gray-300 leading-relaxed">
                  So we left the corporate world and built FASHO.co - taking our insider knowledge and relationships with us.
                </p>
              </div>

              {/* What Makes Us Different */}
              <div className="mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                  What Makes Us <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Different</span>
                </h2>
                
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                    <h3 className="text-xl font-bold text-white mb-4">Direct Curator Relationships</h3>
                                    <p className="text-lg text-gray-300 leading-relaxed">
                  We don't cold email playlist owners hoping for the best. We have their phone numbers. We've worked with them for years. When we call, they answer.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Zero Tolerance for Fake Growth</h3>
                <p className="text-lg text-gray-300 leading-relaxed">
                  No bots. No click farms. No shortcuts that risk your account. Every stream comes from a real person discovering your music through legitimate playlist placements.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Transparent Operations</h3>
                <p className="text-lg text-gray-300 leading-relaxed">
                  You see exactly which playlists add your track. You track your growth in real-time. No smoke and mirrors - just clear, verifiable results.
                </p>
              </div>
              
              <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Genre Expertise That Runs Deep</h3>
                <p className="text-lg text-gray-300 leading-relaxed">
                  From trap to classical, from true crime podcasts to meditation tracks - we've successfully marketed them all. Our network spans every corner of Spotify's ecosystem.
                </p>
                  </div>
                </div>
              </div>

              {/* Track Record */}
              <div className="mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                  Our Track Record <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Speaks Volumes</span>
                </h2>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                    <div className="text-3xl font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mb-2">
                      10+
                    </div>
                    <p className="text-lg text-gray-300">Years in the Spotify marketing game</p>
                  </div>
                  
                  <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                    <div className="text-3xl font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mb-2">
                      25,000+
                    </div>
                    <p className="text-lg text-gray-300">Artists have trusted us with their careers</p>
                  </div>
                  
                  <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                    <div className="text-3xl font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mb-2">
                      550B+
                    </div>
                    <p className="text-lg text-gray-300">of Streams delivered through organic playlist placements</p>
                  </div>
                  
                  <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                    <div className="text-3xl font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mb-2">
                      100%
                    </div>
                    <p className="text-lg text-gray-300">Success Rate on campaign delivery</p>
                  </div>
                  
                  <div className="text-center bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
                    <div className="text-3xl font-bold bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent mb-2">
                      48-Hour
                    </div>
                    <p className="text-lg text-gray-300">Results guaranteed on every campaign</p>
                  </div>
                </div>
              </div>

              {/* Promise */}
              <div className="mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                  The <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">FASHO.co Promise</span>
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed mb-6">
                  We built this company on a simple principle: Every artist deserves a fair shot at success.
                </p>
                <p className="text-xl text-gray-300 leading-relaxed mb-6">
                  You shouldn't need a major label deal to get on major playlists. You shouldn't have to risk your account with sketchy bot services. You shouldn't have to wait years for the algorithm to notice you.
                </p>
                <p className="text-xl text-gray-300 leading-relaxed">
                  With FASHO.co, you get the same tools and connections that major labels pay millions for - at a price that actually makes sense for independent artists.
                </p>
              </div>

              {/* CTA Section */}
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">
                  Ready to Take Control of Your <span className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">Spotify Growth?</span>
                </h2>
                <p className="text-xl text-gray-300 leading-relaxed mb-6">
                  Stop letting the algorithm decide your fate. Stop falling for fake promotion scams. Stop watching everyone else succeed while you're stuck in neutral.
                </p>
                <p className="text-xl text-gray-300 leading-relaxed mb-8">
                  Join the 25,000+ creators who chose FASHO.co and changed their careers forever.
                </p>
                <p className="text-xl text-gray-300 leading-relaxed mb-12">
                  Because your music deserves to be heard. And we're here to make sure it happens.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <a 
                    href="/" 
                    className="bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] text-black font-bold py-4 px-8 rounded-lg hover:opacity-90 transition-opacity text-xl"
                  >
                    START YOUR CAMPAIGN
                  </a>
                  <a 
                    href="/" 
                    className="border border-white/20 text-white font-bold py-4 px-8 rounded-lg hover:bg-white/5 transition-colors text-xl"
                  >
                    VIEW PACKAGES
                  </a>
                </div>
              </div>

              {/* Contact Info */}
              <div className="text-center">
                <p className="text-gray-400">
                  Questions? Hit us up at{' '}
                  <a href="mailto:support@fasho.co" className="text-[#59e3a5] hover:text-[#14c0ff] transition-colors">
                    support@fasho.co
                  </a>
                  {' '}or check out our{' '}
                  <a href="/faq" className="text-[#59e3a5] hover:text-[#14c0ff] transition-colors">
                    FAQ
                  </a>
                  . We're real people who actually respond.
                </p>
              </div>
            </div>
          </section>
        </main>
        
        <Footer />
      </div>
    </>
  );
} 