"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
const menuItems = [
  { name: "NFTs", href: "/" },
  { name: "ORDINALS", href: "/ordinals" },
  { name: "quantum mechanics", href: "/mechanics" },
  { name: "art archive", href: "/art-by-waambat" },
  { name: "instagram", href: "https://www.instagram.com/waambat/" },
  { name: "blog + press", href: "/blog-press" },
  { name: "bio", href: "/bio-waambat" },
  { name: "collect + contact", href: "/contact-waambat" },
];
export default function Header({ preview = false }: { preview?: boolean }) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header className="mx-auto max-w-[1080px] px-5 pt-10 pb-8 text-center md:px-[60px] md:pt-[60px]">
      <Link
        href="/"
        className="text-waambat-logo inline-block text-[37px] leading-tight font-black tracking-[.03em]"
        aria-label="waambat home"
      >
        waambat
      </Link>
      <button
        ref={button}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls="site-menu"
        className="absolute top-12 right-5 text-sm md:hidden"
      >
        {open ? "× Close" : "Menu"}
      </button>
      <nav
        id="site-menu"
        aria-label="Main navigation"
        className={`${open ? "flex" : "hidden"} mt-7 flex-col items-center gap-x-6 gap-y-2 md:flex md:flex-row md:flex-wrap md:justify-center`}
      >
        {menuItems.map((item) => (
          <Link
            key={item.name}
            href={
              preview && item.href.startsWith("/")
                ? `/admin/preview?page=${item.href === "/" ? "nfts" : item.href.slice(1)}`
                : item.href
            }
            onClick={() => setOpen(false)}
            className="hover:text-waambat-hover py-1 text-[14px] text-[#ebebeb]"
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
