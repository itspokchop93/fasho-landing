import Head from "next/head";
import HeroSection from "../components/HeroSection";

export default function Home() {
  return (
    <>
      <Head>
        <title>Fasho.co – Spotify Promotion Services</title>
        <meta
          name="description"
          content="Promote your Spotify track with targeted campaigns and playlist pitching."
        />
      </Head>
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