import { EvidenceStrip } from "../components/EvidenceStrip";
import { Footer } from "../components/Footer";
import { FormulaWorkspace } from "../components/FormulaWorkspace";
import { Header } from "../components/Header";
import { Hero } from "../components/Hero";
import { HowItProves } from "../components/HowItProves";
import { MotionProvider } from "../components/MotionProvider";

export default function Page() {
  return (
    <MotionProvider>
      <Header />
      <main>
        <Hero />
        <div className="py-section">
          <FormulaWorkspace />
        </div>
        <HowItProves />
        <EvidenceStrip />
      </main>
      <Footer />
    </MotionProvider>
  );
}
