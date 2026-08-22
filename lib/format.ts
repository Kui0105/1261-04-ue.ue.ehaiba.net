export function fmtMoney(n: number | string | null | undefined): string {
  const num = Number(n) || 0;
  return "¥" + num.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function isValidPhone(v: string): boolean {
  return /^1\d{10}$/.test(v);
}

/* 充值单条状态徽标 */
export function rechargeStatusText(status: string): { cls: string; txt: string } {
  const map: Record<string, [string, string]> = {
    success: ["success", "充值成功"],
    pending: ["pending", "待充值"],
    process: ["process", "充值中"],
    fail: ["fail", "充值失败"],
  };
  const [cls, txt] = map[status] || ["gray", status];
  return { cls, txt };
}

/* 短信单条状态徽标 */
export function smsStatusText(status: string): { cls: string; txt: string } {
  if (status === "success") return { cls: "success", txt: "发送成功" };
  if (status === "fail") return { cls: "fail", txt: "发送失败" };
  return { cls: "process", txt: "发送中" };
}

/* 订单（批次）层级状态：整批失败统称“部分失败” */
export function orderStatusText(status: string): { cls: string; txt: string } {
  if (status === "fail") return { cls: "fail", txt: "部分失败" };
  return rechargeStatusText(status);
}

/* 订单详情页订单级状态：仅 进行中 / 已完成 */
export function orderDoneText(status: string): { cls: string; txt: string } {
  if (status === "success" || status === "fail") return { cls: "success", txt: "已完成" };
  return { cls: "process", txt: "进行中" };
}

export function getTaxLabel(tax: string): string {
  return tax === "taxed" ? "含税（6%专票）" : "未税（普票）";
}
