import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { Services } from "../components/Services";
import { Lounge } from "../components/Lounge";
import { Footer } from "../components/Footer";
import { WhatsAppButton } from "../components/WhatsAppButton";

export function HomePage() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-negro">
      <Header />
      <Hero />
      <Services />
      <Lounge />
      <Footer />
      <WhatsAppButton />
    </div>
  );
}