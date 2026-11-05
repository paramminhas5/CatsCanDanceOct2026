import { useEffect } from "react";
import { supabase } from "@/lib/supabase-shim";
import { setDynamicPosts, markDynamicPostsLoaded, type Post } from "@/content/posts";

let loaded = false;

/** Fetches published blog posts from site_settings.blog_posts and merges
 *  them into the in-memory posts list. Runs at most once per session.
 *  Marks the store as loaded when done, even on failure, so a post page
 *  knows when "not found" is final. */
export const useDynamicPosts = () => {
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", "blog_posts")
          .maybeSingle();
        if (error) return;
        const raw = (data as any)?.value;
        if (!Array.isArray(raw)) return;
        setDynamicPosts(raw as Post[]);
      } catch {
        /* silent */
      } finally {
        markDynamicPostsLoaded();
      }
    })();
  }, []);
};
