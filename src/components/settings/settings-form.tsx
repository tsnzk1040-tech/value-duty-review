"use client";

import { CorporateCreedPanel } from "@/components/creed/corporate-creed-panel";
import { useEffect, useState } from "react";

import { useSettings } from "@/components/settings/settings-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { copyText } from "@/lib/clipboard";
import { createSalt, hashPassword } from "@/lib/settings/password";
import { setAuthSessionActive } from "@/lib/settings/session";
import {
  isWebAuthnPlatformAvailable,
  registerPlatformPasskey,
} from "@/lib/settings/webauthn";
import { defaultCycleStartYmd } from "@/lib/rotation/business-days";
import type { Member, ValueItem } from "@/lib/rotation/types";
import { CREED_CHART_CHANGED, saveCreedChartBlob } from "@/lib/creed/creed-chart-store";

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
  const [platformAuth, setPlatformAuth] = useState(false);

  useEffect(() => {
    setHolidayDraft(settings.calendar.holidays.join("\n"));
  }, [settings.calendar.holidays]);

  useEffect(() => {
    setPlatformAuth(isWebAuthnPlatformAvailable());
  }, []);

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
      newcomer: true,
    };
    updateSettings((prev) => ({
      ...prev,
      members: [...prev.members, member],
    }));
  }

  function addValueItem() {
    const item: ValueItem = {
      id: newId("v"),
      label: "新しい行動指針",
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
      auth: {
        enabled: true,
        salt,
        passwordHash,
        webauthnCredentialId: prev.auth.webauthnCredentialId ?? "",
      },
    }));
    setAuthSessionActive(true);
    setNewPassword("");
    setConfirmPassword("");
    flash("認証を有効にした（このタブは解除済み）");
  }

  function disableAuth() {
    updateSettings((prev) => ({
      ...prev,
      auth: {
        enabled: false,
        salt: "",
        passwordHash: "",
        webauthnCredentialId: "",
      },
    }));
    setAuthSessionActive(false);
    flash("認証をオフにした");
  }

  async function registerPasskey() {
    try {
      const id = await registerPlatformPasskey();
      updateSettings((prev) => ({
        ...prev,
        auth: { ...prev.auth, webauthnCredentialId: id },
      }));
      flash("パスキーを登録した。ログインで生体解除できる");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "登録に失敗した";
      flash(msg);
    }
  }

  function clearPasskey() {
    updateSettings((prev) => ({
      ...prev,
      auth: { ...prev.auth, webauthnCredentialId: "" },
    }));
    flash("パスキー登録を削除した");
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
          タブを閉じると再入力。公開URL対策の簡易ゲート。パスキーは端末の生体（Face
          ID／指紋）で解除できる。
        </p>
        {settings.auth.enabled ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm">状態: オン</p>
            <p className="text-sm text-muted-foreground">
              パスキー:{" "}
              {settings.auth.webauthnCredentialId?.trim()
                ? "登録済み"
                : "未登録"}
            </p>
            {platformAuth ? (
              settings.auth.webauthnCredentialId?.trim() ? (
                <Button variant="outline" onClick={clearPasskey}>
                  パスキー登録を削除
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => void registerPasskey()}>
                  パスキー（生体）を登録
                </Button>
              )
            ) : (
              <p className="text-xs text-muted-foreground">
                この環境では WebAuthn を使えない（HTTPS／対応ブラウザが必要）。
              </p>
            )}
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
              {m.newcomer ? (
                <p className="text-xs text-muted-foreground">
                  新人（このローテでは後方配置。ノート用コピー後は通常扱い）
                </p>
              ) : null}
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
          メンバーを追加（新人として後方配置）
        </Button>
        <p className="text-xs text-muted-foreground">
          追加メンバーは初回ローテのみ後方（最終当番の直前）。そのローテをノート用コピーしたら通常扱いになる。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">企業理念（参照・改変しない）</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          チャートは社外NG。公開URLには置かない。手元の PNG をこの端末へ取り込む（IndexedDB）。
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="creed-chart-file">理念チャート（PNG）</Label>
          <Input
            id="creed-chart-file"
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void (async () => {
                await saveCreedChartBlob(file);
                window.dispatchEvent(new Event(CREED_CHART_CHANGED));
                flash("この端末にチャートを取り込んだ");
              })();
            }}
          />
        </div>
        <CorporateCreedPanel />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">行動指針</h2>
        <p className="text-xs text-muted-foreground">
          毎日のテーマは ×-① などの行動指針（一言一句そのまま）。Value見出し自体は日次テーマにしない。
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
                aria-label="行動指針"
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
          行動指針を追加
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
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.calendar.skipJapaneseHolidays !== false}
            onChange={(e) =>
              updateSettings((prev) => ({
                ...prev,
                calendar: {
                  ...prev.calendar,
                  skipJapaneseHolidays: e.target.checked,
                },
              }))
            }
          />
          日本の祝日を自動スキップ（生成年を見て判定・推奨オン）
        </label>
        <p className="text-xs text-muted-foreground">
          祝日マスタは手入力不要。開始日から営業日を数えるときに通る年の祝日を自動除外する。
        </p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="holidays">追加の休業日（会社休など・YYYY-MM-DD・1行1日）</Label>
          <Textarea
            id="holidays"
            className="min-h-28 font-mono text-xs"
            value={holidayDraft}
            onChange={(e) => setHolidayDraft(e.target.value)}
          />
          <Button variant="outline" onClick={applyHolidaysFromDraft}>
            追加休業日を保存
          </Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">ローテ運用</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cycle-start">サイクル開始日</Label>
          <Select
            value={
              !settings.rotation.cycleStart ||
              settings.rotation.cycleStart === "__auto__"
                ? "__auto__"
                : "__manual__"
            }
            onValueChange={(value) =>
              updateSettings((prev) => ({
                ...prev,
                rotation: {
                  ...prev.rotation,
                  cycleStart:
                    !value || value === "__auto__"
                      ? ""
                      : prev.rotation.cycleStart || defaultCycleStartYmd(),
                },
              }))
            }
          >
            <SelectTrigger id="cycle-start" className="w-full">
              <SelectValue>
                {!settings.rotation.cycleStart ||
                settings.rotation.cycleStart === "__auto__"
                  ? "自動（いま決まっているローテ最終のつぎ営業日）"
                  : "手動指定"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__">
                自動（いま決まっているローテ最終のつぎ営業日）
              </SelectItem>
              <SelectItem value="__manual__">手動指定</SelectItem>
            </SelectContent>
          </Select>
          {settings.rotation.cycleStart ? (
            <Input
              type="date"
              value={settings.rotation.cycleStart}
              onChange={(e) =>
                updateSettings((prev) => ({
                  ...prev,
                  rotation: { ...prev.rotation, cycleStart: e.target.value },
                }))
              }
            />
          ) : null}
          <p className="text-xs text-muted-foreground">
            毎日回すなら自動のまま。違うときだけ手動。枠数はアクティブ人数に自動同期（設定項目に出さない）。
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cooldown">当番間隔の下限目安（営業日）</Label>
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
          <p className="text-xs text-muted-foreground">
            同じ人が近すぎる日付にならないようにする目安。
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="max-gap">当番間隔の上限目安（営業日）</Label>
          <Input
            id="max-gap"
            type="number"
            min={0}
            value={settings.rotation.maxGapBusinessDays}
            onChange={(e) =>
              updateSettings((prev) => ({
                ...prev,
                rotation: {
                  ...prev.rotation,
                  maxGapBusinessDays: Number(e.target.value) || 0,
                },
              }))
            }
          />
          <p className="text-xs text-muted-foreground">
            開きすぎを抑える目安。0＝上限なし。既定21。
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={settings.rotation.avoidSameValueBand ?? true}
            onChange={(e) =>
              updateSettings((prev) => ({
                ...prev,
                rotation: {
                  ...prev.rotation,
                  avoidSameValueBand: e.target.checked,
                },
              }))
            }
          />
          前回と同じ Value 帯（1〜6）を避ける
        </label>
        <p className="text-xs text-muted-foreground sm:col-span-2 -mt-2">
          ON（既定）: 違う帯の候補がいれば必ずそちら。最終当番ロック時や候補切れだけ例外。
        </p>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="theme-start">サイクル開始テーマ</Label>
          <Select
            value={
              !settings.rotation.themeStartValueItemId ||
              settings.rotation.themeStartValueItemId === "__auto__"
                ? "__auto__"
                : settings.rotation.themeStartValueItemId
            }
            onValueChange={(value) =>
              updateSettings((prev) => ({
                ...prev,
                rotation: {
                  ...prev.rotation,
                  themeStartValueItemId:
                    !value || value === "__auto__" ? "" : value,
                },
              }))
            }
          >
            <SelectTrigger id="theme-start" className="w-full">
              <SelectValue placeholder="どのテーマから始めるか">
                {!settings.rotation.themeStartValueItemId ||
                settings.rotation.themeStartValueItemId === "__auto__"
                  ? "自動（前サイクル最終テーマの次）"
                  : (settings.valueItems.find(
                      (v) => v.id === settings.rotation.themeStartValueItemId,
                    )?.label ?? settings.rotation.themeStartValueItemId)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__auto__">
                自動（前サイクル最終テーマの次）
              </SelectItem>
              {settings.valueItems.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            既定は前サイクル最終テーマの次（自動）。違う場合だけ手動で修正する。サイクル内はカタログ順固定。
          </p>
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="last-assignee">最終当番（最低限ルール）</Label>
          <Select
            value={settings.rotation.lastAssigneeMemberId || "__none__"}
            onValueChange={(value) =>
              updateSettings((prev) => ({
                ...prev,
                rotation: {
                  ...prev.rotation,
                  lastAssigneeMemberId:
                    !value || value === "__none__" ? "" : value,
                },
              }))
            }
          >
            <SelectTrigger id="last-assignee" className="w-full">
              <SelectValue placeholder="最終日の当番">
                {!settings.rotation.lastAssigneeMemberId
                  ? "（ロックなし）"
                  : (settings.members.find(
                      (m) => m.id === settings.rotation.lastAssigneeMemberId,
                    )?.displayName ?? settings.rotation.lastAssigneeMemberId)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">（ロックなし）</SelectItem>
              {settings.members
                .filter((m) => m.active)
                .map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.displayName}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            土日＋日本の祝日自動スキップ＋最後はツネヅカ（＝トシオ／常塚（新ローテ））。会社休は上の「追加の休業日」へ。
          </p>
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
            onClick={() => {
              const text = exportJson();
              if (copyText(text)) flash("設定JSONをコピーした");
              else flash("コピーに失敗した。選択して手動コピーして");
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
