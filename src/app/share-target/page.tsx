"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { loadReviewDraft } from "@/lib/review/draft";
import {
  buildPendingShare,
  classifyShare,
  consumeShareIncoming,
  hasShareIncoming,
  incomingFromSearchParams,
  writePendingShare,
  type ShareIncoming,
  type ShareIntent,
} from "@/lib/review/share-target";

function ShareTargetInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [held, setHeld] = useState<ShareIncoming | null>(null);
  const [status, setStatus] = useState<"routing" | "choose">("routing");
  const committed = useRef(false);
  const draftStep = loadReviewDraft()?.step;

  useEffect(() => {
    if (committed.current) return;
    const fromQuery = incomingFromSearchParams(searchParams);
    const incoming = hasShareIncoming(fromQuery)
      ? fromQuery
      : (consumeShareIncoming() ?? fromQuery);
    if (!hasShareIncoming(incoming)) {
      committed.current = true;
      router.replace("/review");
      return;
    }
    const classifiedShare = classifyShare(incoming, { draftStep });
    if (classifiedShare.ambiguous) {
      setHeld(incoming);
      setStatus("choose");
      return;
    }
    committed.current = true;
    writePendingShare(
      buildPendingShare(
        classifiedShare.suggested,
        incoming,
        classifiedShare,
      ),
    );
    router.replace("/review");
  }, [searchParams, router, draftStep]);

  const incoming = held ?? incomingFromSearchParams(searchParams);
  const classified = useMemo(
    () => classifyShare(incoming, { draftStep }),
    [incoming, draftStep],
  );

  function commit(intent: ShareIntent) {
    if (committed.current) return;
    committed.current = true;
    writePendingShare(buildPendingShare(intent, incoming, classified));
    router.replace("/review");
  }

  if (status === "choose") {
    const preview = classified.postBody.trim().slice(0, 120);
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-8">
        <h1 className="text-xl font-semibold tracking-tight">共有の行き先</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          メンバー投稿と検索結果のどちらか判断しづらい。入れる場所を選んで。
        </p>
        {preview ? (
          <p className="line-clamp-4 whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {preview}
            {classified.postBody.length > 120 ? "…" : ""}
          </p>
        ) : null}
        {classified.urls[0] ? (
          <p className="break-all text-xs text-muted-foreground">
            {classified.urls[0]}
          </p>
        ) : null}
        <Button className="h-11 w-full" onClick={() => commit("post")}>
          メンバー投稿欄へ
        </Button>
        <Button
          className="h-11 w-full"
          variant="secondary"
          onClick={() => commit("research")}
        >
          調べる（参照URL）へ
        </Button>
        <Button
          variant="outline"
          className="h-11 w-full"
          onClick={() => router.replace("/review")}
        >
          キャンセル
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8 text-sm text-muted-foreground">
      共有を受け取ってる…
    </div>
  );
}

export default function ShareTargetPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8 text-sm text-muted-foreground">
          共有を受け取ってる…
        </div>
      }
    >
      <ShareTargetInner />
    </Suspense>
  );
}
