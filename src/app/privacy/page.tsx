import Navbar from "@/components/layout/Navbar";
import Link from "next/link";

const LAST_UPDATED = "March 31, 2026";
const COMPANY = "Delphi Oracle";
const EMAIL = "privacy@delphioracle.ai";

interface Section {
  id: string;
  title: string;
  content: React.ReactNode;
}

const sections: Section[] = [
  {
    id: "overview",
    title: "Overview",
    content: (
      <p>Delphi Oracle (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights. We designed this product with privacy as a core principle — not an afterthought.</p>
    ),
  },
  {
    id: "data-collected",
    title: "Data we collect",
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li><strong>Account data:</strong> Name and email address when you register.</li>
        <li><strong>Profile data:</strong> Career history, skills, education, and bio — only what you voluntarily enter.</li>
        <li><strong>Simulation data:</strong> The decisions and future trees you generate, stored so you can revisit them.</li>
        <li><strong>API keys:</strong> If you choose to save them — encrypted with AES-256-GCM and never readable by our staff.</li>
        <li><strong>Usage data:</strong> Anonymous page views and feature usage for product improvement.</li>
      </ul>
    ),
  },
  {
    id: "not-collected",
    title: "What we do NOT collect",
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li>We do not sell your data to third parties.</li>
        <li>We do not use your simulation content to train AI models.</li>
        <li>We do not store plaintext API keys — only AES-256 encrypted ciphertext.</li>
        <li>We do not track you across other websites.</li>
      </ul>
    ),
  },
  {
    id: "ai-keys",
    title: "API key security",
    content: (
      <p>When you save an AI provider key (Claude, OpenAI, etc.), it is encrypted in our database using AES-256-GCM with a key derived from your session secret via scrypt. The key is decrypted only in server memory during AI calls and is never logged, exposed in responses, or accessible to our team. You can delete your keys at any time from Settings &rarr; AI Providers.</p>
    ),
  },
  {
    id: "data-use",
    title: "How we use your data",
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li>To provide and improve the simulation experience.</li>
        <li>To personalize predictions based on your profile.</li>
        <li>To send transactional emails (password resets, account notices).</li>
        <li>To debug issues and improve reliability.</li>
      </ul>
    ),
  },
  {
    id: "third-parties",
    title: "Third-party services",
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li><strong>Neon (database):</strong> Your data is stored on Neon&apos;s PostgreSQL infrastructure in the US-East-1 region.</li>
        <li><strong>AI providers:</strong> When you run a simulation, your decision text and profile summary are sent to your chosen AI provider (Claude/OpenAI). This is governed by their respective privacy policies.</li>
        <li><strong>Vercel (hosting):</strong> The application runs on Vercel&apos;s edge infrastructure.</li>
      </ul>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights",
    content: (
      <ul className="list-disc list-inside space-y-2">
        <li><strong>Access:</strong> Download all your data from Settings &rarr; Data &amp; Privacy &rarr; Export.</li>
        <li><strong>Deletion:</strong> Delete your account and all associated data permanently from Settings &rarr; Data &amp; Privacy &rarr; Delete account.</li>
        <li><strong>Correction:</strong> Update your profile and account details at any time.</li>
        <li><strong>Portability:</strong> Your export includes all simulation trees as structured JSON.</li>
      </ul>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <p>We use a single session cookie for authentication. We do not use advertising or tracking cookies. The session cookie is HttpOnly, Secure, and SameSite=Lax.</p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    content: (
      <p>Questions about this policy? Email us at <a href={`mailto:${EMAIL}`} className="text-oracle-400 hover:underline">{EMAIL}</a>.</p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-void-950 flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-12">
        <div className="mb-10">
          <p className="text-xs font-medium text-oracle-500 uppercase tracking-widest mb-3">Legal</p>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
          <p className="text-text-muted text-sm">Last updated {LAST_UPDATED}</p>
        </div>

        <div className="space-y-10">
          {sections.map((s) => (
            <section key={s.id} id={s.id}>
              <h2 className="text-base font-semibold text-text-primary mb-3 pb-2 border-b border-border-subtle">
                {s.title}
              </h2>
              <div className="text-sm text-text-secondary leading-relaxed space-y-2">
                {s.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border-subtle flex items-center justify-between text-sm text-text-muted">
          <span>{COMPANY} · {LAST_UPDATED}</span>
          <Link href="/terms" className="text-oracle-400 hover:text-oracle-300 transition-colors">Terms of Service &rarr;</Link>
        </div>
      </div>
    </div>
  );
}
