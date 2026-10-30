/**
 * useContact — submit a contact message directly to Supabase.
 */
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface ContactInput {
  name: string;
  email: string;
  message: string;
}

export function useContact() {
  return useMutation<unknown, Error, ContactInput>({
    mutationFn: async (input) => {
      const { error } = await supabase
        .from("contact_messages")
        .insert({
          name: input.name.trim(),
          email: input.email.trim().toLowerCase(),
          message: input.message.trim(),
        });

      if (error) throw new Error(error.message);
      return { ok: true };
    },
  });
}
