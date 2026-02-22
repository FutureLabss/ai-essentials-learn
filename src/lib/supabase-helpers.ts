import { supabase } from "@/integrations/supabase/client";
import { allCourses } from "@/data/courses";

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

export async function getAllCourses() {
  // Use DB as source, but map descriptions/details from local data for consistency if needed
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .order("created_at");

  if (error) throw error;

  // Enhance DB data with local content if IDs match
  return (data || []).map(dbCourse => {
    const local = allCourses.find(c => c.id === dbCourse.id);
    return local ? { ...dbCourse, ...local } : dbCourse;
  });
}

export async function getCourse() {
  // Default to AI Essentials for single-course contexts
  return allCourses[0];
}

export async function getCourseById(courseId: string) {
  const local = allCourses.find(c => c.id === courseId);
  if (local) return local;

  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();
  if (error) throw error;
  return data;
}

export async function getWeeksWithLessons(courseId: string) {
  const local = allCourses.find(c => c.id === courseId);
  if (local) return local.weeks;

  const { data: weeks, error: weeksError } = await supabase
    .from("weeks")
    .select("*")
    .eq("course_id", courseId)
    .order("week_number");
  if (weeksError) throw weeksError;

  if (!weeks || weeks.length === 0) return [];

  const { data: lessons, error: lessonsError } = await supabase
    .from("lessons")
    .select("*")
    .in("week_id", weeks.map(w => w.id))
    .order("lesson_number");
  if (lessonsError) throw lessonsError;

  return weeks.map(week => ({
    ...week,
    lessons: (lessons || []).filter(l => l.week_id === week.id),
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

export async function getUserEnrollments(userId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data || [];
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

// Course pricing map (NGN)
export const COURSE_PRICES: Record<string, number> = {
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": 49990, // AI Essentials — ₦49,990
  "b2c3d4e5-f6a7-8901-bcde-f12345678901": 20000, // Digital Essentials — ₦20,000
};

export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}
