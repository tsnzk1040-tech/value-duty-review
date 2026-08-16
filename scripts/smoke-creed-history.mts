import { extractSummaryBody } from "../src/lib/review/prompts";
import { historyExamplePreview } from "../src/lib/review/history";
import { findRotationDayByDate } from "../src/lib/rotation/previous-cycle";
import { assignmentForReviewDate } from "../src/lib/review/rotation-lookup";
import { POC_HISTORY_CYCLES, POC_MEMBERS, POC_VALUE_ITEMS } from "../src/lib/rotation/seed";

function assert(cond: unknown, message: string) {
  if (!cond) {
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok  ${message}`);
}

const summary =
  "Value１　最高の、もっと先へ   の4番目の行動指針について、言葉の意味を自分で調べたうえで、朝の打ち合わせでお客様の言い回しをメモしてみた想いを共有頂きました！";

const body = extractSummaryBody(summary, "1-④わたしたちは学び続ける");
assert(
  !body.includes("最高の、もっと先へ"),
  "preview strips Value heading",
);
assert(
  !body.includes("4番目の行動指針"),
  "preview strips ordinal template",
);
assert(
  !body.includes("想いを共有頂きました"),
  "preview strips suffix",
);
assert(
  body.includes("朝の打ち合わせ"),
  "preview keeps unique practice example",
);

const preview = historyExamplePreview({
  id: "t",
  createdAt: "2026-08-14T00:00:00.000Z",
  reviewDate: "2026-08-14",
  presenterName: "煤賀さん",
  themeId: "v1-4",
  themeLabel: "1-④わたしたちは学び続ける",
  sourcePost: "学び続けるために調べた",
  opener: "煤賀さん、振り返りコメント共有頂きありがとうございます！",
  summary,
  leaderNote: "所感",
  closing: "締め",
  links: [],
  fullText: summary,
  keywords: "",
  researchBrief: "",
});
assert(
  preview.startsWith("言葉の意味") || preview.includes("朝の打ち合わせ"),
  "historyExamplePreview shows unique body",
);
assert(!preview.startsWith("Value"), "historyExamplePreview does not start with template");

const day = findRotationDayByDate(POC_HISTORY_CYCLES, "2026-08-14");
assert(day?.memberId === "m-susuga", "08-14 rotation is 煤賀さん");
assert(day?.valueItemId === "v4-3", "08-14 rotation theme is 4-③ (v4-3)");

const assignment = assignmentForReviewDate(
  POC_HISTORY_CYCLES,
  "2026-08-14",
  POC_MEMBERS,
  POC_VALUE_ITEMS,
);
assert(assignment?.presenterName === "煤賀さん", "assignment presenter");
assert(
  assignment?.themeLabel.includes("4-③"),
  `assignment theme is 4-③ (got ${assignment?.themeLabel})`,
);

const sakurai = assignmentForReviewDate(
  POC_HISTORY_CYCLES,
  "2026-08-12",
  POC_MEMBERS,
  POC_VALUE_ITEMS,
);
assert(sakurai?.presenterName === "櫻井さん", "08-12 is 櫻井さん");
assert(sakurai?.themeLabel.includes("4-①"), "08-12 theme is 4-①");

assert(
  findRotationDayByDate(POC_HISTORY_CYCLES, "2026-08-16") == null,
  "Sunday has no rotation day",
);

if (process.exitCode) {
  console.error("smoke failed");
  process.exit(1);
}
console.log("all smoke checks passed");
