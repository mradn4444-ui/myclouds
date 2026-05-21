import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Sparkles, Layers, FileText, Globe, ShieldCheck, Zap, ListChecks, LayoutGrid, Cpu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      navigate("/app", { replace: true });
    }
  }, [loading, user, navigate]);

  return (
    <main className="homepage-shell">
      <section className="homepage-hero">
        <div className="homepage-hero-copy">
          <span className="label-pill">Workspace IA premium</span>
          <h1>MyClouds transforme vos idées en projets organisés automatiquement.</h1>
          <p>Un espace intelligent où l'IA crée des notes, résumés, tâches, diagrammes et documents visuels à partir de vos idées.</p>

          <div className="homepage-hero-actions">
            <Link href="/auth" className="hero-cta hero-cta-primary">Se connecter</Link>
            <Link href="/auth/signup" className="hero-cta hero-cta-secondary">Créer un compte</Link>
          </div>

          <div className="homepage-hero-stats">
            <div>
              <strong>AI Workspace</strong>
              <span>Centre intelligent et contextuel</span>
            </div>
            <div>
              <strong>Organisation automatique</strong>
              <span>Projets, tâches, résumés</span>
            </div>
            <div>
              <strong>Mémoires persistantes</strong>
              <span>Multi-conversations séparées</span>
            </div>
          </div>
        </div>

        <div className="homepage-hero-panel">
          <div className="hero-panel-card">
            <div className="hero-panel-title">
              <Sparkles className="hero-panel-icon" />
              <div>
                <span>Assistant intelligent</span>
                <strong>Organise votre idée automatiquement</strong>
              </div>
            </div>
            <div className="hero-panel-content">
              <p>« Je veux lancer une app de productivité avec un tableau de bord futuriste. »</p>
              <ul>
                <li>Résumé clair</li>
                <li>Plan projet</li>
                <li>Checklist prête</li>
                <li>Visualisation simple</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="homepage-features">
        <div className="feature-card feature-card-accent">
          <div className="feature-icon"><Layers /></div>
          <h3>Organisation automatique</h3>
          <p>Transformez vos idées en catégories, dossiers, tâches et documents structurés sans effort.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><FileText /></div>
          <h3>Documents et PDF</h3>
          <p>Générez des notes, résumés et plans visuels qui restent propres et faciles à parcourir.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><ListChecks /></div>
          <h3>Tâches intelligentes</h3>
          <p>Convertissez automatiquement les idées en actions prioritaires et listes de suivi.</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon"><Globe /></div>
          <h3>Browser intégré</h3>
          <p>Ajoutez du contenu web en un clic et conservez tout dans votre espace de travail.</p>
        </div>
      </section>

      <section className="homepage-visuals">
        <div className="homepage-visuals-card">
          <div>
            <span>Visual AI</span>
            <strong>Mini diagrammes et explications dans vos conversations</strong>
          </div>
          <p>Des réponses plus claires, plus visuelles et faciles à lire, avec des blocs, des tableaux et des schémas.</p>
        </div>
        <div className="homepage-visuals-grid">
          <div className="visual-cell"><Cpu /> <span>Contexte utilisateur</span></div>
          <div className="visual-cell"><Zap /> <span>Actions automatiques</span></div>
          <div className="visual-cell"><ShieldCheck /> <span>Sécurité des sessions</span></div>
          <div className="visual-cell"><LayoutGrid /> <span>Design responsive</span></div>
        </div>
      </section>
    </main>
  );
}
