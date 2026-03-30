"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Save, Loader2, Briefcase, GraduationCap, Code2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const schema = z.object({
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  githubUsername: z.string().optional(),
  experience: z.array(
    z.object({
      company: z.string().min(1, "Company required"),
      title: z.string().min(1, "Title required"),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      description: z.string().optional(),
    })
  ),
  education: z.array(
    z.object({
      institution: z.string().min(1, "Institution required"),
      degree: z.string().optional(),
      field: z.string().optional(),
      startYear: z.string().optional(),
      endYear: z.string().optional(),
    })
  ),
  skills: z.string().optional(), // comma-separated
  riskTolerance: z.enum(["low", "medium", "high"]).optional(),
  timeHorizon: z.enum(["1y", "3y", "5y", "10y"]).optional(),
});

type FormData = z.infer<typeof schema>;

export default function DataInputForm() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      experience: [{ company: "", title: "" }],
      education: [{ institution: "" }],
    },
  });

  const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({ control, name: "experience" });
  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control, name: "education" });

  // Load profile from API on mount
  useEffect(() => {
    fetch("/api/profile")
      .then((r) => {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        reset({
          bio: data.bio ?? "",
          location: data.location ?? "",
          website: data.website ?? "",
          linkedinUrl: data.linkedinUrl ?? "",
          githubUsername: data.githubUsername ?? "",
          experience:
            data.experience?.length > 0
              ? data.experience.map((e: Record<string, string>) => ({
                  company: e.company ?? "",
                  title: e.title ?? "",
                  startDate: e.startDate ?? "",
                  endDate: e.endDate ?? "",
                  description: e.description ?? "",
                }))
              : [{ company: "", title: "" }],
          education:
            data.education?.length > 0
              ? data.education.map((e: Record<string, string | number>) => ({
                  institution: e.institution ?? "",
                  degree: e.degree ?? "",
                  field: e.field ?? "",
                  startYear: e.startYear?.toString() ?? "",
                  endYear: e.endYear?.toString() ?? "",
                }))
              : [{ institution: "" }],
          skills: Array.isArray(data.skills) ? data.skills.join(", ") : (data.skills ?? ""),
          riskTolerance: data.riskTolerance ?? "medium",
          timeHorizon: data.timeHorizon ?? "3y",
        });
      })
      .catch((err) => {
        setLoadError(err.message);
      });
  }, [reset]);

  const onSubmit = async (data: FormData) => {
    setSaving(true);
    try {
      const skillsArray = data.skills
        ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const education = data.education.map((e) => ({
        ...e,
        startYear: e.startYear ? parseInt(e.startYear) : undefined,
        endYear: e.endYear ? parseInt(e.endYear) : undefined,
      }));

      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, skills: skillsArray, education }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      setSaved(true);
      reset(data); // clear isDirty
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full bg-void-800/60 border border-border hover:border-border-bright focus:border-oracle-700 focus:bg-void-800 rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-ghost outline-none transition-all duration-200";
  const labelClass = "block text-sm font-medium text-text-secondary mb-1.5";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7 max-w-2xl">
      {loadError && (
        <div className="text-xs text-hazard-400 px-1">
          Could not load profile: {loadError}
        </div>
      )}

      {/* Bio & location */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">Basic info</h2>

        <div>
          <label className={labelClass}>Short bio</label>
          <textarea
            {...register("bio")}
            rows={3}
            placeholder="Software engineer with 6 years in fintech, transitioning toward AI products…"
            className={`${inputClass} resize-none`}
          />
          <p className="text-xs text-text-ghost mt-1">Up to 500 chars. Be specific — the AI uses this for better predictions.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Location</label>
            <input {...register("location")} type="text" placeholder="San Francisco, CA" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>GitHub username</label>
            <input {...register("githubUsername")} type="text" placeholder="octocat" className={inputClass} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>LinkedIn URL</label>
            <input {...register("linkedinUrl")} type="url" placeholder="https://linkedin.com/in/…" className={inputClass} />
            {errors.linkedinUrl && <p className="text-hazard-400 text-xs mt-1">{errors.linkedinUrl.message}</p>}
          </div>
          <div>
            <label className={labelClass}>Website</label>
            <input {...register("website")} type="url" placeholder="https://yoursite.com" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Experience */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-oracle-500" />
            <h2 className="text-sm font-semibold text-text-primary">Experience</h2>
          </div>
          <button
            type="button"
            onClick={() => appendExp({ company: "", title: "" })}
            className="flex items-center gap-1.5 text-xs text-oracle-500 hover:text-oracle-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add role
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {expFields.map((field, i) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              transition={{ duration: 0.2 }}
              className="glass rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-ghost">Role {i + 1}</span>
                {i > 0 && (
                  <button type="button" onClick={() => removeExp(i)} className="text-text-ghost hover:text-hazard-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Company</label>
                  <input {...register(`experience.${i}.company`)} placeholder="Acme Corp" className={inputClass} />
                  {errors.experience?.[i]?.company && (
                    <p className="text-hazard-400 text-xs mt-1">{errors.experience[i]?.company?.message}</p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Title</label>
                  <input {...register(`experience.${i}.title`)} placeholder="Senior Engineer" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Start date</label>
                  <input {...register(`experience.${i}.startDate`)} type="month" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End date</label>
                  <input {...register(`experience.${i}.endDate`)} type="month" placeholder="Present" className={inputClass} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Education */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-nebula-400" />
            <h2 className="text-sm font-semibold text-text-primary">Education</h2>
          </div>
          <button
            type="button"
            onClick={() => appendEdu({ institution: "" })}
            className="flex items-center gap-1.5 text-xs text-oracle-500 hover:text-oracle-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add school
          </button>
        </div>

        <AnimatePresence mode="popLayout">
          {eduFields.map((field, i) => (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="glass rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-ghost">Entry {i + 1}</span>
                {i > 0 && (
                  <button type="button" onClick={() => removeEdu(i)} className="text-text-ghost hover:text-hazard-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Institution</label>
                  <input {...register(`education.${i}.institution`)} placeholder="MIT" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Degree</label>
                  <input {...register(`education.${i}.degree`)} placeholder="BS Computer Science" className={inputClass} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Skills */}
      <div className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-signal-400" />
          <h2 className="text-sm font-semibold text-text-primary">Skills & preferences</h2>
        </div>

        <div>
          <label className={labelClass}>Skills (comma-separated)</label>
          <textarea
            {...register("skills")}
            rows={2}
            placeholder="Python, TypeScript, Machine Learning, React, LLMs, SQL…"
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Risk tolerance</label>
            <select {...register("riskTolerance")} className={`${inputClass} appearance-none`}>
              <option value="">Select…</option>
              <option value="low">Low — I prefer stability</option>
              <option value="medium">Medium — balanced</option>
              <option value="high">High — I embrace uncertainty</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Planning horizon</label>
            <select {...register("timeHorizon")} className={`${inputClass} appearance-none`}>
              <option value="">Select…</option>
              <option value="1y">1 year</option>
              <option value="3y">3 years</option>
              <option value="5y">5 years</option>
              <option value="10y">10 years</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !isDirty}
          className="flex items-center gap-2 bg-oracle-500 hover:bg-oracle-400 disabled:opacity-50 disabled:cursor-not-allowed text-void-950 font-semibold px-6 py-2.5 rounded-xl transition-all duration-200 hover:shadow-[0_0_20px_oklch(72%_0.175_76_/_0.4)] text-sm"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : (
            <><Save className="w-4 h-4" /> Save profile</>
          )}
        </button>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-signal-400 text-sm"
          >
            Profile saved!
          </motion.span>
        )}
      </div>
    </form>
  );
}
