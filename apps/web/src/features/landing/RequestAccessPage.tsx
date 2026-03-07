import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ENV } from "@/lib/env";

type FormState = {
  name: string;
  email: string;
  organization: string;
  useCase: string;
};

const INITIAL_FORM: FormState = {
  name: "",
  email: "",
  organization: "",
  useCase: "Consulting / Agencies",
};

export default function RequestAccessPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mailto = useMemo(() => {
    const subject = encodeURIComponent("RadarPulse — Request access");
    const body = encodeURIComponent(
      [
        "Hello RadarPulse team,",
        "",
        "I would like to request access.",
        "",
        `Name: ${form.name || "—"}`,
        `Email: ${form.email || "—"}`,
        `Organization: ${form.organization || "—"}`,
        `Use case: ${form.useCase || "—"}`,
        "",
        "Thanks,",
      ].join("\n")
    );
    return `mailto:hello@radarpulse.io?subject=${subject}&body=${body}`;
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${ENV.SUPABASE_URL}/functions/v1/submit-access-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ENV.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${ENV.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          organization: form.organization.trim() || null,
          use_case: form.useCase,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(String(data?.error ?? "Submission failed. Please try again."));
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue. Essayez par email.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="fixed inset-x-0 top-0 z-30 border-b border-border/20 bg-bg/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-xl bg-elevated shadow-glow" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">RadarPulse</div>
              <div className="text-[11px] text-muted">Request access</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/guides"
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border/25 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
                "hover:bg-elevated/70"
              )}
            >
              Guides
            </Link>
            <Link
              to="/"
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border border-border/25 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
                "hover:bg-elevated/70"
              )}
            >
              Landing
            </Link>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-xl px-4 pt-20">
        <div className="rounded-2xl border border-border/25 bg-surface/70 p-6 shadow-soft">
          <h1 className="text-2xl font-semibold tracking-tight">Request access</h1>
          <p className="mt-2 text-sm text-muted">Tell us your use case and your operating context.</p>

          {!done ? (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="request-name" className="text-xs font-medium text-muted">Name</label>
                <input
                  id="request-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/50"
                />
                <p className="mt-1 text-xs text-muted">Enter your full name for the access request.</p>
              </div>

              <div>
                <label htmlFor="request-email" className="text-xs font-medium text-muted">Email</label>
                <input
                  id="request-email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/50"
                />
                <p className="mt-1 text-xs text-muted">Use your professional email address.</p>
              </div>

              <div>
                <label htmlFor="request-organization" className="text-xs font-medium text-muted">Organization</label>
                <input
                  id="request-organization"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/50"
                />
                <p className="mt-1 text-xs text-muted">Company, NGO, agency, or public body name.</p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Primary use case</label>
                <select
                  value={form.useCase}
                  onChange={(e) => setForm({ ...form, useCase: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/50"
                >
                  <option>Consulting / Agencies</option>
                  <option>NGO / Grants</option>
                  <option>SME / Tenders</option>
                  <option>Other</option>
                </select>
              </div>

              {error ? (
                <div className="rounded-xl border border-bad/30 bg-bad/10 px-4 py-3 text-sm text-bad">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-glow transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                    </>
                  ) : (
                    <>
                      Send request <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <a
                  href={mailto}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/25 bg-surface/70 px-5 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/70"
                >
                  Email us <Mail className="h-4 w-4" />
                </a>
              </div>

              <div className="text-xs text-muted">
                Your request is saved instantly — the team will be notified and reach out within 24h.
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-good/20 bg-good/10 p-4">
              <div className="text-sm font-semibold text-good">Request received ✓</div>
              <div className="mt-1 text-sm text-muted">
                We'll be in touch at <strong>{form.email}</strong> within 24h.
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  to="/guides"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-glow transition hover:opacity-90"
                >
                  Read the guides <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/25 bg-surface/70 px-5 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/70"
                >
                  Back to landing
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-muted">
          Ready to subscribe directly?{" "}
          <Link className="text-accent hover:underline" to="/abbonamento">
            Open checkout
          </Link>
          .
        </div>
      </main>
    </div>
  );
}
