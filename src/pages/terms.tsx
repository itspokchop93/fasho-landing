import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function TermsPage() {
  return (
    <>
      <Head>
        <title>Terms & Conditions – Fasho.co</title>
        <meta name="description" content="Terms and conditions for using Fasho.co's Spotify promotion services." />
      </Head>
      
      <Header transparent={false} />
      
      <main className="min-h-screen bg-black text-white pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
              TERMS & CONDITIONS
            </h1>
            <p className="text-gray-400 text-lg">Effective Date: 05/12/2025</p>
          </div>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
              
              <div>
                <p className="text-gray-300 leading-relaxed">
                  Welcome to FASHO.co, operated by FASHO Inc. ("FASHO," "we," "us," or "our"). Please read these Terms & Conditions ("Terms") carefully before accessing or using our website and services. By registering for an account or purchasing any services from FASHO.co, you agree to be bound by these Terms.
                </p>
                <p className="text-gray-300 leading-relaxed mt-4">
                  If you do not agree with any part of these Terms, please do not use our website or services.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">1. COMPANY INFORMATION</h2>
                <div className="text-gray-300 leading-relaxed">
                  <p>FASHO Inc.</p>
                  <p>PO Box 407</p>
                  <p>Los Angeles, CA 95001</p>
                  <p>Contact: <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a></p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">2. ELIGIBILITY & USER ACCOUNTS</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>You must be at least 18 years old and complete registration to use any services offered on FASHO.co. By registering, you certify that all information provided is accurate and kept up to date.</p>
                  <p>You are responsible for maintaining the confidentiality of your account login details and for all activities under your account.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">3. SERVICES PROVIDED</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>FASHO provides Spotify promotion and digital marketing services, pitching users' music to third-party playlist curators worldwide.</p>
                  <p>We do not guarantee placement or specific results; final decisions rest with external playlist owners.</p>
                  <p>We reserve the right to modify, refuse, or discontinue services at any time at our sole discretion.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">4. PAYMENTS & REFUNDS</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>All purchases are one-time payments made via major credit or debit cards (no PayPal or other payment methods accepted).</p>
                  <div>
                    <p className="font-semibold text-white mb-2">Refund Policy:</p>
                    <p>If you are unhappy with your results, you may request a refund within thirty (30) days from the start of your campaign. Refunds will only be issued if requested within this window.</p>
                    <p className="mt-2">To request a refund, contact us at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a> with your order details.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">5. INTELLECTUAL PROPERTY</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>All content on FASHO.co—including but not limited to text, graphics, logos, images, videos, and software—is the exclusive property of FASHO Inc., protected by U.S. and international copyright laws.</p>
                  <p>Our company name ("FASHO"), logo, and associated trademarks are protected intellectual property of FASHO Inc.</p>
                  <p>You may not reproduce, distribute, modify, transmit, reuse, download, repost, copy, or use any content from our site without our prior written consent.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">6. USER CONTENT</h2>
                <p className="text-gray-300 leading-relaxed">
                  FASHO.co does not allow user-generated content on its website or platforms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">7. DISCLAIMERS & LIMITATION OF LIABILITY</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <div>
                    <p className="font-semibold text-white">No Guarantee of Results:</p>
                    <p>We strive to facilitate placements but cannot guarantee specific outcomes from playlist submissions; all placement decisions are made by third-party playlist curators.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Third-Party Services:</p>
                    <p>We are not responsible for actions or decisions made by external playlist owners.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">No Warranties:</p>
                    <p>Our website and services are provided "as-is" without warranties of any kind.</p>
                  </div>
                  <div>
                    <p className="font-semibold text-white">Limitation of Liability:</p>
                    <p>To the maximum extent permitted by law, FASHO Inc., its officers, directors, employees, agents, or affiliates shall not be liable for any direct, indirect, incidental, special, consequential or punitive damages resulting from your access to or use of (or inability to access or use) our website or services.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">8. GOVERNING LAW</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>These Terms shall be governed by and construed in accordance with the laws of the State of California, USA without regard to its conflict of law principles.</p>
                  <p>Any dispute arising under these Terms shall be subject to the exclusive jurisdiction of courts located in California.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">9. CHANGES TO TERMS</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>We reserve the right to update or modify these Terms at any time without prior notice. It is your responsibility to review this page periodically for updates.</p>
                  <p>Continued use of our website or services after changes constitutes acceptance of those changes.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">10. CONTACT US</h2>
                <div className="text-gray-300 leading-relaxed space-y-2">
                  <p>For questions about these Terms & Conditions or your account with us:</p>
                  <p>Email: <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a></p>
                  <p>Mailing Address: PO Box 407, Los Angeles CA 95001</p>
                </div>
              </section>

              <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-xl p-6 border border-white/10 mt-8">
                <p className="text-white font-medium text-center">
                  By using FASHO.co's website and services you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
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