import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Circle, Lock, ChevronDown, ChevronRight, BookOpen, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";

interface CourseSidebarProps {
  weeks: any[];
  progress: any[];
  currentLessonId: string;
  isUnlocked: boolean;
  courseName: string;
  unlockedWeekIds: Set<string>;
}

export default function CourseSidebar({ weeks, progress, currentLessonId, isUnlocked, courseName, unlockedWeekIds }: CourseSidebarProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const completedIds = new Set(progress.filter(p => p.completed).map(p => p.lesson_id));
  const allLessons = weeks.flatMap(w => w.lessons);

  const getFirstIncompleteIdx = () => {
    for (let i = 0; i < allLessons.length; i++) {
      if (!completedIds.has(allLessons[i].id)) return i;
    }
    return allLessons.length;
  };
  const firstIncompleteIdx = getFirstIncompleteIdx();

  // Find which week contains the current lesson
  const currentWeekId = weeks.find(w => w.lessons.some((l: any) => l.id === currentLessonId))?.id;

  const handleLessonClick = (lessonId: string) => {
    navigate(`/lesson/${lessonId}`);
    if (isMobile) setMobileOpen(false);
  };

  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter(l => completedIds.has(l.id)).length;

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <h2 className="font-display font-bold text-sm truncate">{courseName}</h2>
          </div>
          {isMobile && (
            <Button variant="ghost" size="sm" onClick={() => setMobileOpen(false)} className="shrink-0 -mr-2">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{completedCount}/{totalLessons} lessons completed</p>
        <div className="mt-2 h-1.5 rounded-full bg-secondary overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-2">
          {weeks.map((week) => {
            const weekLessonsCompleted = week.lessons.filter((l: any) => completedIds.has(l.id)).length;
            const isCurrentWeek = week.id === currentWeekId;

            return (
              <Collapsible key={week.id} defaultOpen={isCurrentWeek}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-sidebar-accent transition-colors">
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-90" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">Week {week.week_number}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{week.title}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {weekLessonsCompleted}/{week.lessons.length}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pb-1">
                    {week.lessons.map((lesson: any) => {
                      const globalIdx = allLessons.findIndex((l: any) => l.id === lesson.id);
                      const isCompleted = completedIds.has(lesson.id);
                      const isAccessible = isUnlocked && unlockedWeekIds.has(week.id);
                      const isCurrent = lesson.id === currentLessonId;

                      return (
                        <button
                          key={lesson.id}
                          disabled={!isAccessible}
                          onClick={() => isAccessible && handleLessonClick(lesson.id)}
                          className={cn(
                            "flex items-center gap-2 w-full px-4 pl-8 py-2 text-left text-xs transition-colors",
                            isCurrent && "bg-primary/10 border-l-2 border-primary",
                            !isCurrent && isAccessible && "hover:bg-sidebar-accent",
                            !isAccessible && "opacity-40 cursor-not-allowed"
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-3.5 w-3.5 text-success shrink-0" />
                          ) : isAccessible ? (
                            <Circle className="h-3.5 w-3.5 text-primary shrink-0" />
                          ) : (
                            <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                          <span className={cn("truncate", isCurrent && "font-medium text-primary")}>
                            {lesson.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(true)}
          className="fixed top-16 left-3 z-40 shadow-lg bg-background/95 backdrop-blur-sm border-border"
        >
          <Menu className="h-4 w-4 mr-1" /> Curriculum
        </Button>
        {mobileOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-[60]" onClick={() => setMobileOpen(false)} />
            <div className="fixed inset-y-0 left-0 w-[80vw] max-w-80 bg-background border-r border-border z-[70] animate-in slide-in-from-left shadow-2xl">
              {sidebarContent}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <aside className="w-64 shrink-0 border-r border-sidebar-border bg-sidebar-background h-[calc(100vh-3.5rem)] sticky top-14">
      {sidebarContent}
    </aside>
  );
}
