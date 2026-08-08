import { ImageResponse } from "next/og";

import { appIconMarkDataUri } from "@/components/brand/app-icon-svg";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * ホーム／PWA 用。
 * ImageResponse 直下の <svg> は Satori で形が崩れるので、SVG を img(data URI) で焼く。
 * maskable 用に中央〜80% にマークを置き、端のクロップに耐える。
 */
export default function Icon() {
  const mark = appIconMarkDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#262626",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={320} height={320} alt="" />
      </div>
    ),
    { ...size },
  );
}
