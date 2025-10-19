import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Check for existing session FIRST
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      // Then set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mounted) return;
          setSession(session);
          setUser(session?.user ?? null);
        }
      );

      // Add minimum delay to prevent flash
      setTimeout(() => {
        if (mounted) setIsLoading(false);
      }, 300);

      // Cleanup subscription when component unmounts
      return () => {
        subscription.unsubscribe();
      };
    });

    return () => {
      mounted = false;
    };
  }, []);

  return { user, session, isLoading };
};
