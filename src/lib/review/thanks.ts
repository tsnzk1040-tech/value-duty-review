/** 構成ルールどおりのお礼文. */
export function formatThanks(presenterName: string): string {
  let call = presenterName.trim() || "（お名前）";
  if (!/さん/.test(call)) call = `${call}さん`;
  return `${call}、振り返りコメント共有頂きありがとうございます！`;
}
