import { cn } from "@/lib/utils";

type AppIconProps = {
  className?: string;
  /** アイコン図形のサイズ用。親の枠は className で。 */
  markClassName?: string;
};

/** ホーム画面・ヘッダ用。案A（向かい合う2矢印＝リレー輪）。色は shadcn セマンティックトークン。 */
export function AppIcon({ className, markClassName }: AppIconProps) {
  return (
    <div
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
      aria-hidden
    >
      <AppIconMark className={cn("size-7", markClassName)} />
    </div>
  );
}

/** SVG マーク単体（app-icon-svg と同パス）。 */
export function AppIconMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-7", className)}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="16"
        cy="16"
        r="11"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeOpacity="0.35"
      />
      <path
        d="M10 14.5c1.2-3.2 4.2-5.2 7.6-5.2 3.8 0 6.9 2.4 7.9 5.6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M23.8 12.2 26 15.8 22.2 16.6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 17.5c-1.2 3.2-4.2 5.2-7.6 5.2-3.8 0-6.9-2.4-7.9-5.6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M8.2 19.8 6 16.2 9.8 15.4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
