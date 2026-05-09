import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sign in with a social provider.
 *
 * Tries the Lovable managed OAuth proxy first (`/~oauth/initiate`). On custom
 * domains where the proxy isn't reachable (e.g. Cloudflare in front without the
 * proxy-mode setup), falls back to Supabase's built-in OAuth which redirects via
 * the Supabase project URL — works on any host without DNS/proxy tweaks.
 */
export async function signInWithProvider(
  provider: "google" | "apple",
  redirectPath = "/dashboard"
): Promise<{ error?: { message: string }; redirected?: boolean }> {
  const redirectTo = window.location.origin + redirectPath;

  // 1) Preflight the Lovable proxy — if it's intercepted by Cloudflare it
  // returns the SPA index.html (HTML) instead of a 302/redirect.
  let useFallback = false;
  try {
    const probe = await fetch("/~oauth/initiate", {
      method: "HEAD",
      redirect: "manual",
      cache: "no-store",
    });
    // A working proxy returns an opaque redirect (status 0) or 3xx.
    // If we get 200 with HTML, the proxy is being swallowed by the SPA.
    const ct = probe.headers.get("content-type") || "";
    if (probe.status === 200 && ct.includes("text/html")) useFallback = true;
    if (probe.status === 404) useFallback = true;
  } catch {
    // Network/CORS errors: assume proxy is fine and let lovable.auth try.
  }

  if (!useFallback) {
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectTo });
      if (result.error) {
        useFallback = true;
      } else {
        return result as any;
      }
    } catch {
      useFallback = true;
    }
  }

  // Fallback: direct Supabase OAuth (does not depend on /~oauth proxy)
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) return { error: { message: error.message } };
  return { redirected: true };
}
