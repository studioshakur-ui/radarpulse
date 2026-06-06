import type { TFn } from "@/lib/i18n";

export type MarketOption = {
  value: string;
  label: string;
};

export function getMarketOptions(t: TFn): MarketOption[] {
  return [
    { value: "GLOBAL", label: `GLOBAL · ${t("geo.nav.global")}` },
    { value: "IT", label: `IT · ${t("geo.nav.italy")}` },
    { value: "FR", label: `FR · ${t("geo.nav.france")}` },
    { value: "DE", label: `DE · ${t("market.germany")}` },
    { value: "UK", label: `UK · ${t("geo.nav.uk")}` },
    { value: "ES", label: `ES · ${t("market.spain")}` },
    { value: "NL", label: `NL · ${t("market.netherlands")}` },
    { value: "PL", label: `PL · ${t("market.poland")}` },
    { value: "BE", label: `BE · ${t("market.belgium")}` },
  ];
}
