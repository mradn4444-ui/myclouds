import { Link } from "wouter";
import { ArrowRight, FileText, Image, LayoutGrid, ListChecks, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function WelcomePage() {
  const { user, logout } = useAuth();
  const { profile } = useUserProfile();
  const name = profile.pseudo || profile.prenom || user?.email?.split("@")[0] || "toi";

  return (
    <main className="app-home-shell">
      <header className="app-home-topbar">
        <span className="app-home-brand">MYCLOUD</span>
        <div className="app-home-user">
          <span>{name}</span>
          <button type="button" onClick={logout}>Sortir</button>
        </div>
      </header>

      <section className="app-home-hero">
        <div className="app-home-copy">
          <span className="label-pill">Espace connecte</span>
          <h1>Bienvenue dans ton centre de travail intelligent.</h1>
          <p>
            Lance ton workspace, cree des notes, organise tes idees, genere des images
            et garde toutes tes conversations IA au meme endroit.
          </p>
          <div className="app-home-actions">
            <Link href="/app" className="hero-cta hero-cta-primary">
              Ouvrir le workspace <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="app-home-command">
          <div className="app-home-command-head">
            <Sparkles size={18} />
            <span>Un seul bouton IA</span>
          </div>
          <div className="app-home-command-grid">
            <div><LayoutGrid size={16} /><span>Organiser une idee</span></div>
            <div><FileText size={16} /><span>Creer des notes</span></div>
            <div><ListChecks size={16} /><span>Transformer en taches</span></div>
            <div><Image size={16} /><span>Generer des images</span></div>
          </div>
          <p>Le bouton flottant en bas a droite controle tout l'assistant.</p>
        </div>
      </section>
    </main>
  );
}
