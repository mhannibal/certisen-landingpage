import { Cinema } from "@/components/sections/cinema";
import { Contact, Footer } from "@/components/sections/contact";
import { Features } from "@/components/sections/features";
import { Gap } from "@/components/sections/gap";
import { HeroFilm } from "@/components/sections/hero-film";
import { Navbar } from "@/components/sections/navbar";
import { Positioning } from "@/components/sections/positioning";
import { Problem } from "@/components/sections/problem";
import { Roadmap } from "@/components/sections/roadmap";
import { Solution } from "@/components/sections/solution";
import { TrustStrip } from "@/components/sections/trust-strip";

export default function Home() {
  return (
    <main className="relative">
      <Navbar />
      <HeroFilm />
      <TrustStrip />
      <Problem />
      <Gap />
      <Solution />
      <Features />
      <Cinema />
      <Positioning />
      <Roadmap />
      <Contact />
      <Footer />
    </main>
  );
}
