"use client";
import { useSyncExternalStore } from "react";
import Script from "next/script";
// Original public-site loader, including Adobe's published-domain license check.
// Do not replace with a guessed kit ID or copy the font binaries.
export const originalFontLoader =
  "https://use.typekit.net/ik/3eJ-tbPxUa4PUXUmyITRpKjc3z_g6GpNarn8QfJQKnXfenbIfFHN4UJLFRbh52jhWDm8wQiRFQ8KFDj3FAbuw2IhZeIhZ29UjU7gMkG0jAFu-WsoShFGZAsude80ZkoRdhXCHKoyjamTiY8Djhy8ZYmC-Ao1Oco8if37OcBDOcu8OfG0de80ZYFypWFRdhi1-AoDO1FUiABkZWF3jAF8OcFzdP37O1FUiABkZWF3jAF8ShFGZAsude80ZkoRdhXCjAFu-WsoShFGZAsude80ZkoRdhXCjAFu-WsoShFGZAsude80Zko0ZWbCjWw0dA9Cde80ZYFypWFRdhi1-AoDO1FUiABkZWF3jAF8OcFzdPUCdhFydeyzSabCSaBujW48SagyjhmDjhy8ZYmC-Ao1OcFzdPUajABljcBXOcFzdPUaiaS0jAFu-WsoShFGZAsude80ZkoRdhXCiaiaOcBRiA8XpWFR-emqiAUTdcS0dcmXOYiaikoySkolZPUaiaS0de80ZYFypWFRdhi1-AoDO1FUiABkZWF3jAF8OcFzdPUaiaS0SaBujW48SagyjhmDjhy8ZYmC-Ao1OcFzdPUaiaS0ihBydA4yifoRdhXK2eBljcNoOA80de80ZPJsj14ydcszdKu1ScNXZWFUiA9KgcmuScN3jPGHfHdZMsMMeMb6MKG4fOUbIMIjMkMfH6qJ3BMbMs64JMJ7fbKTpsMfeMw6MKG4fHToIMJjgfMfH6qJ7YqbMy6YJMJ7f6RRy6IbMy6FJMJ7f6R8y6IbMy6sJMHbMScWTZve.js";
export default function OriginalFonts({ enabled }: { enabled: boolean }) {
  const licensedHost = useSyncExternalStore(
    () => () => {},
    () =>
      enabled &&
      ["waambat.com", "www.waambat.com"].includes(window.location.hostname),
    () => false,
  );
  if (!licensedHost) return null;
  return (
    <Script
      id="waambat-original-fonts"
      src={originalFontLoader}
      strategy="afterInteractive"
      onLoad={() => {
        (window as Window & { Typekit?: { load: () => void } }).Typekit?.load();
      }}
    />
  );
}
