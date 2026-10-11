import Header from "./Header";
import Footer from "./Footer";
export default function Layout({
  children,
  preview = false,
}: {
  children: React.ReactNode;
  preview?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-black text-[#ebebeb]">
      <Header preview={preview} />
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
