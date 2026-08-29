import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const base: MetadataRoute.Manifest = {
    name: "企業理念リレー",
    short_name: "企業理念リレー",
    description: "理念リレーの毎日レビューと当番ローテ",
    start_url: "/review",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0060b0",
    lang: "ja",
    icons: [
      {
        src: "/icon.png?v=11",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.png?v=11",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  // share_target は Manifest 型に未定義のため拡張
  // GET /share-target。url は置かない（Google URL の & で WowTalk が開く）。
  // WowTalk は text=本文。Google は text=検索ワード → AIモード URL を組み立てて調べるへ。
  return {
    ...base,
    share_target: {
      action: "/share-target",
      method: "GET",
      enctype: "application/x-www-form-urlencoded",
      params: {
        title: "title",
        text: "text",
      },
    },
  } as MetadataRoute.Manifest;
}
