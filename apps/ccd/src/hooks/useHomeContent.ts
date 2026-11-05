/**
 * useHomeContent — returns static homepage content.
 * Previously fetched from site_settings via API. Now returns defaults.
 * Can be wired to Supabase later for dynamic CMS content.
 */
export function useHomeContent() {
  return {
    about_heading: "WE DON'T JUST THROW PARTIES.",
    about_body: "We build rooms worth being in. Underground dance music, limited drops, and a crew that shows up. Bangalore-born, India-wide.",
    about_cta_label: "JOIN THE PACK",
    about_cta_link: "#early-access",
  };
}
