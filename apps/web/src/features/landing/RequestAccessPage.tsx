import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { cx } from "@/lib/utils";

type FormState = {
  name: string;
  email: string;
  organization: string;
  useCase: string;
};

const LS_KEY = "rp.request_access.v1";

function safeLoad(): FormState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") return null;
    return {
      name: String((v as any).name ?? ""),
      email: String((v as any).email ?? ""),
      organization: String((v as any).organization ?? ""),
      useCase: String((v as any).useCase ?? ""),
    };
  } catch {
    return null;
  }
}

function save(v: FormState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(v));
  } catch {
    // ignore
  }
}

export default function RequestAccessPage() {
  const preset = useMemo(() => safeLoad(), []);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<FormState>(
    preset ?? { name: "", email: "", organization: "", useCase: "Consulting / Agencies" }
  );

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
              to="/explore"
              className={cx(
                "inline-flex items-center gap-2 rounded-xl border border-border/25 bg-surface/70 px-3 py-2 text-sm text-text shadow-soft transition",
                "hover:bg-elevated/70"
              )}
            >
              Explore
            </Link>
            <Link
              to="/"
              className={cx(
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
          <p className="mt-2 text-sm text-muted">
            Tell us your use case. You can also explore the demo without signup.
          </p>

          {!done ? (
            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                save(form);
                setDone(true);
              }}
            >
              <div>
                <label className="text-xs font-medium text-muted">Name</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/50"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Email</label>
                <input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/50"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Organization</label>
                <input
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  className="mt-1 w-full rounded-2xl border border-border/25 bg-bg/60 px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-accent/50"
                  placeholder="Company / NGO / Agency"
                />
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

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-glow transition hover:opacity-90"
                >
                  Save request <ArrowRight className="h-4 w-4" />
                </button>

                <a
                  href={mailto}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border/25 bg-surface/70 px-5 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/70"
                >
                  Email us <Mail className="h-4 w-4" />
                </a>
              </div>

              <div className="text-xs text-muted">
                No account is created here — this page just collects context and can open an email draft.
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-good/20 bg-good/10 p-4">
              <div className="text-sm font-semibold text-good">Saved.</div>
              <div className="mt-1 text-sm text-muted">
                You can now send the email request, or explore the demo.
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <a
                  href={mailto}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-bg shadow-glow transition hover:opacity-90"
                >
                  Email request <Mail className="h-4 w-4" />
                </a>
                <Link
                  to="/explore"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/25 bg-surface/70 px-5 py-3 text-sm font-semibold text-text shadow-soft transition hover:bg-elevated/70"
                >
                  Explore demo <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 text-center text-xs text-muted">
          Prefer to jump straight in?{" "}
          <Link className="text-accent hover:underline" to="/inbox">
            Open the app
          </Link>
          .
        </div>
      </main>
    </div>
  );
}
