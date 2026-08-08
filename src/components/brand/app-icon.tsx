import { cn } from "@/lib/utils";

type AppIconProps = {
  className?: string;
  /** アイコン図形のサイズ用。親の枠は className で。 */
  markClassName?: string;
};

/** ホーム画面・ヘッダ用。向かい合う2矢印（リレー輪）。色は shadcn セマンティックトークン。 */
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

/** SVG マーク単体（app-icon-svg / 静的 PNG と同形）。 */
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
        r="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeOpacity="0.3"
      />
      <path
        d="M8.5 13.2 A8.2 8.2 0 0 1 23.5 13.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M21.2 10.4 L25.4 13.6 L20.8 15.5 Z" fill="currentColor" />
      <path
        d="M23.5 18.8 A8.2 8.2 0 0 1 8.5 18.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M10.8 21.6 L6.6 18.4 L11.2 16.5 Z" fill="currentColor" />
    </svg>
  );
}
