// Registry of live-talk / event signup links.
// Each entry maps a URL slug (?event=<slug>) to a hidden, free "tag" course.
// Enrolling attendees in this course lets Admin > Email target them via
// the existing "Course enrollees" audience filter, without touching
// anyone else's inbox.
export interface EventConfig {
  title: string;
  subtitle: string;
  courseName: string;
}

export const EVENTS: Record<string, EventConfig> = {
  "fedpoly-ukana": {
    title: "FedPoly Ukana — AI Essentials Talk",
    subtitle: "Sign up here to get the slides, resources, and course invite by email.",
    courseName: "FedPoly Ukana — AI Essentials Talk",
  },
};

export function getEvent(slug: string | null): EventConfig | null {
  if (!slug) return null;
  return EVENTS[slug] ?? null;
}
