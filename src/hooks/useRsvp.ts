/**
 * useRsvp — submit an RSVP directly to Supabase.
 * 
 * Usage:
 *   const { mutate: submitRsvp, isPending, isSuccess } = useRsvp();
 *   submitRsvp({ name, email, plus_ones, event_slug });
 */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface RsvpInput {
  name: string;
  email: string;
  plus_ones?: number;
  event_slug: string;
}

interface RsvpResult {
  id: string;
  name: string;
  email: string;
  plus_ones: number;
  event_slug: string;
  created_at: string;
}

export function useRsvp() {
  return useMutation<RsvpResult, Error, RsvpInput>({
    mutationFn: async (input) => {
      const { data, error } = await supabase
        .from("event_rsvps")
        .insert({
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          plus_ones: input.plus_ones ?? 0,
          event_slug: input.event_slug,
        })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as RsvpResult;
    },
  });
}
