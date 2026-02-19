import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getUserCertificate, getCourse } from "@/lib/supabase-helpers";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Award, Download, ArrowLeft } from "lucide-react";
import { jsPDF } from "jspdf";

export default function Certificate() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const course = await getCourse();
      const cert = await getUserCertificate(user.id, course.id);
      setCertificate(cert);
      setLoading(false);
    };
    load();
  }, [user]);

  const downloadPDF = () => {
    if (!certificate || !profile) return;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // Border
    doc.setDrawColor(21, 128, 117);
    doc.setLineWidth(2);
    doc.rect(10, 10, w - 20, h - 20);

    // Title
    doc.setFontSize(32);
    doc.setTextColor(21, 128, 117);
    doc.text("Certificate of Completion", w / 2, 50, { align: "center" });

    // Body
    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text("This is to certify that", w / 2, 75, { align: "center" });

    doc.setFontSize(24);
    doc.setTextColor(30, 30, 30);
    doc.text(`${profile.first_name} ${profile.last_name}`, w / 2, 92, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text("has successfully completed the course", w / 2, 108, { align: "center" });

    doc.setFontSize(20);
    doc.setTextColor(21, 128, 117);
    doc.text("AI Essentials", w / 2, 122, { align: "center" });

    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date(certificate.issued_at).toLocaleDateString()}`, w / 2, 145, { align: "center" });
    doc.text(`Certificate ID: ${certificate.certificate_id}`, w / 2, 153, { align: "center" });
    doc.text("Issued by: FutureLabs", w / 2, 161, { align: "center" });

    doc.save(`AI-Essentials-Certificate-${profile.first_name}-${profile.last_name}.pdf`);
  };

  if (loading) {
    return <AppShell><div className="container py-12 text-center text-muted-foreground">Loading…</div></AppShell>;
  }

  if (!certificate) {
    return (
      <AppShell>
        <div className="container max-w-md py-12 text-center">
          <p className="text-muted-foreground mb-4">No certificate yet. Complete all lessons first.</p>
          <Button onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="container max-w-lg py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
        </Button>

        <div className="rounded-lg border-2 border-primary bg-card p-8 text-center">
          <Award className="h-16 w-16 text-accent mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-1">Certificate of Completion</h1>
          <p className="text-muted-foreground text-sm mb-6">AI Essentials</p>

          <p className="text-muted-foreground text-sm">Awarded to</p>
          <p className="font-display text-xl font-bold text-primary mb-4">
            {profile?.first_name} {profile?.last_name}
          </p>

          <div className="text-xs text-muted-foreground space-y-1 mb-6">
            <p>Date: {new Date(certificate.issued_at).toLocaleDateString()}</p>
            <p>ID: {certificate.certificate_id}</p>
            <p>Issued by FutureLabs</p>
          </div>

          <Button onClick={downloadPDF}>
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
