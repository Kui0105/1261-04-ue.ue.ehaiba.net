"use client"

import { useMemo, useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { useToast } from "@/components/ui/toast"
import { useSession } from "@/lib/session"
import { DB } from "@/lib/data"
import { fmtMoney } from "@/lib/format"
import Link from "next/link"

const FLOW_PAGE_SIZE = 20
const FLOW_DEDUCT_TYPES = ["话费充值", "短信群发", "平台扣减"]

export default function AccountPage() {
  const { session } = useSession()
  const toast = useToast()
  const [corpOpen, setCorpOpen] = useState(false)

  const [keyword, setKeyword] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [acctFilter, setAcctFilter] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [page, setPage] = useState(1)

  const flows = DB.FLOWS || []

  const { totalConsume, totalRecharge } = useMemo(() => {
    let c = 0
    let r = 0
    flows.forEach((f) => {
      if (f.amount < 0) c += Math.abs(f.amount)
      else r += f.amount
    })
    return {
      totalConsume: Math.round(c * 100) / 100,
      totalRecharge: Math.round(r * 100) / 100,
    }
  }, [flows])

  const isEnterprise = session?.type === "enterprise"

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return flows.filter((f) => {
      if (kw) {
        const id = f.id.toLowerCase()
        const oid = (f.orderId || "").toLowerCase()
        if (id.indexOf(kw) === -1 && oid.indexOf(kw) === -1) return false
      }
      if (typeFilter && f.type !== typeFilter) return false
      if (acctFilter && f.account !== acctFilter) return false
      if (dateFrom && f.time < dateFrom) return false
      if (dateTo && f.time > dateTo) return false
      return true
    })
  }, [flows, keyword, typeFilter, acctFilter, dateFrom, dateTo])

  const totalPages = Math.max(1, Math.ceil(filtered.length / FLOW_PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * FLOW_PAGE_SIZE
  const pageRows = filtered.slice(start, start + FLOW_PAGE_SIZE)

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(1)
    }
  }

  function isMobile() {
    if (typeof navigator === "undefined") return false
    return (
      /Mobi|Android|iPhone|iPad|iPod|MicroMessenger/i.test(navigator.userAgent) ||
      window.innerWidth <= 640
    )
  }

  function openRecharge() {
    if (isEnterprise) {
      setCorpOpen(true)
    } else {
      if (!isMobile()) {
        toast("个人用户充值请在手机端使用微信支付")
        return
      }
      toast("正在调起微信支付…（原型演示）")
    }
  }

  const tiles = isEnterprise
    ? [
        { n: fmtMoney(session?.balance ?? 0), l: "账户余额", c: "blue" },
        {
          n: fmtMoney((session?.creditLimit ?? 0) - (session?.usedCredit ?? 0)),
          l: "可用预授信额度",
          c: "green",
        },
        { n: fmtMoney(totalConsume), l: "累计消费金额", c: "" },
        { n: fmtMoney(totalRecharge), l: "累计充值金额", c: "" },
      ]
    : []

  const corp = DB.CORP_ACCOUNT

  return (
    <AppShell active="account">
      <div className="page-head">
        <h1>账户中心</h1>
        <p>查看账户交易流水明细，掌握账户消费与充值情况。</p>
      </div>

      {isEnterprise && (
        <div className="panel rech-entry">
          <div className="rech-entry-info">
            <div className="rech-entry-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
              </svg>
            </div>
            <div>
              <b>账户充值</b>
              <p>通过对公转账向平台账户充值，到账后由财务人工加款。</p>
            </div>
          </div>
          <Button variant="primary" onClick={openRecharge}>
            立即充值
          </Button>
        </div>
      )}

      {isEnterprise && (
        <div className="tiles" style={{ marginBottom: 18 }}>
          {tiles.map((t, i) => (
            <div key={i} className={`tile ${t.c}`}>
              <div className="n">{t.n}</div>
              <div className="l">{t.l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="panel acct-flow-panel">
        <div className="acct-flow-head">
          <h3 style={{ margin: 0 }}>交易明细</h3>
        </div>

        {!isEnterprise && (
          <div className="flow-summary">
            <div className="flow-sum">
              <span className="flow-sum-l">累计消费金额</span>
              <span className="flow-sum-n">{fmtMoney(totalConsume)}</span>
            </div>
          </div>
        )}

        <div className="flow-filter-bar">
          <div className="filter-field">
            <label>流水号 / 订单号</label>
            <input
              type="text"
              className="field-input"
              placeholder="输入关键词搜索…"
              value={keyword}
              onChange={(e) => resetPage(setKeyword)(e.target.value)}
            />
          </div>
          <div className="filter-field">
            <label>交易类型</label>
            <select
              className="field-input"
              value={typeFilter}
              onChange={(e) => resetPage(setTypeFilter)(e.target.value)}
            >
              <option value="">全部类型</option>
              <option value="话费充值">话费充值</option>
              <option value="短信群发">短信群发</option>
              <option value="平台充值">平台充值</option>
              <option value="平台扣减">平台扣减</option>
              <option value="订单退款">订单退款</option>
            </select>
          </div>
          <div className="filter-field">
            <label>交易账户</label>
            <select
              className="field-input"
              value={acctFilter}
              onChange={(e) => resetPage(setAcctFilter)(e.target.value)}
            >
              <option value="">全部账户</option>
              <option value="系统余额">系统余额</option>
              <option value="微信支付">微信支付</option>
            </select>
          </div>
          <div className="filter-field">
            <label>交易时间</label>
            <div className="date-range">
              <input
                type="date"
                className="field-input"
                value={dateFrom}
                onChange={(e) => resetPage(setDateFrom)(e.target.value)}
              />
              <span className="date-sep">~</span>
              <input
                type="date"
                className="field-input"
                value={dateTo}
                onChange={(e) => resetPage(setDateTo)(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flow-table-wrap">
          <table className="tbl flow-table">
            <thead>
              <tr>
                <th>流水号</th>
                <th>关联订单号</th>
                <th>交易类型</th>
                <th>交易金额</th>
                <th>变动后余额</th>
                <th>交易账户</th>
                <th>交易时间</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((f) => {
                const isDeduct = FLOW_DEDUCT_TYPES.indexOf(f.type) !== -1
                return (
                  <tr key={f.id}>
                    <td className="mono-sm">{f.id}</td>
                    <td className="mono-sm">
                      {f.orderId ? (
                        <Link
                          href={`/order-detail?id=${encodeURIComponent(f.orderId)}`}
                          className="order-link"
                        >
                          {f.orderId}
                        </Link>
                      ) : (
                        <span className="muted-sm">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${isDeduct ? "fail" : "success"}`}>{f.type}</span>
                    </td>
                    <td
                      className="amount"
                      style={{ color: isDeduct ? "var(--danger)" : "var(--success)" }}
                    >
                      {f.amount >= 0 ? "+" : ""}
                      {fmtMoney(f.amount)}
                    </td>
                    <td className="amount">{fmtMoney(f.after)}</td>
                    <td>{f.account}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{f.time}</td>
                  </tr>
                )
              })}
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    暂无符合条件的交易记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
            >
              上一页
            </Button>
            <span className="page-info">
              {currentPage} / {totalPages} 页（共 {filtered.length} 条）
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              下一页
            </Button>
          </div>
        )}
      </div>

      <Modal open={corpOpen} onClose={() => setCorpOpen(false)} title="对公账户充值" maxWidth={460}>
        <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14 }}>
          请通过对公转账向以下账户充值，到账后由财务人工加款。
        </p>
        <div className="corp-account">
          <div className="ca-row">
            <span className="ca-k">收款户名</span>
            <span className="ca-v">{corp.company}</span>
          </div>
          <div className="ca-row">
            <span className="ca-k">开户银行</span>
            <span className="ca-v">{corp.bank}</span>
          </div>
          <div className="ca-row">
            <span className="ca-k">收款账号</span>
            <span className="ca-v mono">{corp.account}</span>
          </div>
        </div>
        <div className="banner-note" style={{ marginTop: 14 }}>
          <div className="txt">
            <b>温馨提示</b>
            <p>{corp.note + " " + corp.support}</p>
          </div>
        </div>
        <Button variant="primary" block onClick={() => setCorpOpen(false)} style={{ marginTop: 16 }}>
          我知道了
        </Button>
      </Modal>
    </AppShell>
  )
}
