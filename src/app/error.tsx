"use client";
import SiteLink from "./components/navigation/SiteLink";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="mx-auto max-w-[1080px] px-5 py-16">
      <h1 className="text-waambat-pink text-2xl">This page could not load</h1>
      <p>Your navigation did not finish. Try again or return home.</p>
      <button type="button" onClick={reset} className="text-waambat-link mr-5">
        Try again
      </button>
      <SiteLink href="/">Return home</SiteLink>
    </main>
  );
}
