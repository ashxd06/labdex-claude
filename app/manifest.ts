import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LABDEX — Laboratorio Clínico",
    short_name: "LABDEX",
    description: "Contenido, cálculos y ejercicios prácticos de laboratorio clínico.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e14",
    theme_color: "#0a0e14",
    lang: "es",
    orientation: "portrait-primary",
    categories: ["education", "medical", "productivity"],
    icons: [
      {
        src: "/android-icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
