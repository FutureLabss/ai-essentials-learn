import { useState, useEffect } from "react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Monitor, CheckCircle } from "lucide-react";

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <AppShell>
      <div className="container max-w-lg py-12 text-center space-y-8">
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Download className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold">Install AI Essentials</h1>
          <p className="text-muted-foreground text-sm">
            Install the app on your device for quick access, offline support, and a native app experience.
          </p>
        </div>

        {isInstalled ? (
          <div className="rounded-xl border bg-card p-6 space-y-3">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
            <p className="font-semibold">Already Installed!</p>
            <p className="text-sm text-muted-foreground">AI Essentials is installed on your device.</p>
          </div>
        ) : deferredPrompt ? (
          <Button size="lg" className="w-full" onClick={handleInstall}>
            <Download className="h-5 w-5 mr-2" /> Install Now
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5 text-left space-y-3">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">On iPhone / iPad</p>
                  <p className="text-xs text-muted-foreground">Tap the Share button → "Add to Home Screen"</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 text-left space-y-3">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">On Android</p>
                  <p className="text-xs text-muted-foreground">Tap the browser menu (⋮) → "Install app" or "Add to Home Screen"</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5 text-left space-y-3">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold">On Desktop</p>
                  <p className="text-xs text-muted-foreground">Click the install icon in the address bar, or use browser menu → "Install"</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
