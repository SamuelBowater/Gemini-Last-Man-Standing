import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gemini's Last Man Standing",
    short_name: "Last Man Standing",
    description: "Premier League survival pool — pick a forward, a midfielder and a defender every gameweek.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f9f8",
    theme_color: "#0d9488",
    icons: [
      { src: "/icon?size=192", sizes: "192x192", type: "image/png" },
      { src: "/icon?size=512", sizes: "512x512", type: "image/png" },
    ],
  };
}
