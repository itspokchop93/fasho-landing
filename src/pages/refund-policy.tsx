import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function RefundPolicyPage() {
  return (
    <>
      <Head>
        <title>Refund Policy – Fasho.co</title>
        <meta name="description" content="30-day satisfaction guarantee and refund policy for Fasho.co's Spotify promotion services." />
      </Head>
      
      <Header transparent={false} />
      
      <main className="min-h-screen bg-black text-white pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
              Refund Policy
            </h1>
            <p className="text-gray-400 text-lg">Effective Date: 05/12/2025</p>
          </div>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
              
              <div>
                <p className="text-gray-300 leading-relaxed text-lg">
                  At FASHO.co, we want you to feel confident and happy about your investment in your music career. We're committed to giving every artist the best shot at success—but if things don't turn out the way you hoped, we've got your back.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">30-Day Satisfaction Guarantee</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p className="text-lg">If you're not satisfied with your results, you can request a <span className="text-white font-semibold">full refund within 30 days</span> of your campaign starting—no hassle, no hard feelings.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">How It Works:</h2>
                <div className="text-gray-300 leading-relaxed space-y-6">
                  
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Campaigns Start Fast:</h3>
                    <p>Most campaigns begin within 24 hours of your purchase. Your 30-day refund period starts the moment your campaign officially kicks off (not when you purchase).</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Simple Process:</h3>
                    <p>If you'd like a refund for any reason, just email us at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors font-semibold">support@fasho.co</a> within 30 days of your campaign start date. Include your order details and let us know why you're not satisfied—so we can keep improving our service for everyone.</p>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-3">Full Refund:</h3>
                    <p>If your request meets these simple conditions, we'll process your full refund back to your original payment method. <span className="text-white font-semibold">No hoops to jump through.</span></p>
                  </div>
                  
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">A Few Things to Note</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <ul className="list-disc list-inside space-y-3 ml-4 text-gray-300">
                    <li>Refund requests made after the 30-day window cannot be processed.</li>
                    <li>Only the original purchaser is eligible for a refund.</li>
                    <li>We can only refund payments made directly through FASHO.co using a valid credit or debit card.</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">Questions?</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>If you're unsure about your campaign's start date or eligibility for a refund—or just want to talk to a real human—reach out anytime at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors font-semibold">support@fasho.co</a>. We're here to help!</p>
                  <p className="text-white font-semibold text-lg">We appreciate every artist who trusts us with their music. If it's not working out, we'll make it right.</p>
                </div>
              </section>

              <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-xl p-6 border border-white/10 mt-8">
                <p className="text-white font-medium text-center text-lg">
                  Your satisfaction is our priority. We're confident in our service, but we believe you should be too.
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