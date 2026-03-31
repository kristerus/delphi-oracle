"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Zap,
  Bell,
  Database,
  Shield,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Download,
  AlertTriangle,
  X,
  Camera,
  Save,
  Lock,
  ChevronDown,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { authClient } from "@/lib/auth-client";

type Tab = "account" | "providers" | "notifications" | "data";

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "account", label: "Account", icon: User },
  { id: "providers", label: "AI Providers", icon: Zap },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "data", label: "Data & Privacy", icon: Database },
];

const AI_PROVIDERS = [
  {
    id: "claude",
    name: "Claude (Anthropic)",
    description: "Powers deep reasoning and nuanced future analysis",
    placeholder: "sk-ant-api03-…",
    color: "oracle",
    recommended: true,
  },
  {
    id: "openai",
    name: "OpenAI GPT-4o",
    description: "Fast and capable for branching scenario generation",
    placeholder: "sk-proj-…",
    color: "signal",
    recommended: false,
  },
  {
    id: "custom",
    name: "Custom endpoint",
    description: "OpenAI-compatible API endpoint (Ollama, Together, etc.)",
    placeholder: "https://api.example.com/v1",
    color: "nebula",
    recommended: false,
  },
];

const NOTIFICATION_PREFS = [
  {
    id: "sim_complete",
    label: "Simulation complete",
    description: "Get notified when a future tree finishes generating",
    defaultOn: true,
  },
  {
    id: "weekly_digest",
    label: "Weekly digest",
    description: "A summary of your simulations and new branches",
    defaultOn: false,
  },
  {
    id: "product_updates",
    label: "Product updates",
    description: "New features and improvements to Delphi Oracle",
    defaultOn: true,
  },
];

