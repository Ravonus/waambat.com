import type { NextPage } from "next";
import Layout from "~/app/components/Layout";
import ArtworkCard from "~/app/components/ArtworkCard";

interface Artwork {
  title: string;
  year: string;
  description: string;
  tokenLink: string;
  videoSrc: string;
  poster: string;
}

const artworks: Artwork[] = [
  {
    title: "Feels 404",
    year: "2023",
    description:
      "Video Painting (Quantum, Series G) – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/feels404",
    videoSrc: "https://i.imgur.com/bNlZWHY.mp4",
    poster: "/thumbnails/1.png",
  },
  {
    title: "Animal Spirits",
    year: "2022",
    description:
      "Video Painting (Quantum, Series F) – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/animal-spirits",
    videoSrc: "https://i.imgur.com/f6s856X.mp4",
    poster: "/thumbnails/2.png",
  },
  {
    title: "Swap Exchange",
    year: "2022",
    description:
      "Video Painting (Quantum, Series E) – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/swap-exchange",
    videoSrc: "https://i.imgur.com/a38BLir.mp4",
    poster: "/thumbnails/3.png",
  },
  {
    title: "Autocorrection",
    year: "2022",
    description:
      "Video Painting (Quantum, Series D) – Seamless Loop, 2160x2160",
    tokenLink: "https://nft.artsy.net/asset/autocorrection",
    videoSrc: "https://i.imgur.com/5oHMMfH.mp4",
    poster: "/thumbnails/4.png",
  },
  {
    title: "Enter Boi AMA",
    year: "2022",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/enter-boi-ama",
    videoSrc: "https://i.imgur.com/zclilHq.mp4",
    poster: "/thumbnails/5.png",
  },
  {
    title: "Fap Disco",
    year: "2022",
    description:
      "Video Painting (Quantum, Series C) – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/fap-disco",
    videoSrc: "https://i.imgur.com/lpyf8NE.mp4",
    poster: "/thumbnails/6.png",
  },
  {
    title: "Haptic Feedback",
    year: "2021",
    description:
      "Video Painting (Quantum, Series B) – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/haptic-feedback",
    videoSrc: "https://i.imgur.com/kraOC6E.mp4",
    poster: "/thumbnails/7.png",
  },
  {
    title: "Swipe Swag",
    year: "2021",
    description:
      "Video Painting (Quantum, Series A) – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/swipe-swag",
    videoSrc: "https://i.imgur.com/q02r3Ja.mp4",
    poster: "/thumbnails/8.png",
  },
  {
    title: "Profits",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/profits",
    videoSrc: "https://i.imgur.com/0oqBS1z.mp4",
    poster: "/thumbnails/9.png",
  },
  {
    title: "Net Melt",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/net-melt",
    videoSrc: "https://i.imgur.com/rt1I53R.mp4",
    poster: "/thumbnails/10.png",
  },
  {
    title: "Troll Crash",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/troll-crash",
    videoSrc: "https://i.imgur.com/yNizVps.mp4",
    poster: "/thumbnails/11.png",
  },
  {
    title: "GOAT",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/goat",
    videoSrc: "https://i.imgur.com/KMyQNc2.mp4",
    poster: "/thumbnails/12.png",
  },
  {
    title: "Cord Cutter",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/cord-cutter",
    videoSrc: "https://i.imgur.com/F9gCVez.mp4",
    poster: "/thumbnails/13.png",
  },
  {
    title: "Hard Launch",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://objkt.com/asset/hard-launch",
    videoSrc: "https://i.imgur.com/HO67SIX.mp4",
    poster: "/thumbnails/14.png",
  },
  {
    title: "Fucking Future",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://opensea.io/asset/fucking-future",
    videoSrc: "https://i.imgur.com/UojHuj5.mp4",
    poster: "/thumbnails/15.png",
  },
  {
    title: "Joys of Lore",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://opensea.io/asset/joys-of-lore",
    videoSrc: "https://i.imgur.com/gCwY2MQ.mp4",
    poster: "/thumbnails/16.png",
  },
  {
    title: "Meta Matters",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://opensea.io/asset/meta-matters",
    videoSrc: "https://i.imgur.com/YPUR7Lt.mp4",
    poster: "/thumbnails/17.png",
  },
  {
    title: "Cheers, Chad",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://opensea.io/asset/cheers-chad",
    videoSrc: "https://i.imgur.com/JKc1k3C.mp4",
    poster: "/thumbnails/18.png",
  },
  {
    title: "Catfish Glitch",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://opensea.io/asset/catfish-glitch",
    videoSrc: "https://i.imgur.com/OSNGtQs.mp4",
    poster: "/thumbnails/19.png",
  },
  {
    title: "Axiom GL0w Up",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://foundation.app/@waambat/axiom-gl0w-up",
    videoSrc: "https://i.imgur.com/7ouIHyN.mp4",
    poster: "/thumbnails/20.png",
  },
  {
    title: "Deep Linking",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://niftygateway.com/asset/deep-linking",
    videoSrc: "https://i.imgur.com/QY2Y73n.mp4",
    poster: "/thumbnails/21.png",
  },
  {
    title: "Sus Singularity",
    year: "2021",
    description: "Video Painting – Seamless Loop, 2160x2160",
    tokenLink: "https://foundation.app/@waambat/sus-singularity",
    videoSrc: "https://i.imgur.com/b8XNIJY.mp4",
    poster: "/thumbnails/22.png",
  },
  {
    title: "Abacus RAM",
    year: "2017",
    description:
      "Infinite Loop Video Painting – Exhibited at LA Art Show 2017 and Installation Gallery, Los Angeles",
    tokenLink: "https://waambat.com/abacus-ram",
    videoSrc: "https://i.imgur.com/mh4T2To.mp4",
    poster: "/thumbnails/23.png",
  },
];

const Home: NextPage = () => {
  return (
    <Layout>
      <div className="mt-8 flex w-full flex-col items-center">
        <p className="text-gray-300 mb-4 text-center text-sm">
          &gt;&gt;&gt;&gt;&gt; click through any artwork to open the original
          token page &lt;&lt;&lt;&lt;&lt;
        </p>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-16">
        {artworks.map((art, idx) => (
          <div key={idx} className="mb-12">
            <ArtworkCard artwork={art} />
          </div>
        ))}
      </div>
    </Layout>
  );
};

export default Home;
