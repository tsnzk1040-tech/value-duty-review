"use client";

import { useEffect, useState } from "react";

import { useSettings } from "@/components/settings/settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSalt, hashPassword } from "@/lib/settings/password";
import { setAuthSessionActive } from "@/lib/settings/session";
import type { Member, ValueItem } from "@/lib/rotation/types";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function SettingsForm() {
  const { settings, ready, updateSettings, resetToDefaults, exportJson, importJson } =
    useSettings();
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [holidayDraft, setHolidayDraft] = useState(
    settings.calendar.holidays.join("\n"),
  );

  useEffect(() => {
    setHolidayDraft(settings.calendar.holidays.join("\n"));
  }, [settings.calendar.holidays]);

  if (!ready) {
    return <p className="text-sm text-muted-foreground">読み込み中…</p>;
  }

  function flash(text: string) {
    setMessage(text);
  }

  function addMember() {
    const member: Member = {
      id: newId("m"),
      displayName: "新規メンバー",
      active: true,
    };
    updateSettings((prev) => ({
      ...prev,
      members: [...prev.members, member],
    }));
  }

  function addValueItem() {
    const item: ValueItem = {
      id: newId("v"),
      label: "新しいテーマ",
    };
    updateSettings((prev) => ({
      ...prev,
      valueItems: [...prev.valueItems, item],
    }));
  }

  async function enableAuth() {
    if (newPassword.length < 4) {
      flash("パスワードは4文字以上にして");
      return;
    }
    if (newPassword !== confirmPassword) {
      flash("確認用パスワードが一致しない");
      return;
    }
    const salt = createSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    updateSettings((prev) => ({
      ...prev,
      auth: { enabled: true, salt, passwordHash },
    }));
    setAuthSessionActive(true);
    setNewPassword("");
    setConfirmPassword("");
    flash("認証を有効にした（このタブは解除済み）");
  }

  function disableAuth() {
    updateSettings((prev) => ({
      ...prev,
      auth: { enabled: false, salt: "", passwordHash: "" },
    }));
    setAuthSessionActive(false);
    flash("認証をオフにした");
  }

  function applyHolidaysFromDraft() {
    const holidays = holidayDraft
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s));
    updateSettings((prev) => ({
      ...prev,
      calendar: { ...prev.calendar, holidays },
    }));
    flash(`祝日を ${holidays.length} 件保存した`);
  }

  return (
    <div className="flex flex-col gap-8">
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">認証</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          端末またぎはしない。パスワードは localStorage 内にハッシュ保存（平文は持たない）。
          タブを閉じると再入力。公開URL対策の簡易ゲート。
        </p>
        {settings.auth.enabled ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm">状態: オン</p>
            <Button variant="outline" onClick={disableAuth}>
              認証をオフにする
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm">状態: オフ</p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">新しいパスワード</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">確認</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button onClick={enableAuth}>認証を有効にする</Button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">メンバー</h2>
        <ul className="flex flex-col gap-2">
          {settings.members.map((m, index) => (
            <li
              key={m.id}
              className="flex flex-col gap-2 rounded-lg border border-border p-3"
            >
              <Input
                value={m.displayName}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    members: prev.members.map((x, i) =>
                      i === index ? { ...x, displayName: e.target.value } : x,
                    ),
                  }))
                }
                aria-label="表示名"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={m.active}
                  onChange={(e) =>
                    updateSettings((prev) => ({
                      ...prev,
                      members: prev.members.map((x, i) =>
                        i === index ? { ...x, active: e.target.checked } : x,
                      ),
                    }))
                  }
                />
                アクティブ（ローテ対象）
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateSettings((prev) => ({
                    ...prev,
                    members: prev.members.filter((_, i) => i !== index),
                  }))
                }
              >
                削除
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="outline" onClick={addMember}>
          メンバーを追加
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Value枝（テーマ）</h2>
        <p className="text-xs text-muted-foreground">
          ラベルのみ。理念の全文はここに貼らない（必要ならメモ欄か端末内だけ）。
        </p>
        <ul className="flex flex-col gap-2">
          {settings.valueItems.map((v, index) => (
            <li key={v.id} className="flex flex-col gap-2">
              <Input
                value={v.label}
                onChange={(e) =>
                  updateSettings((prev) => ({
                    ...prev,
                    valueItems: prev.valueItems.map((x, i) =>
                      i === index ? { ...x, label: e.target.value } : x,
                    ),
                  }))
                }
                aria-label="テーマ名"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  updateSettings((prev) => ({
                    ...prev,
                    valueItems: prev.valueItems.filter((_, i) => i !== index),
                  }))
                }
              >
                削除
              </Button>
            </li>
          ))}
        </ul>
        <Button variant="outline" onClick={addValueItem}>
          テーマを追加
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">カレンダールール</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.calendar.skipWeekends}
            onChange={(e) =>
              updateSettings((prev) => ({
                ...prev,
                calendar: { ...prev.calendar, skipWeekends: e.target.checked },
              }))
            }
          />
          土日を休む
        </label>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="holidays">祝日など（YYYY-MM-DD・1行1日）</Label>
          <Textarea
            id="holidays"
            className="min-h-28 font-mono text-xs"
            value={holidayDraft}
            onChange={(e) => setHolidayDraft(e.target.value)}
          />
          <Button variant="outline" onClick={applyHolidaysFromDraft}>
            祝日リストを保存
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">ローテ数値</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cycle-start">サイクル開始日</Label>
          <Input
            id="cycle-start"
            type="date"
            value={settings.rotation.cycleStart}
            onChange={(e) =>
              updateSettings((prev) => ({
                ...prev,
                rotation: { ...prev.rotation, cycleStart: e.target.value },
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bd-count">営業日数</Label>
          <Input
            id="bd-count"
            type="number"
            min={1}
            value={settings.rotation.businessDayCount}
            onChange={(e) =>
              updateSettings((prev) => ({
                ...prev,
                rotation: {
                  ...prev.rotation,
                  businessDayCount: Number(e.target.value) || 1,
                },
              }))
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cooldown">クールダウン（営業日）</Label>
          <Input
            id="cooldown"
            type="number"
            min={0}
            value={settings.rotation.cooldownBusinessDays}
            onChange={(e) =>
              updateSettings((prev) => ({
                ...prev,
                rotation: {
                  ...prev.rotation,
                  cooldownBusinessDays: Number(e.target.value) || 0,
                },
              }))
            }
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">メモ（任意）</h2>
        <Textarea
          value={settings.notes ?? ""}
          onChange={(e) =>
            updateSettings((prev) => ({ ...prev, notes: e.target.value }))
          }
          placeholder="運用メモ。理念全文は載せない方針。"
          className="min-h-24"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">JSON バックアップ</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="secondary"
            onClick={async () => {
              const text = exportJson();
              await navigator.clipboard.writeText(text);
              flash("設定JSONをコピーした");
            }}
          >
            JSONをコピー
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              resetToDefaults();
              flash("POCデフォルトに戻した");
            }}
          >
            デフォルトに戻す
          </Button>
        </div>
        <Label htmlFor="import-json">JSONを貼って取り込み</Label>
        <Textarea
          id="import-json"
          className="min-h-32 font-mono text-xs"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <Button
          variant="outline"
          onClick={() => {
            try {
              importJson(importText);
              flash("JSONを取り込んだ");
              setImportText("");
            } catch {
              flash("取り込みに失敗した。JSONを確認して");
            }
          }}
        >
          取り込む
        </Button>
      </section>
    </div>
  );
}
