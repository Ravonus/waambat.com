import Header from "./Header";
import Footer from "./Footer";
import { getPublishedContent } from "~/server/content";
import type { Content } from "~/lib/content";
export default async function Layout({
  children,
  preview = false,
  navigation,
}: {
  children: React.ReactNode;
  preview?: boolean;
  navigation?: Content["navigation"];
}) {
  const awaitContent = await getPublishedContent();
  return (
    <div className="flex min-h-screen flex-col bg-black text-[#ebebeb]">
      <Header
        preview={preview}
        navigation={(navigation ?? awaitContent.navigation).filter(
          (entry) =>
            navigation ||
            !entry.href.startsWith("/") ||
            !awaitContent.pages.find((p) => `/${p.slug}` === entry.href)
              ?.archived,
        )}
      />
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1080px] flex-grow px-5 md:px-[60px]"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}
