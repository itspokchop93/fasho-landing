import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

const ContactPage = () => {
  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [contactFormLoading, setContactFormLoading] = useState(false);
  const [contactFormMessage, setContactFormMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Contact form handlers
  const handleContactFormChange = (field: string, value: string) => {
    setContactForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear any existing messages when user starts typing
    if (contactFormMessage) {
      setContactFormMessage(null);
    }
  };

  const handleContactFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactFormLoading(true);
    setContactFormMessage(null);

    try {
      // Validate form
      if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.subject.trim() || !contactForm.message.trim()) {
        setContactFormMessage({
          type: 'error',
          text: 'Please fill in all fields before submitting.'
        });
        setContactFormLoading(false);
        return;
      }

      console.log('📞 CONTACT PAGE: Submitting contact form:', {
        name: contactForm.name,
        email: contactForm.email,
        subject: contactForm.subject,
        messageLength: contactForm.message.length
      });

      const response = await fetch('/api/contact-support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit support request');
      }

      console.log('✅ CONTACT PAGE: Contact form submitted successfully:', data.ticketId);

      setContactFormMessage({
        type: 'success',
        text: `Your support request has been submitted successfully! Ticket ID: #${data.ticketId}. Our team will respond within 24 hours.`
      });

      // Reset form
      setContactForm({
        name: '',
        email: '',
        subject: 'General Inquiry',
        message: ''
      });

    } catch (error) {
      console.error('🚨 CONTACT PAGE: Contact form submission error:', error);
      setContactFormMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to submit support request. Please try again or email support@fasho.co directly.'
      });
    } finally {
      setContactFormLoading(false);
    }
  };

  // FAQ data from dashboard
  const faqData = [
    {
      question: "⏱️ How quickly will my music be placed on playlists?",
      answer: "Your campaign begins within 24 hours of purchase, and your first playlist placements typically occur within 48-72 hours from then. Timing can vary depending on curator availability and your specific genre. Most placements happen even faster, while some very rare cases may take up to a week as we ensure proper targeting."
    },
    {
      question: "📈 When will I start seeing streams from playlist placements?",
      answer: "Streams begin immediately once your track is added to a playlist. The volume depends on the playlist size and listener activity, but you should see streaming data appear in your Spotify for Artists dashboard within 24-48 hours of placement."
    },
    {
      question: "📋 How do you submit music to playlists?",
      answer: "We use a personalized outreach approach, contacting each curator individually through phone, email, or direct messaging. Our team has established relationships with playlist curators built over 10+ years in the industry. This personal approach results in higher acceptance rates compared to mass submission methods."
    },
    {
      question: "📊 How can I track my playlist placements?",
      answer: "We recommend all of our clients use the Spotify for Artists (free app/web platform) to monitor which playlists have added your music. This tool shows playlist names, follower counts, and streaming data."
    },
    {
      question: "🌍 Do you work with international artists?",
      answer: "Yes, we work with artists, podcasters, and record labels worldwide. Our playlist network includes curators from multiple countries and regions, covering both local and international playlists."
    },
    {
      question: "🎼 What genres do you support?",
      answer: "We work with all music genres and sub-genres. Our curator network spans hip-hop, pop, rock, electronic, country, jazz, classical, indie, metal, folk, reggae, Latin, world music, and more. We match your music with genre-appropriate playlists."
    },
    {
      question: "💰 Will I earn royalties from the streams?",
      answer: "Yes, all streams generated from playlist placements count as regular Spotify streams and generate royalties through your normal distribution service (DistroKid, CD Baby, etc.). Royalty rates follow Spotify's standard payment structure."
    },
    {
      question: "🛡️ Is this service safe for my Spotify account?",
      answer: "Yes, our service complies with Spotify's terms of service. We work exclusively with legitimate playlists managed by real curators - no bots, artificial streams, or policy violations. All placements are organic and curator-driven."
    },
    {
      question: "🎧 Do you work with podcasts too?",
      answer: "Yes, we have curators who specialize in podcast playlists across various topics and formats. The same process applies - we'll match your podcast with relevant playlist curators in your niche."
    },
    {
      question: "⏰ How long does the campaign last?",
      answer: "All of our marketing campaigns run in 30-day cycles. We will continue to market your material until it reaches the estimated plays included in your package tier, and then marketing will cease. We guarantee you'll reach the estimated amount of streams by the end of the 30-day cycle. But almost all campaigns are completed within only 7-10 days with all streams delivered and clients seeing their full results."
    },
    {
      question: "📞 How do I contact support?",
      answer: "Email support@fasho.co for any questions or account issues. Our team typically responds within 24 hours during business days (M-F)."
    }
  ];

  return (
    <>
      <Head>
        <title>Contact Us - FASHO</title>
        <meta name="description" content="Get in touch with FASHO support. We're here to help with your music promotion campaigns, billing questions, and technical issues." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="min-h-screen bg-gradient-to-b from-[#18192a] to-[#0a0a13]">
        <Header />
        
        <div className="pt-32 pb-16">
          {/* Hero Section */}
          <div className="text-center mb-16 px-4 py-12">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent leading-tight px-4 py-2 -mt-[60px]">
              Contact Us
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Get in touch with our support team. We're here to help with your music promotion campaigns.
            </p>
          </div>

          {/* Contact Form Section */}
          <div className="max-w-7xl mx-auto px-4 mb-20">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl font-bold text-white mb-6">Get in Touch</h3>
                
                {/* Success/Error Message */}
                {contactFormMessage && (
                  <div className={`mb-6 p-4 rounded-xl border ${
                    contactFormMessage.type === 'success' 
                      ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                      : 'bg-red-500/10 border-red-500/30 text-red-400'
                  }`}>
                    <p className="text-sm">{contactFormMessage.text}</p>
                  </div>
                )}
                
                <form onSubmit={handleContactFormSubmit} className="space-y-6">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Name</label>
                    <input 
                      type="text" 
                      value={contactForm.name}
                      onChange={(e) => handleContactFormChange('name', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                      placeholder="Your full name"
                      required
                      disabled={contactFormLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
                    <input 
                      type="email" 
                      value={contactForm.email}
                      onChange={(e) => handleContactFormChange('email', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                      placeholder="your@email.com"
                      required
                      disabled={contactFormLoading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Subject</label>
                    <select 
                      value={contactForm.subject}
                      onChange={(e) => handleContactFormChange('subject', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#59e3a5] transition-colors"
                      required
                      disabled={contactFormLoading}
                    >
                      <option value="Campaign Support">Campaign Support</option>
                      <option value="Billing Question">Billing Question</option>
                      <option value="Technical Issue">Technical Issue</option>
                      <option value="General Inquiry">General Inquiry</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Message</label>
                    <textarea 
                      rows={5}
                      value={contactForm.message}
                      onChange={(e) => handleContactFormChange('message', e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#59e3a5] transition-colors resize-none"
                      placeholder="How can we help you?"
                      required
                      disabled={contactFormLoading}
                    ></textarea>
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={contactFormLoading}
                    className="w-full bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] hover:from-[#4fd499] hover:to-[#0ea5e9] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center"
                  >
                    {contactFormLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Send Message'
                    )}
                  </button>
                </form>
              </div>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <h4 className="text-xl font-bold text-white mb-6">Contact Information</h4>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">📧</span>
                      <span className="text-gray-300">support@fasho.co</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">⏰</span>
                      <span className="text-gray-300">Monday to Friday 9am to 7pm PST</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <h4 className="text-xl font-bold text-white mb-6">Response Times</h4>
                  <div className="space-y-3">
                    <p className="text-gray-300">We generally respond to all support ticket requests within 24hrs during the business week.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="max-w-7xl mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-black mb-4 bg-gradient-to-r from-[#59e3a5] to-[#14c0ff] bg-clip-text text-transparent leading-tight px-4 py-2">
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-300">
                Get answers to common questions about our music promotion services
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {faqData.map((faq, index) => (
                <div key={index} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <h3 className="text-lg font-semibold text-white mb-3">{faq.question}</h3>
                  <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <Footer />
      </div>
    </>
  );
};

export default ContactPage; 