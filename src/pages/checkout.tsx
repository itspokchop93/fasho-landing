import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import PackageCard from "../components/PackageCard";

export default function Checkout() {
  const router = useRouter();
  const { tracks: tracksParam, title, artist, imageUrl } = router.query;
  let parsedTracks: any[] = [];
  if (tracksParam && typeof tracksParam === "string") {
    try {
      parsedTracks = JSON.parse(tracksParam);
    } catch {
      parsedTracks = [];
    }
  }

  const packages = [
    {
      name: "Starter",
      price: "$49",
      features: [
        "Playlist pitching",
        "Email support",
        "Basic analytics",
      ],
    },
    {
      name: "Growth",
      price: "$99",
      features: [
        "All Starter features",
        "Influencer outreach",
        "Weekly reporting",
      ],
    },
    {
      name: "Pro",
      price: "$199",
      features: [
        "All Growth features",
        "Dedicated account manager",
        "In-depth analytics dashboard",
      ],
    },
  ];

  return (
    <>
      <Head>
        <title>Select a Package – Fasho.co</title>
      </Head>
      <main className="py-24 px-4 max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">
          Choose your promotion package
        </h1>

        {/* Track summary */}
        {parsedTracks.length > 0 ? (
          <div className="flex gap-6 mb-12 flex-wrap justify-center">
            {parsedTracks.map((t, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <Image
                  src={t.imageUrl}
                  alt={`${t.title} cover art`}
                  width={80}
                  height={80}
                  className="rounded-md"
                />
                <div>
                  <p className="font-semibold">{t.title}</p>
                  <p className="text-gray-600">{t.artist}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          title && imageUrl && (
            <div className="flex items-center gap-4 mb-12 justify-center">
              <Image
                src={imageUrl as string}
                alt={`${title} cover art`}
                width={80}
                height={80}
                className="rounded-md"
              />
              <div>
                <p className="font-semibold">{title}</p>
                <p className="text-gray-600">{artist}</p>
              </div>
            </div>
          )
        )}

        <div className="flex flex-col md:flex-row gap-8 justify-center">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.name}
              name={pkg.name}
              price={pkg.price}
              features={pkg.features}
            />
          ))}
        </div>
      </main>
    </>
  );
} 