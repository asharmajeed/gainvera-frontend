export const publicEnvironmentNames = [
  "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_GAINVERA_API_URL",
] as const;
export interface AccountConfig { supabaseUrl: string; publishableKey: string; apiUrl: string }
export type AccountConfiguration = { config: AccountConfig; issues: [] } | { config: null; issues: string[] };

/** Only public configuration enters the browser bundle. Never include values in errors. */
export function accountConfiguration(values: Record<string, string | undefined>): AccountConfiguration {
  const issues: string[] = [];
  for (const name of publicEnvironmentNames) if (!values[name]?.trim()) issues.push(`Missing ${name}.`);
  const safeUrl = (name: string) => {
    try {
      const url = new URL(values[name] ?? "");
      const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if ((url.protocol !== "https:" && !(loopback && url.protocol === "http:")) || url.username || url.password || url.search || url.hash)
        throw new Error();
      return url.toString().replace(/\/$/, "");
    } catch { issues.push(`Invalid ${name}: use HTTPS, or HTTP on localhost, without credentials, query or fragment.`); return ""; }
  };
  const supabaseUrl = safeUrl("NEXT_PUBLIC_SUPABASE_URL");
  const apiUrl = safeUrl("NEXT_PUBLIC_GAINVERA_API_URL");
  const publishableKey = values.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";
  // Accept only the current public-key format. A privileged/secret key must never reach createClient.
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) issues.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a public sb_publishable_ key, never a secret/service key.");
  return issues.length ? { config: null, issues } : { config: { supabaseUrl, apiUrl, publishableKey }, issues: [] };
}

export function browserAccountConfiguration() {
  // Next requires explicit property references for build-time public substitution.
  return accountConfiguration({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_GAINVERA_API_URL: process.env.NEXT_PUBLIC_GAINVERA_API_URL,
  });
}
