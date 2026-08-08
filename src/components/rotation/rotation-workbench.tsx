"use client";

import { useEffect, useMemo, useState } from "react";

import { useSettings } from "@/components/settings/settings-provider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fairAssign } from "@/lib/rotation/fair-assign";
import {
  formatNotebookCopy,
  ROTATION_ASSIGNEE_INSTRUCTION,
} from "@/lib/rotation/format-notebook";
import type { RotationDay } from "@/lib/rotation/types";

export function RotationWorkbench() {
  const { settings, ready } = useSettings();
  const [days, setDays] = useState<RotationDay[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [seed, setSeed] = useState(20260808);
  const [copyHint, setCopyHint] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const result = fairAssign({
      members: settings.members,
      valueItems: settings.valueItems,
      historyCycles: settings.rotation.historyCycles,
      cycleStart: settings.rotation.cycleStart,
      businessDayCount: settings.rotation.businessDayCount,
      cooldownBusinessDays: settings.rotation.cooldownBusinessDays,
      seed: 20260808,
      calendar: settings.calendar,
    });
    setDays(result.days);
    setWarnings(result.warnings);
    setSeed(20260808);
  }, [ready, settings]);

  const notebookText = useMemo(
    () => formatNotebookCopy(days, settings.members, settings.valueItems),
    [days, settings.members, settings.valueItems],
  );

  function reshuffle() {
    const nextSeed = (seed * 1664525 + 1013904223) >>> 0;
    const result = fairAssign({
      members: settings.members,
      valueItems: settings.valueItems,
      historyCycles: settings.rotation.historyCycles,
      cycleStart: settings.rotation.cycleStart,
      businessDayCount: settings.rotation.businessDayCount,
      cooldownBusinessDays: settings.rotation.cooldownBusinessDays,
      seed: nextSeed,
      calendar: settings.calendar,
    });
    setDays(result.days);
    setWarnings(result.warnings);
    setSeed(nextSeed);
    setCopyHint(null);
  }

  function patchDay(
    index: number,
    patch: Partial<Pick<RotationDay, "memberId" | "valueItemId">>,
  ) {
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
    setWarnings([]);
  }

  async function copyNotebook() {
    try {
      await navigator.clipboard.writeText(notebookText);
      setCopyHint("ノート用テキストをコピーした");
    } catch {
      setCopyHint("コピーに失敗した。下のテキストを手動選択してコピーして");
    }
  }

  if (!ready) {
    return <p className="text-sm text-muted-foreground">読み込み中…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          設定マスタ使用: メンバー{settings.members.filter((m) => m.active).length}・
          Value{settings.valueItems.length}・開始 {settings.rotation.cycleStart}・
          {settings.rotation.businessDayCount}営業日・クールダウン
          {settings.rotation.cooldownBusinessDays}・祝日
          {settings.calendar.holidays.length}件
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button className="h-11 w-full sm:w-auto" onClick={reshuffle}>
            公平スキルでシャッフル
          </Button>
          <Button
            className="h-11 w-full sm:w-auto"
            variant="secondary"
            onClick={copyNotebook}
          >
            ノート用にコピー
          </Button>
        </div>
        {copyHint ? (
          <p className="text-sm text-muted-foreground">{copyHint}</p>
        ) : null}
        {warnings.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-amber-800 dark:text-amber-200">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="flex flex-col gap-3" aria-label="日別アサイン">
        <h2 className="text-sm font-medium">日別（手直し可）</h2>
        <ul className="flex flex-col gap-3">
          {days.map((day, index) => (
            <li
              key={day.date}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
            >
              <p className="text-sm font-medium tabular-nums">{day.date}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`member-${day.date}`}>当番</Label>
                  <Select
                    value={day.memberId}
                    onValueChange={(value) => {
                      if (value) patchDay(index, { memberId: value });
                    }}
                  >
                    <SelectTrigger id={`member-${day.date}`} className="w-full">
                      <SelectValue>
                        {settings.members.find((m) => m.id === day.memberId)
                          ?.displayName ?? day.memberId}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {settings.members
                        .filter((m) => m.active)
                        .map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.displayName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`value-${day.date}`}>テーマ</Label>
                  <Select
                    value={day.valueItemId}
                    onValueChange={(value) => {
                      if (value) patchDay(index, { valueItemId: value });
                    }}
                  >
                    <SelectTrigger id={`value-${day.date}`} className="w-full">
                      <SelectValue>
                        {settings.valueItems.find((v) => v.id === day.valueItemId)
                          ?.label ?? day.valueItemId}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {settings.valueItems.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <Label htmlFor="notebook-preview">ノート用プレビュー</Label>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {ROTATION_ASSIGNEE_INSTRUCTION}
        </p>
        <Textarea
          id="notebook-preview"
          readOnly
          value={notebookText}
          className="min-h-48 font-mono text-xs"
        />
      </section>
    </div>
  );
}
