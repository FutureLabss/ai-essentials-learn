import { supabase } from "@/integrations/supabase/client";

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  return data;
}

export async function getUserRole(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.role || null;
}

export async function getCourse() {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function getWeeksWithLessons(courseId: string) {
  const { data: weeks, error: weeksError } = await supabase
    .from("weeks")
    .select("*")
    .eq("course_id", courseId)
    .order("week_number");
  if (weeksError) throw weeksError;

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .in("week_id", weeks.map(w => w.id))
    .order("lesson_number");
  if (lessonsError) throw lessonsError;

  return weeks.map(week => ({
    ...week,
    lessons: lessons.filter(l => l.week_id === week.id),
  }));
}

export async function getUserEnrollment(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserProgress(userId: string) {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data || [];
}

export async function markLessonComplete(userId: string, lessonId: string) {
  const { error } = await supabase
    .from("lesson_progress")
    .upsert({
      user_id: userId,
      lesson_id: lessonId,
      completed: true,
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,lesson_id" });
  if (error) throw error;
}

export async function getUserCertificate(userId: string, courseId: string) {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
