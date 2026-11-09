import type { MetadataRoute } from "next";

/** Installable, so the door opens like an app on the phone at the door. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Host by Cats Can Dance",
    short_name: "Host",
    start_url: "/door",
    display: "standalone",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    icons: [{ src: "/cats/yellow.webp", sizes: "306x560", type: "image/webp" }],
  };
}
