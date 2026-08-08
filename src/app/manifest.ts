import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "value-duty-review",
    short_name: "VDRレビュー",
    description: "通勤向け・自分専用のレビュー／ローテ Web",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#262626",
    lang: "ja",
    icons: [
      {
        src: "/icon.png?v=4",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png?v=4",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
