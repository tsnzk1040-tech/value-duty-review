import { ImageResponse } from "next/og";

import { appIconMarkDataUri } from "@/components/brand/app-icon-svg";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** iOS ホーム用。角丸は OS 側が掛けるので画像は全面塗り。 */
export default function AppleIcon() {
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
        <img src={mark} width={120} height={120} alt="" />
      </div>
    ),
    { ...size },
  );
}
