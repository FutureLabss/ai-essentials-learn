import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { getUserRole, getUserProfile, enrollInCourseByName } from "@/lib/supabase-helpers";
import { getEvent } from "@/lib/events";

const PENDING_SIGNUP_KEY = "pending_signup_meta";

// Signup.tsx stashes { firstName, lastName, phone, eventSlug } here before
// the signUp() call, since RLS-protected writes (profile update, enrollment)
// need an active session — which may not exist until the user clicks the
// email verification link and lands back in the app.
async function completePendingSignup(user: User) {
  const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
  if (!raw) return;
  localStorage.removeItem(PENDING_SIGNUP_KEY);

  try {
    const { firstName, lastName, phone, eventSlug } = JSON.parse(raw);
    const updates: Record<string, string> = {};
    if (firstName) updates.first_name = firstName;
    if (lastName) updates.last_name = lastName;
    if (phone) updates.phone = phone;
    if (Object.keys(updates).length > 0) {
      await supabase.from("profiles").update(updates).eq("user_id", user.id);
    }

    const event = getEvent(eventSlug);
    if (event) {
      await enrollInCourseByName(user.id, event.courseName);
    }
  } catch (e) {
    console.error("Error completing pending signup:", e);
  }
}

interface AuthContextType {
  user: User | null;
  role: string | null;
  profile: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (u: User) => {
    try {
      const [r, p] = await Promise.all([
        getUserRole(u.id),
        getUserProfile(u.id),
      ]);
      setRole(r);
      setProfile(p);
    } catch (e) {
      console.error("Error loading user data:", e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.id);
      setProfile(p);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          // Use setTimeout to avoid Supabase auth deadlock
          setTimeout(async () => {
            await completePendingSignup(session.user);
            loadUserData(session.user);
          }, 0);
        } else {
          setUser(null);
          setRole(null);
          setProfile(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, role, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
