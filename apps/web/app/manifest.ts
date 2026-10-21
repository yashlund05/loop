// Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LOOP - Hyperlocal Reuse Marketplace",
    short_name: "LOOP",
    description: "A human-in-the-loop, privacy-preserving AI marketplace for local reuse.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
