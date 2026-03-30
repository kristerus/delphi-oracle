"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Globe, Briefcase, GraduationCap, Zap, ArrowRight, Sparkles, Check } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import DataInputForm from "@/components/profile/DataInputForm";
import DigitalFootprint from "@/components/profile/DigitalFootprint";

type Tab = "manual" | "scraped" | "keys";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "manual", label: "My Profile", icon: User },
  { id: "scraped", label: "Digital Footprint", icon: Globe },
  { id: "keys", label: "AI Keys", icon: Zap },
];

const AI_PROVIDERS = [
  { id: "claude", name: "Claude (Anthropic)", placeholder: "sk-ant-api03-...", color: "oracle" },
  { id: "openai", name: "OpenAI GPT-4", placeholder: "sk-proj-...", color: "signal" },
  { id: "custom", name: "Custom endpoint", placeholder: "https://api.example.com/v1", color: "nebula" },
];

function AIKeyForm() {
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [keys, setKeys] = useState<Record<string, string>>({});

  const handleSave = (providerId: string) => {
    setSaved((p) => ({ ...p, [providerId]: true }));
    setTimeout(() => setSaved((p) => ({ ...p, [providerId]: false })), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="glass rounded-xl p-4 mb-5 border border-oracle-800/30">
        <div className="flex items-start gap-3">
          <Zap className="w-4 h-4 text-oracle-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm text-text-secondary font-medium mb-0.5">Your keys stay private</p>
            <p className="text-xs text-text-muted leading-relaxed">
              API keys are encrypted with AES-256 before storage. They&apos;re only decrypted in memory during AI calls and never logged or shared.
            </p>
          </div>
        </div>
      </div>

      {AI_PROVIDERS.map((provider) => (
        <div key={provider.id} className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-text-primary">{provider.name}</p>
            {saved[provider.id] && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1 text-xs text-signal-400"
              >
                <Check className="w-3 h-3" /> Saved
              </motion.span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={keys[provider.id] ?? ""}
              onChange={(e) => setKeys((p) => ({ ...p, [provider.id]: e.target.value }))}
              placeholder={provider.placeholder}
              className="flex-1 bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200 font-mono"
            />
            <button
              onClick={() => handleSave(provider.id)}
              disabled={!keys[provider.id]}
              className="px-4 py-2.5 rounded-xl bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700 text-oracle-400 text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>("manual");

  const steps = [
    { label: "Account created", done: true },
    { label: "Profile filled", done: false },
    { label: "First simulation", done: false },
  ];

  return (
    <div className="min-h-screen bg-void-950">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-text-primary mb-1">Your profile</h1>
          <p className="text-text-secondary text-sm">
            The more context you provide, the more accurate your simulations will be.
          </p>
        </motion.div>

        {/* Onboarding progress */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="glass-card rounded-xl p-4 mb-7 flex items-center gap-4 flex-wrap"
        >
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Sparkles className="w-4 h-4 text-oracle-500" />
            <span className="font-medium text-text-secondary">Setup progress</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {steps.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                {i > 0 && <div className="w-8 h-px bg-border-subtle" />}
                <div className={`flex items-center gap-1.5 text-xs ${step.done ? "text-signal-400" : "text-text-ghost"}`}>
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center ${step.done ? "bg-signal-600" : "bg-void-700 border border-border"}`}>
                    {step.done ? <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /> : <span className="text-void-400">{i + 1}</span>}
                  </div>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
          <a href="/dashboard" className="ml-auto flex items-center gap-1 text-xs text-oracle-500 hover:text-oracle-400 transition-colors font-medium">
            Go to dashboard <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-void-900/60 rounded-xl p-1 mb-6 border border-border-subtle w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-oracle-500/15 border border-oracle-800/50 text-oracle-400"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {activeTab === "manual" && <DataInputForm />}
          {activeTab === "scraped" && <DigitalFootprint />}
          {activeTab === "keys" && <AIKeyForm />}
        </motion.div>
      </div>
    </div>
  );
}
