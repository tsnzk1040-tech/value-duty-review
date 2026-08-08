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
import { formatNotebookCopy } from "@/lib/rotation/format-notebook";
import {
  appendHistoryCycle,
  cycleFromDays,
  hasPreviousRotation,
  latestPreviousCycle,
  parseRotationPaste,
} from "@/lib/rotation/previous-cycle";
import type { RotationDay } from "@/lib/rotation/types";

export function RotationWorkbench() {
  const { settings, ready, updateSettings } = useSettings();
  const [days, setDays] = useState<RotationDay[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [seed, setSeed] = useState(20260808);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [previousPaste, setPreviousPaste] = useState("");
  const [previousHint, setPreviousHint] = useState<string | null>(null);

  const hasPrevious = hasPreviousRotation(settings.rotation.historyCycles);
  const previous = latestPreviousCycle(settings.rotation.historyCycles);

  useEffect(() => {
    if (!ready) return;
    if (!hasPreviousRotation(settings.rotation.historyCycles)) {
      setDays([]);
      setWarnings([
        "前回のローテが必須です。下に前回分を貼って登録してから生成する。",
      ]);
      return;
    }
    const result = fairAssign({
      members: settings.members,
      valueItems: settings.valueItems,
      historyCycles: settings.rotation.historyCycles,
      cycleStart: settings.rotation.cycleStart,
      businessDayCount: settings.rotation.businessDayCount,
      cooldownBusinessDays: settings.rotation.cooldownBusinessDays,
      lastAssigneeMemberId: settings.rotation.lastAssigneeMemberId,
      themeStartValueItemId: settings.rotation.themeStartValueItemId,
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

  function runAssign(nextSeed: number) {
    if (!hasPreviousRotation(settings.rotation.historyCycles)) {
      setDays([]);
      setWarnings([
        "前回のローテが必須です。下に前回分を貼って登録してから生成する。",
      ]);
      return;
    }
    const result = fairAssign({
      members: settings.members,
      valueItems: settings.valueItems,
      historyCycles: settings.rotation.historyCycles,
      cycleStart: settings.rotation.cycleStart,
      businessDayCount: settings.rotation.businessDayCount,
      cooldownBusinessDays: settings.rotation.cooldownBusinessDays,
      lastAssigneeMemberId: settings.rotation.lastAssigneeMemberId,
      themeStartValueItemId: settings.rotation.themeStartValueItemId,
      seed: nextSeed,
      calendar: settings.calendar,
    });
    setDays(result.days);
    setWarnings(result.warnings);
    setSeed(nextSeed);
  }

  function reshuffle() {
    const nextSeed = (seed * 1664525 + 1013904223) >>> 0;
    runAssign(nextSeed);
    setCopyHint(null);
  }

  function registerPrevious() {
    const parsed = parseRotationPaste(
      previousPaste,
      settings.members,
      settings.valueItems,
    );
    if (parsed.days.length === 0) {
      setPreviousHint(parsed.errors.join(" / ") || "登録できる行がない");
      return;
    }
    const cycle = cycleFromDays(parsed.days, "前回ローテ");
    updateSettings((prev) => ({
      ...prev,
      rotation: {
        ...prev.rotation,
        historyCycles: appendHistoryCycle(prev.rotation.historyCycles, cycle),
      },
    }));
    setPreviousPaste("");
    setPreviousHint(
      `前回ローテを登録した（${parsed.days.length}日${
        parsed.errors.length ? `・警告 ${parsed.errors.length}` : ""
      }）`,
    );
  }

  function patchMember(index: number, memberId: string) {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, memberId } : d)),
    );
    setWarnings([]);
  }

  async function copyNotebook() {
    if (days.length === 0) {
      setCopyHint("コピーする日別ローテがない");
      return;
    }
    try {
      await navigator.clipboard.writeText(notebookText);
      const assignedIds = new Set(days.map((d) => d.memberId));
      const cycle = cycleFromDays(days, "確定サイクル");
      updateSettings((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.newcomer && assignedIds.has(m.id) ? { ...m, newcomer: false } : m,
        ),
        rotation: {
          ...prev.rotation,
          historyCycles: appendHistoryCycle(
            prev.rotation.historyCycles,
            cycle,
          ),
        },
      }));
      setCopyHint(
        "ノート用にコピーし、このサイクルを「前回」として保存した（次の生成に使う）",
      );
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
          毎日回す前提: 開始日・開始テーマは自動（違うときだけ手動）。前回ローテ必須。枠＝人数。最終は常塚。
          メンバー{settings.members.filter((m) => m.active).length}・行動指針
          {settings.valueItems.length}・間隔目安
          {settings.rotation.cooldownBusinessDays}・祝日自動
          {settings.calendar.skipJapaneseHolidays !== false ? "ON" : "OFF"}
          {settings.rotation.cycleStart
            ? `・開始日手動 ${settings.rotation.cycleStart}`
            : "・開始日自動"}
        </p>
        {previous ? (
          <p className="text-xs text-muted-foreground">
            前回: {previous.label}（{previous.days.length}日）
          </p>
        ) : (
          <p className="text-sm text-amber-800 dark:text-amber-200">
            前回ローテ未登録のため生成できない。下に貼って登録する。
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-11 w-full sm:w-auto"
            onClick={reshuffle}
            disabled={!hasPrevious}
          >
            公平スキルでシャッフル
          </Button>
          <Button
            className="h-11 w-full sm:w-auto"
            variant="secondary"
            onClick={copyNotebook}
            disabled={days.length === 0}
          >
            ノート用にコピー（＝前回として保存）
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

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium">前回ローテ（必須）</h2>
        <p className="text-xs text-muted-foreground">
          形式: 1行が「YYYY-MM-DD + Tab + 当番名 + Tab + テーマ」。ノート用テキストの日別行をそのまま貼れる。
        </p>
        <Textarea
          value={previousPaste}
          onChange={(e) => setPreviousPaste(e.target.value)}
          placeholder={"2026-07-28\t常塚（新ローテ）\t6-④\n..."}
          className="min-h-28 font-mono text-xs"
        />
        <Button variant="outline" onClick={registerPrevious}>
          前回として登録
        </Button>
        {previousHint ? (
          <p className="text-sm text-muted-foreground">{previousHint}</p>
        ) : null}
      </section>

      {hasPrevious ? (
        <section className="flex flex-col gap-3" aria-label="日別アサイン">
          <h2 className="text-sm font-medium">
            日別（当番のみ手直し可・テーマは固定）
          </h2>
          <ul className="flex flex-col gap-3">
            {days.map((day, index) => {
              const themeLabel =
                settings.valueItems.find((v) => v.id === day.valueItemId)
                  ?.label ?? day.valueItemId;
              return (
                <li
                  key={day.date}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
                >
                  <p className="text-sm font-medium tabular-nums">
                    {day.date}
                    {day.gapFromPreviousBusinessDays != null ? (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        前回から{day.gapFromPreviousBusinessDays}営業日
                      </span>
                    ) : null}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor={`member-${day.date}`}>当番</Label>
                    <Select
                      value={day.memberId}
                      onValueChange={(value) => {
                        if (value) patchMember(index, value);
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
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">テーマ </span>
                    {themeLabel}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {days.length > 0 ? (
        <section className="flex flex-col gap-2">
          <Label htmlFor="notebook-preview">ノート用プレビュー</Label>
          <Textarea
            id="notebook-preview"
            readOnly
            value={notebookText}
            className="min-h-48 font-mono text-xs"
          />
        </section>
      ) : null}
    </div>
  );
}
