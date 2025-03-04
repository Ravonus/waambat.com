import React from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Header />
      <main className="mt-[64px] flex-grow">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
