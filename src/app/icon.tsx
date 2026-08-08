import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** ホーム画面用。案A（AppIcon と同じリレー輪。ImageResponse は Tailwind 不可なのでインライン）。 */
export default function Icon() {
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
          borderRadius: 96,
        }}
      >
        <svg
          width="300"
          height="300"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="16"
            cy="16"
            r="11"
            stroke="#fafafa"
            strokeWidth="2.25"
            strokeOpacity="0.35"
          />
          <path
            d="M10 14.5c1.2-3.2 4.2-5.2 7.6-5.2 3.8 0 6.9 2.4 7.9 5.6"
            stroke="#fafafa"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M23.8 12.2 26 15.8 22.2 16.6"
            stroke="#fafafa"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M22 17.5c-1.2 3.2-4.2 5.2-7.6 5.2-3.8 0-6.9-2.4-7.9-5.6"
            stroke="#fafafa"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M8.2 19.8 6 16.2 9.8 15.4"
            stroke="#fafafa"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
