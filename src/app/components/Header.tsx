"use client";

import React, { useState } from "react";
import Link from "next/link";
import { HiOutlineMenu, HiX } from "react-icons/hi";

const menuItems = [
  { name: "NFTs", href: "https://objkt.com/collection/waambat" },
  { name: "ORDINALS", href: "https://ordinals.com" },
  { name: "quantum mechanics", href: "https://waambat.com/quantum-mechanics" },
  { name: "art archive", href: "https://waambat.com/art-archive" },
  { name: "instagram", href: "https://instagram.com/waambat" },
  { name: "blog + press", href: "https://waambat.com/blog-press" },
  { name: "bio", href: "https://waambat.com/bio" },
  { name: "collect + contact", href: "https://waambat.com/collect-contact" },
];

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-gray-800 bg-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className="text-waambat-pink text-3xl font-bold tracking-widest"
        >
          WAAMBAT
        </Link>

        {/* Hamburger icon (shown on mobile) */}
        <button
          className="text-3xl text-white focus:outline-none sm:hidden"
          onClick={toggleMenu}
          aria-label="Toggle Menu"
        >
          {isOpen ? <HiX /> : <HiOutlineMenu />}
        </button>

        {/* Desktop Menu */}
        <nav className="hidden space-x-6 text-sm font-medium uppercase sm:flex">
          {menuItems.map((item, idx) => (
            <a
              key={idx}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-waambat-pink text-white transition-colors"
            >
              {item.name}
            </a>
          ))}
        </nav>
      </div>

      {/* Mobile overlay menu */}
      {isOpen && (
        <div className="border-t border-gray-800 bg-black sm:hidden">
          <nav className="flex flex-col space-y-2 px-4 py-2">
            {menuItems.map((item, idx) => (
              <a
                key={idx}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-waambat-pink text-base text-white transition-colors"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
