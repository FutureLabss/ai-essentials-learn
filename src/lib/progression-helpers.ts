export function getUnlockedWeekIds(weeks: any[], quizzes: any[], quizAttempts: any[]): Set<string> {
  const unlockedIds = new Set<string>();

  if (!weeks || weeks.length === 0) return unlockedIds;

  // Week 1 is always unlocked
  unlockedIds.add(weeks[0].id);

  for (let i = 1; i < weeks.length; i++) {
    const prevWeek = weeks[i - 1];
    const prevQuiz = quizzes.find((q: any) => q.week_id === prevWeek.id && q.quiz_type === "weekly");

    // If previous week had a quiz, we must have passed it
    if (prevQuiz) {
      const passed = quizAttempts.some((a: any) => a.quiz_id === prevQuiz.id && a.passed);
      if (!passed) {
        break; // Stop unlocking any further weeks
      }
    }
    
    // If no quiz, or if quiz was passed, unlock this week
    unlockedIds.add(weeks[i].id);
  }

  return unlockedIds;
}
