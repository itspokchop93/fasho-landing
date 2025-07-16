import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy – Fasho.co</title>
        <meta name="description" content="Privacy policy for using Fasho.co's Spotify promotion services." />
      </Head>
      
      <Header transparent={false} />
      
      <main className="min-h-screen bg-black text-white pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent">
              PRIVACY POLICY
            </h1>
            <p className="text-gray-400 text-lg">Effective Date: 05/12/2025</p>
          </div>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none">
            <div className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-xl rounded-2xl p-8 border border-gray-600/30 space-y-8">
              
              <div>
                <p className="text-gray-300 leading-relaxed">
                  FASHO Inc. ("FASHO," "we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you visit FASHO.co or use our services.
                </p>
                <p className="text-gray-300 leading-relaxed mt-4">
                  By accessing or using our website or services, you consent to the practices described in this Privacy Policy.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">1. INFORMATION WE COLLECT</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>We may collect the following types of information from you:</p>
                  
                  <div>
                    <p className="font-semibold text-white mb-2">Personal Information:</p>
                    <p>When you register or purchase services, we may collect your name, email address, payment information (processed securely by third-party payment processors), and other information necessary to provide our services.</p>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-white mb-2">Technical Information:</p>
                    <p>We collect information about your device and interaction with our website (such as IP address, browser type, operating system, pages visited, and referring URLs) via cookies and analytics tools.</p>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-white mb-2">Communication:</p>
                    <p>Any correspondence sent to us (such as support emails) may be stored for record-keeping and customer service purposes.</p>
                  </div>
                  
                  <p className="font-medium text-white">We do not knowingly collect information from anyone under 18 years of age.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">2. HOW WE USE YOUR INFORMATION</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>Your information may be used to:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Process transactions and deliver services you request</li>
                    <li>Communicate with you regarding your account or orders</li>
                    <li>Respond to customer service inquiries</li>
                    <li>Improve our website and services through analytics</li>
                    <li>Comply with legal requirements</li>
                  </ul>
                  <p className="font-medium text-white">We will never sell or rent your personal information to third parties.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">3. HOW WE SHARE YOUR INFORMATION</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>We may share your information only in the following circumstances:</p>
                  
                  <div>
                    <p className="font-semibold text-white mb-2">Service Providers:</p>
                    <p>With trusted third-party vendors who assist in operating our website and processing payments. These providers are bound by confidentiality obligations.</p>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-white mb-2">Legal Compliance:</p>
                    <p>If required by law or subpoena, or to protect our rights or the rights of others.</p>
                  </div>
                  
                  <div>
                    <p className="font-semibold text-white mb-2">Business Transfers:</p>
                    <p>In the event FASHO is involved in a merger, acquisition, or asset sale, your data may be transferred as part of that transaction.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">4. COOKIES & TRACKING TECHNOLOGIES</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>We use cookies and similar technologies to:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Improve website functionality and performance</li>
                    <li>Analyze how users interact with FASHO.co</li>
                    <li>Tailor content and marketing</li>
                  </ul>
                  <p>You can control cookie preferences through your browser settings; however, disabling cookies may affect your experience.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">5. DATA SECURITY</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>We implement industry-standard security measures to protect your personal information against unauthorized access, alteration, disclosure or destruction.</p>
                  <p>However, no method of transmission over the internet or electronic storage is 100% secure—use our services at your own risk.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">6. INTERNATIONAL USERS</h2>
                <p className="text-gray-300 leading-relaxed">
                  FASHO.co is operated from the United States but is available worldwide. By using our site from outside the US, you consent to the transfer and processing of your information in the US.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">7. YOUR RIGHTS & CHOICES</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>Depending on your location (e.g., California residents under CCPA; EU/UK users under GDPR), you may have rights regarding your personal data:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Access the personal data we hold about you</li>
                    <li>Request correction or deletion of your data</li>
                    <li>Opt out of certain data uses (such as marketing emails)</li>
                    <li>Request restriction or object to certain processing</li>
                    <li>Receive a copy of your data in a portable format</li>
                  </ul>
                  <p>To exercise these rights, contact us at <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a>.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">8. THIRD-PARTY LINKS</h2>
                <p className="text-gray-300 leading-relaxed">
                  Our website may contain links to third-party websites not controlled by FASHO Inc. We are not responsible for their privacy practices; please review their policies separately.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">9. CHANGES TO THIS PRIVACY POLICY</h2>
                <div className="text-gray-300 leading-relaxed space-y-4">
                  <p>We reserve the right to update this Privacy Policy at any time. Changes take effect once posted on this page; it is your responsibility to review periodically.</p>
                  <p>Your continued use of our website/services after changes constitutes acceptance of those changes.</p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-[#59e3a5] mb-4">10. CONTACT US</h2>
                <div className="text-gray-300 leading-relaxed space-y-2">
                  <p>For questions about this Privacy Policy or to exercise your rights:</p>
                  <p>Email: <a href="mailto:support@fasho.co" className="text-[#14c0ff] hover:text-[#59e3a5] transition-colors">support@fasho.co</a></p>
                  <p>Mailing Address: PO Box 407, Los Angeles CA 95001</p>
                </div>
              </section>

              <div className="bg-gradient-to-r from-[#59e3a5]/10 to-[#14c0ff]/10 rounded-xl p-6 border border-white/10 mt-8">
                <p className="text-white font-medium text-center">
                  By using FASHO.co's website and services you acknowledge that you have read, understood, and agree to this Privacy Policy.
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