import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

export default function NotificationReminder() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const isSupported = "Notification" in window && "serviceWorker" in navigator;
    setSupported(isSupported);
    if (isSupported) {
      setEnabled(Notification.permission === "granted" && localStorage.getItem("reminder-enabled") === "true");
    }
  }, []);

  const scheduleReminder = () => {
    // Schedule a periodic reminder using the service worker
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SCHEDULE_REMINDER",
        title: t("notifications.reminderTitle"),
        body: t("notifications.reminderBody"),
      });
    }
  };

  const handleToggle = async () => {
    if (!supported) return;

    if (enabled) {
      localStorage.setItem("reminder-enabled", "false");
      setEnabled(false);
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "CANCEL_REMINDER" });
      }
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      localStorage.setItem("reminder-enabled", "true");
      setEnabled(true);
      scheduleReminder();
      toast.success(t("notifications.enable"));
    } else {
      toast.error(t("notifications.permissionDenied"));
    }
  };

  if (!supported) return null;

  return (
    <div className="rounded-lg border bg-card p-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold text-sm flex items-center gap-2">
            <Bell className="h-4 w-4" />
            {enabled ? t("notifications.disable") : t("notifications.enable")}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{t("notifications.reminderBody")}</p>
        </div>
        <Button variant={enabled ? "secondary" : "default"} size="sm" onClick={handleToggle}>
          {enabled ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