/* ─── Account tab ─────────────────────────────────────────────────────────── */
function AccountTab() {
  const { data: session } = authClient.useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  // Sync name when session loads
  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await authClient.updateUser({ name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently ignore — Better Auth updateUser rarely fails
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    setChangingPassword(true);
    setPasswordError(null);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      if (error) throw new Error(error.message ?? "Failed to update password");
      setPasswordSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setShowPasswordForm(false);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  };

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-1">Account details</h2>
        <p className="text-text-muted text-sm">Update your name, email, and avatar</p>
      </div>

      {/* Avatar */}
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="relative">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt="Avatar"
                className="w-16 h-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-oracle-700 to-nebula-700 flex items-center justify-center text-white text-xl font-bold">
                {userInitial}
              </div>
            )}
            <button
              className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg glass-dark border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
              title="Change avatar"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary">{session?.user?.name ?? "—"}</p>
            <p className="text-xs text-text-muted">{session?.user?.email ?? "—"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Display name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 focus:bg-void-800 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={session?.user?.email ?? ""}
              disabled
              className="w-full bg-void-800/30 border border-border rounded-xl px-4 py-3 text-sm text-text-muted outline-none cursor-not-allowed"
            />
            <p className="text-xs text-text-ghost mt-1">Email changes require re-authentication</p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-oracle-500 hover:bg-oracle-400 disabled:opacity-50 disabled:cursor-not-allowed text-void-950 font-semibold text-sm transition-all duration-200"
          >
            {saved ? (
              <><Check className="w-4 h-4" /> Saved</>
            ) : saving ? (
              "Saving…"
            ) : (
              <><Save className="w-4 h-4" /> Save changes</>
            )}
          </button>

          {/* Change password */}
          <div className="mt-6 pt-6 border-t border-border-subtle">
            <button
              onClick={() => setShowPasswordForm((v) => !v)}
              className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Change password
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPasswordForm ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showPasswordForm && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">Current password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-2.5 text-sm text-text-primary outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">New password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all"
                      />
                    </div>
                    {passwordError && <p className="text-xs text-hazard-400">{passwordError}</p>}
                    {passwordSaved && <p className="text-xs text-signal-400 flex items-center gap-1"><Check className="w-3 h-3" /> Password updated</p>}
                    <button
                      onClick={handlePasswordChange}
                      disabled={!currentPassword || !newPassword || changingPassword}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-void-800/80 border border-border hover:border-border-bright text-text-secondary hover:text-text-primary text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {changingPassword ? "Updating…" : "Update password"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── AI Providers tab ────────────────────────────────────────────────────── */
function ProvidersTab() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, { maskedKey: string; id: string }>>({});
  const [removing, setRemoving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/profile/keys")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: { id: string; provider: string; maskedKey: string }[]) => {
        const map: Record<string, { maskedKey: string; id: string }> = {};
        for (const entry of data) {
          map[entry.provider] = { maskedKey: entry.maskedKey, id: entry.id };
        }
        setSavedKeys(map);
      })
      .catch(() => {});
  }, []);

  const handleSave = async (id: string) => {
    const key = keys[id]?.trim();
    if (!key) return;
    setSaving((p) => ({ ...p, [id]: true }));
    setErrors((p) => ({ ...p, [id]: "" }));
    try {
      const res = await fetch("/api/profile/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id, key }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to save");
      }
      const result = await res.json().catch(() => ({}));
      setSaved((p) => ({ ...p, [id]: true }));
      // Refresh saved key entry
      if (result.maskedKey) {
        setSavedKeys((p) => ({ ...p, [id]: { maskedKey: result.maskedKey, id: result.id ?? p[id]?.id ?? "" } }));
      } else {
        fetch("/api/profile/keys")
          .then((r) => (r.ok ? r.json() : []))
          .then((data: { id: string; provider: string; maskedKey: string }[]) => {
            const map: Record<string, { maskedKey: string; id: string }> = {};
            for (const entry of data) {
              map[entry.provider] = { maskedKey: entry.maskedKey, id: entry.id };
            }
            setSavedKeys(map);
          })
          .catch(() => {});
      }
      setKeys((p) => ({ ...p, [id]: "" }));
      setTimeout(() => setSaved((p) => ({ ...p, [id]: false })), 2500);
    } catch (err) {
      setErrors((p) => ({ ...p, [id]: err instanceof Error ? err.message : "Save failed" }));
    } finally {
      setSaving((p) => ({ ...p, [id]: false }));
    }
  };

  const handleRemove = async (id: string) => {
    const entry = savedKeys[id];
    if (!entry) return;
    setRemoving((p) => ({ ...p, [id]: true }));
    try {
      const res = await fetch(`/api/profile/keys?id=${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to remove");
      }
      setSavedKeys((p) => {
        const next = { ...p };
        delete next[id];
        return next;
      });
    } catch (err) {
      setErrors((p) => ({ ...p, [id]: err instanceof Error ? err.message : "Remove failed" }));
    } finally {
      setRemoving((p) => ({ ...p, [id]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-1">AI Providers</h2>
        <p className="text-text-muted text-sm">Configure your API keys for simulation generation</p>
      </div>

      {/* Security note */}
      <div className="glass rounded-xl p-4 border border-oracle-800/25">
        <div className="flex items-start gap-3">
          <Shield className="w-4 h-4 text-oracle-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-text-secondary mb-0.5">Keys are encrypted at rest</p>
            <p className="text-xs text-text-muted leading-relaxed">
              API keys are encrypted with AES-256 before storage. Decrypted only in memory during AI calls — never logged or transmitted.
            </p>
          </div>
        </div>
      </div>

      {AI_PROVIDERS.map((provider) => {
        const existing = savedKeys[provider.id];
        return (
          <div key={provider.id} className="glass-card rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-semibold text-text-primary">{provider.name}</p>
                  {provider.recommended && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-oracle-900/50 border border-oracle-800/40 text-oracle-400 font-medium">
                      Recommended
                    </span>
                  )}
                  {existing && !saved[provider.id] && (
                    <span className="flex items-center gap-1 text-xs text-signal-400 font-medium">
                      <Check className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted">{provider.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                {saved[provider.id] && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 text-xs text-signal-400"
                  >
                    <Check className="w-3 h-3" /> Saved
                  </motion.span>
                )}
                {existing && (
                  <button
                    onClick={() => handleRemove(provider.id)}
                    disabled={removing[provider.id]}
                    className="p-1.5 rounded-lg text-text-muted hover:text-hazard-400 hover:bg-hazard-700/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Remove saved key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={visible[provider.id] ? "text" : "password"}
                  value={keys[provider.id] ?? ""}
                  onChange={(e) => setKeys((p) => ({ ...p, [provider.id]: e.target.value }))}
                  placeholder={existing ? `Saved — type to replace (${existing.maskedKey})` : provider.placeholder}
                  className="w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 rounded-xl pl-4 pr-11 py-2.5 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setVisible((p) => ({ ...p, [provider.id]: !p[provider.id] }))}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                >
                  {visible[provider.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => handleSave(provider.id)}
                disabled={!keys[provider.id]?.trim() || saving[provider.id]}
                className="px-4 py-2.5 rounded-xl bg-oracle-500/10 hover:bg-oracle-500/20 border border-oracle-800/40 hover:border-oracle-700/60 text-oracle-400 hover:text-oracle-300 text-sm font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {saving[provider.id] ? "Saving…" : "Save"}
              </button>
            </div>
            {errors[provider.id] && (
              <p className="text-hazard-400 text-xs mt-1.5">{errors[provider.id]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Notifications tab ───────────────────────────────────────────────────── */
function NotificationsTab() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_PREFS.map((p) => [p.id, p.defaultOn]))
  );
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.notificationPrefs) {
          setPrefs((prev) => ({ ...prev, ...data.notificationPrefs }));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const toggle = (id: string) => {
    setPrefs((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationPrefs: next }),
        }).catch(() => {});
      }, 800);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-1">Notifications</h2>
        <p className="text-text-muted text-sm">Choose what you&apos;re notified about</p>
      </div>

      <div className="glass-card rounded-2xl divide-y divide-border-subtle overflow-hidden">
        {NOTIFICATION_PREFS.map((pref) => (
          <div key={pref.id} className={`flex items-center justify-between px-5 py-4 transition-opacity ${loaded ? "" : "opacity-50"}`}>
            <div>
              <p className="text-sm font-medium text-text-primary">{pref.label}</p>
              <p className="text-xs text-text-muted mt-0.5">{pref.description}</p>
            </div>
            <button
              onClick={() => toggle(pref.id)}
              className={`relative w-10 h-5.5 rounded-full transition-all duration-200 shrink-0 ml-4 ${
                prefs[pref.id] ? "bg-oracle-500" : "bg-void-700 border border-border"
              }`}
              style={{ height: "22px", width: "40px" }}
              aria-checked={prefs[pref.id]}
              role="switch"
            >
              <span
                className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow transition-all duration-200 ${
                  prefs[pref.id] ? "left-[19px]" : "left-0.5"
                }`}
                style={{ width: "18px", height: "18px" }}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Data tab with Danger Zone ───────────────────────────────────────────── */
function DataTab() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== "delete my account") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      // Sign out and redirect
      await authClient.signOut();
      window.location.href = "/";
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleExport = async () => {
    const res = await fetch("/api/user/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `delphi-oracle-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary mb-1">Data & Privacy</h2>
        <p className="text-text-muted text-sm">Manage your data and account lifecycle</p>
      </div>

      {/* Export data */}
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary mb-1">Export your data</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Download a complete archive of your simulations, profile data, and settings as JSON.
            </p>
          </div>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-void-800/80 border border-border hover:border-border-bright text-text-secondary hover:text-text-primary text-sm font-medium transition-all duration-200 shrink-0">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-px bg-hazard-700/30" />
          <span className="text-xs font-medium text-hazard-500 uppercase tracking-wider px-2">Danger zone</span>
          <div className="flex-1 h-px bg-hazard-700/30" />
        </div>

        <div
          className="rounded-2xl p-5 border"
          style={{
            background: "oklch(11% 0.035 268 / 0.5)",
            borderColor: "oklch(40% 0.130 20 / 0.2)",
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-hazard-400 mb-1">Delete account</p>
              <p className="text-xs text-text-muted leading-relaxed">
                Permanently delete your account and all associated simulations. This action cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-hazard-700/15 border border-hazard-600/25 hover:bg-hazard-700/25 hover:border-hazard-600/40 text-hazard-400 text-sm font-medium transition-all duration-200 shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-void-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative glass-card rounded-2xl p-7 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: "oklch(28% 0.100 25 / 0.3)",
                      border: "1px solid oklch(40% 0.130 20 / 0.3)",
                    }}
                  >
                    <AlertTriangle className="w-5 h-5 text-hazard-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">Delete account?</h3>
                    <p className="text-text-muted text-sm">This cannot be undone</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-text-muted hover:text-text-primary transition-colors p-1 ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-sm text-text-secondary mb-4 leading-relaxed">
                All your simulations, profile data, and settings will be permanently deleted. To confirm, type{" "}
                <code>delete my account</code> below.
              </p>

              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="delete my account"
                className="w-full bg-void-800/60 border border-border hover:border-hazard-600/50 focus:border-hazard-600/70 rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200 mb-4 font-mono"
              />

              <button
                onClick={handleDelete}
                disabled={confirmText !== "delete my account" || deleting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-hazard-600/20 border border-hazard-600/30 hover:bg-hazard-600/30 hover:border-hazard-500/40 text-hazard-400 font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting…" : "Permanently delete account"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Page ────────────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("account");

  const tabContent = {
    account: <AccountTab />,
    providers: <ProvidersTab />,
    notifications: <NotificationsTab />,
    data: <DataTab />,
  };

  return (
    <div className="min-h-screen bg-void-950 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="mb-7">
          <h1 className="text-xl font-bold text-text-primary mb-1">Settings</h1>
          <p className="text-text-muted text-sm">Manage your account, providers, and preferences</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar nav */}
          <nav className="w-44 shrink-0 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium text-left transition-all duration-150 ${
                    active
                      ? "bg-oracle-900/40 border border-oracle-800/50 text-oracle-400"
                      : "text-text-muted hover:text-text-secondary hover:bg-void-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {tabContent[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
