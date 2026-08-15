import type { ReactNode } from "react";

type ReviewStepLayoutProps = {
  work: ReactNode;
};

/** レビュー各段階の作業レイアウト */
export function ReviewStepLayout({ work }: ReviewStepLayoutProps) {
  return <div className="flex min-w-0 flex-col gap-4">{work}</div>;
}
