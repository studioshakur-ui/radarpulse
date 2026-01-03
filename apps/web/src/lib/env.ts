export function requiredEnv(name: string): string {
  const v = (import.meta as any).env?.[name];
  if (!v || typeof v !== "string") throw new Error(`Missing env: ${name}`);
  return v;
}

export const ENV = {
  SUPABASE_URL: requiredEnv("VITE_SUPABASE_URL"),
  SUPABASE_ANON_KEY: requiredEnv("VITE_SUPABASE_ANON_KEY"),
  APP_NAME: ((import.meta as any).env?.VITE_APP_NAME as string) || "RadarPulse",
};
