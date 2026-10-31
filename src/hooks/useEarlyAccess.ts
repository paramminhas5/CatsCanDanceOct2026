/**
 * useEarlyAccess — submit email to early access signups.
 */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface EarlyAccessInput {
  email: string;
  source?: string;
}

export function useEarlyAccess() {
  return useMutation<unknown, Error, EarlyAccessInput>({
    mutationFn: async (input) => {
      const { error } = await supabase
        .from("early_access_signups")
        .insert({
          email: input.email.trim().toLowerCase(),
          source: input.source ?? "home",
        });

      // Duplicate email is not an error for the user
      if (error && error.code === "23505") {
        return { ok: true, duplicate: true };
      }
      if (error) throw new Error(error.message);
      return { ok: true };
    },
  });
}
