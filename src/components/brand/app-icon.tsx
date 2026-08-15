import { cn } from "@/lib/utils";

const ICON_SRC = "/icon.png?v=6";

type AppIconProps = {
  className?: string;
  markClassName?: string;
};

/** ホーム画面と同じ螺旋階段マーク（案1）。 */
export function AppIcon({ className, markClassName }: AppIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={ICON_SRC}
      alt=""
      className={cn("size-12 shrink-0 rounded-2xl object-cover shadow-sm", className, markClassName)}
      aria-hidden
    />
  );
}
