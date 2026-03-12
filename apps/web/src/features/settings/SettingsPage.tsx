import React from "react";
import { useLocale } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useLocale();

  return (
    <div className="rounded-2xl border border-border/35 bg-white/60 p-5 shadow-soft">
      <div className="text-sm font-semibold">{t("settings.title")}</div>
      <div className="mt-1 text-sm text-muted">{t("settings.subtitle")}</div>

      <div className="mt-6 rounded-2xl border border-border/35 bg-white/40 p-4">
        <div className="text-xs font-semibold text-muted">{t("settings.uiStandards")}</div>
        <ul className="mt-3 space-y-2 text-sm">
          <li>• {t("settings.standard1")}</li>
          <li>• {t("settings.standard2")}</li>
          <li>• {t("settings.standard3")}</li>
        </ul>
      </div>

      <div className="mt-4 rounded-2xl border border-border/35 bg-white/40 p-4">
        <div className="text-xs font-semibold text-muted">{t("settings.language")}</div>
        <p className="mt-2 text-sm text-muted">
          Use the language switcher in the navigation bar to change between EN / FR / IT.
        </p>
      </div>
    </div>
  );
}
