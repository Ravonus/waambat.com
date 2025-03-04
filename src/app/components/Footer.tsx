import React from "react";

const tags = [
  "cryptoart",
  "NFT",
  "Foundation",
  "Foundation.app",
  "FND",
  "token",
  "digital art",
  "video art",
  "infinite loop",
  "waambat",
  "Lindsay Scoggins",
  "ethereum",
  "eth",
  "blockchain",
  "crypto artist",
  "fine art",
  "ordinals",
];

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-gray-800 bg-black py-4">
      <div className="mx-auto max-w-7xl px-4 text-center text-xs text-gray-400">
        {tags.join(" | ")}
      </div>
    </footer>
  );
};

export default Footer;
