import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import AppShell from "@/components/AppShell";

const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];
const educationOptions = ["High School", "Diploma", "Bachelor's Degree", "Master's Degree", "PhD", "Other"];
const reasonOptions = ["Career advancement", "Personal interest", "Academic requirement", "Employer mandate", "Other"];
const deviceOptions = ["Smartphone", "Tablet", "Laptop", "Desktop"];

export default function KYC() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", phone: "", gender: "", date_of_birth: "",
    country: "", state_region: "", city_town: "", education_level: "",
    occupation: "", reason_for_course: "", device_used: "",
  });

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ ...form, kyc_completed: true })
      .eq("user_id", user.id);
    setLoading(false);
    if (error) {
      toast.error("Failed to save. Please try again.");
    } else {
      await refreshProfile();
      toast.success("Profile completed!");
      navigate("/dashboard");
    }
  };

  return (
    <AppShell>
      <div className="container max-w-lg py-8">
        <h1 className="font-display text-2xl font-bold mb-1">Complete Your Profile</h1>
        <p className="text-muted-foreground text-sm mb-6">We need a few details before you can access the course.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name *</Label>
              <Input required value={form.first_name} onChange={e => set("first_name", e.target.value)} />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input required value={form.last_name} onChange={e => set("last_name", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Phone Number *</Label>
            <Input required type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>Gender *</Label>
            <Select required onValueChange={v => set("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{genderOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date of Birth *</Label>
            <Input required type="date" value={form.date_of_birth} onChange={e => set("date_of_birth", e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Country *</Label>
              <Input required value={form.country} onChange={e => set("country", e.target.value)} />
            </div>
            <div>
              <Label>State/Region *</Label>
              <Input required value={form.state_region} onChange={e => set("state_region", e.target.value)} />
            </div>
            <div>
              <Label>City/Town *</Label>
              <Input required value={form.city_town} onChange={e => set("city_town", e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Highest Education *</Label>
            <Select required onValueChange={v => set("education_level", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{educationOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Current Occupation</Label>
            <Input value={form.occupation} onChange={e => set("occupation", e.target.value)} />
          </div>
          <div>
            <Label>Reason for Taking the Course *</Label>
            <Select required onValueChange={v => set("reason_for_course", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{reasonOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Device Used for Learning *</Label>
            <Select required onValueChange={v => set("device_used", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{deviceOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : "Complete Profile"}
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
