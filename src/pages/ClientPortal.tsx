import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { Services } from "../components/Services";
import { Lounge } from "../components/Lounge";

export function ClientPortal() {
  return (
    <div className="min-h-screen bg-negro">
      <Header />
      <Hero />
      <Services />
      <Lounge />
    </div>
  );
}