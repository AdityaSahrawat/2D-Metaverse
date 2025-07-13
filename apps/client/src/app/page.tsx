import Head from "next/head";
import Header from "@/components/section/header"
import Hero from "@/components/section/hero"
import Features from "@/components/section/featrue"
import CTA from "@/components/section/cts"
import Footer from "@/components/section/footer"

const Index = () =>  {

  return (
    <>
      <Head>
        <title>Step Into the Metaverse | MyMetaverseApp</title>
        <meta name="description" content="Explore virtual worlds, connect with people, and create your own space in MyMetaverseApp." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="author" content="MyMetaverse Team" />
        <meta name="keywords" content="metaverse, virtual world, avatar, multiplayer, 3D space, realtime, build worlds" />

        {/* Open Graph Meta */}
        <meta property="og:title" content="Step Into the Metaverse | MyMetaverseApp" />
        <meta property="og:description" content="Create and explore interactive virtual worlds in real-time." />
        <meta property="og:image" content="/images/og-banner.png" />
        <meta property="og:url" content="https://mymetaverseapp.com" />
        <meta property="og:type" content="website" />

        {/* Twitter Meta */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Step Into the Metaverse | MyMetaverseApp" />
        <meta name="twitter:description" content="Explore and interact in immersive virtual spaces." />
        <meta name="twitter:image" content="/images/og-banner.png" />

        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-slate-900">
        <Header />
        <Hero />
        <Features />
        <CTA />
        <Footer/>
      </div>
    </>
  );
};

export default Index;