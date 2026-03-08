import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(() => searchLessons(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const searchLessons = async (q: string) => {
    setSearching(true);
    const { data } = await supabase
      .from("lessons")
      .select("id, title, content, week_id")
      .or(`title.ilike.%${q}%,content.ilike.%${q}%`)
      .limit(8);
    setResults(data || []);
    setIsOpen(true);
    setSearching(false);
  };

  const handleSelect = (lessonId: string) => {
    setIsOpen(false);
    setQuery("");
    navigate(`/lesson/${lessonId}`);
  };

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search lessons…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          className="h-8 pl-8 pr-8 text-sm"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); setIsOpen(false); }} className="absolute right-2 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelect(r.id)}
              className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b last:border-0"
            >
              <p className="text-sm font-medium truncate">{r.title}</p>
              <p className="text-xs text-muted-foreground truncate">
                {r.content.substring(0, 80)}…
              </p>
            </button>
          ))}
        </div>
      )}
      {isOpen && query && results.length === 0 && !searching && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 p-3">
          <p className="text-sm text-muted-foreground text-center">No results found</p>
        </div>
      )}
    </div>
  );
}
