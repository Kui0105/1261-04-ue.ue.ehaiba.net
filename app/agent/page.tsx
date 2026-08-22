"use client"

import { useMemo, useRef, useState } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"
import { FakeQr } from "@/components/ui/fake-qr"
import { useToast } from "@/components/ui/toast"
import { useSession } from "@/lib/session"
import { DB } from "@/lib/data"
import { fmtMoney } from "@/lib/format"

type ApplyUserType = "enterprise" | "personal"
type ViewState = "apply" | "pending" | "rejected" | "approved"

const TEAM_PAGE_SIZE = 10
const WD_PAGE_SIZE = 10
const COMM_PAGE_SIZE = 20

const AGREEMENT_SECTIONS: { h: string; body: React.ReactNode }[] = [
  {
    h: "第一章 总则",
    body: (
      <p>
        本协议是用户（以下简称&quot;乙方&quot;）与平台运营方（以下简称&quot;甲方&quot;）就代理商合作事宜达成的法律约束文件。乙方在提交申请前应仔细阅读本协议全部条款。
      </p>
    ),
  },
  {
    h: "第二章 合作模式",
    body: (
      <ol>
        <li>乙方作为甲方平台的推广代理商，负责在授权范围内开展业务推广活动。</li>
        <li>甲方为乙方提供专属推广链接及二维码，客户通过该渠道注册后将自动关联至乙方名下。</li>
        <li>合作采用两级分销模式：直推佣金比例为充值金额的 3‰，间推佣金比例为 2‰。</li>
        <li>
          仅推广的<strong>企业用户</strong>产生的充值行为计入佣金结算；个人用户推广不产生佣金。
        </li>
      </ol>
    ),
  },
  {
    h: "第三章 权利与义务",
    body: (
      <ul>
        <li>
          <strong>甲方权利：</strong>有权对乙方的推广行为进行监督，对违规操作有权暂停或终止合作。
        </li>
        <li>
          <strong>甲方义务：</strong>按时结算佣金、提供推广素材及技术支持、保障系统稳定运行。
        </li>
        <li>
          <strong>乙方权利：</strong>有权查看推广数据及佣金明细、随时申请佣金提现。
        </li>
        <li>
          <strong>乙方义务：</strong>保证所提供信息真实有效、不得进行虚假宣传、不得恶意刷单套取佣金。
        </li>
      </ul>
    ),
  },
  {
    h: "第四章 佣金结算",
    body: (
      <p>
        佣金按月结算，每月 5 日前生成上月佣金账单。乙方可在代理商中心提交提现申请，经财务审核后批量转账至乙方指定银行账户。最低提现金额为 ¥100.00。
      </p>
    ),
  },
  {
    h: "第五章 协议终止",
    body: (
      <p>
        任何一方均可提前 30 日书面通知对方终止本协议。协议终止后，乙方已产生但未结算的佣金将在下一个结算周期内完成支付。
      </p>
    ),
  },
]

export default function AgentPage() {
  const { session, updateSession } = useSession()
  const toast = useToast()

  const initialView: ViewState = (() => {
    const st = session?.agentStatus
    if (st === "approved") return "approved"
    if (st === "pending") return "pending"
    if (st === "rejected") return "rejected"
    return "apply"
  })()

  const [view, setView] = useState<ViewState>(initialView)
  const [rejectReason, setRejectReason] = useState(
    session?.agentRejectReason || "您的资质不符合代理商入驻要求，请完善资料后重新申请。",
  )

  // Apply form state
  const [applyUserType, setApplyUserType] = useState<ApplyUserType>(
    session?.agentApplyData?.userType === "personal" ? "personal" : "enterprise",
  )
  const [realName, setRealName] = useState(session?.agentApplyData?.realName || "")
  const [contactPhone, setContactPhone] = useState(session?.agentApplyData?.contactPhone || "")
  const [contactEmail, setContactEmail] = useState(session?.agentApplyData?.contactEmail || "")
  const [agree, setAgree] = useState(false)
  const [licenseFile, setLicenseFile] = useState("")
  const [idFront, setIdFront] = useState("")
  const [idBack, setIdBack] = useState("")

  const licenseRef = useRef<HTMLInputElement>(null)
  const idFrontRef = useRef<HTMLInputElement>(null)
  const idBackRef = useRef<HTMLInputElement>(null)

  const [agreementOpen, setAgreementOpen] = useState(false)

  function validImg(name: string) {
    return /\.(jpg|jpeg|png)$/.test(name.toLowerCase())
  }

  function submitApplication() {
    if (!realName.trim()) return toast("请输入真实姓名")
    if (!contactPhone.trim()) return toast("请输入联系电话")
    if (!/^1\d{10}$/.test(contactPhone.trim())) return toast("请输入正确的手机号码")
    if (!contactEmail.trim()) return toast("请输入联系邮箱")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) return toast("请输入正确的邮箱地址")
    if (!agree) return toast("请先勾选同意《代理商合作协议》")
    if (applyUserType === "enterprise") {
      if (!licenseFile) return toast("请上传营业执照图片")
    } else {
      if (!idFront) return toast("请上传身份证正面图片")
      if (!idBack) return toast("请上传身份证反面图片")
    }

    const phone = contactPhone.trim()
    updateSession({
      agentStatus: "pending",
      agentApplyData: {
        realName: realName.trim(),
        contactPhone: phone,
        contactEmail: contactEmail.trim(),
        userType: applyUserType,
      },
    })
    setView("pending")
    setTimeout(() => doReviewResult(phone), 3000)
  }

  function doReviewResult(phone: string) {
    if (phone === "13100000002") {
      const reason =
        "经平台审核，您提交的联系方式关联账户存在异常交易记录，暂不符合代理商入驻要求。" +
        "建议：完善企业资质材料（如提供加盖公章的营业执照扫描件），或等待 30 天后重新申请。"
      updateSession({ agentStatus: "rejected", agentRejectReason: reason, isAgent: false })
      setRejectReason(reason)
      setView("rejected")
    } else {
      updateSession({ agentStatus: "approved", isAgent: true, agentRejectReason: undefined })
      setView("approved")
      toast("恭喜！您的代理商申请已审核通过")
    }
  }

  function reapply() {
    updateSession({ agentStatus: undefined, agentRejectReason: undefined, isAgent: false })
    setAgree(true)
    setLicenseFile("")
    setIdFront("")
    setIdBack("")
    setView("apply")
    toast("已恢复驳回前填写的内容，修改后可重新提交")
  }

  return (
    <AppShell active="agent">
      {view === "apply" && (
        <ApplyForm
          applyUserType={applyUserType}
          setApplyUserType={setApplyUserType}
          realName={realName}
          setRealName={setRealName}
          contactPhone={contactPhone}
          setContactPhone={setContactPhone}
          contactEmail={contactEmail}
          setContactEmail={setContactEmail}
          agree={agree}
          setAgree={setAgree}
          licenseFile={licenseFile}
          setLicenseFile={setLicenseFile}
          idFront={idFront}
          setIdFront={setIdFront}
          idBack={idBack}
          setIdBack={setIdBack}
          licenseRef={licenseRef}
          idFrontRef={idFrontRef}
          idBackRef={idBackRef}
          validImg={validImg}
          toast={toast}
          onOpenAgreement={() => setAgreementOpen(true)}
          onSubmit={submitApplication}
        />
      )}

      {view === "pending" && (
        <div className="panel">
          <div className="review-status">
            <div className="review-status-icon review-spinning" aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <div className="review-status-title">审核中</div>
            <div className="review-status-desc">
              您的代理商申请已提交，平台正在审核中…
              <br />
              预计 1-3 个工作日内完成审核，请耐心等待。
            </div>
          </div>
        </div>
      )}

      {view === "rejected" && (
        <div className="panel">
          <div className="review-status">
            <div className="review-status-icon" style={{ color: "var(--danger)" }} aria-hidden="true">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="m15 9-6 6M9 9l6 6" />
              </svg>
            </div>
            <div className="review-status-title" style={{ color: "var(--danger)" }}>
              审核驳回
            </div>
            <div className="review-status-desc">很抱歉，您的代理商申请未通过平台审核。</div>
            <div className="reject-reason-card">
              <div className="rr-label">驳回原因</div>
              <div className="rr-text">{rejectReason}</div>
            </div>
            <Button variant="primary" onClick={reapply} style={{ padding: "10px 32px" }}>
              重新申请
            </Button>
          </div>
        </div>
      )}

      {view === "approved" && <AgentCenter session={session} toast={toast} />}

      <Modal open={agreementOpen} onClose={() => setAgreementOpen(false)} title="代理商合作协议" maxWidth={580}>
        <div className="agreement-body">
          {AGREEMENT_SECTIONS.map((s, i) => (
            <div key={i}>
              <h4>{s.h}</h4>
              {s.body}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 8 }}>
          <Button
            variant="primary"
            onClick={() => {
              setAgree(true)
              setAgreementOpen(false)
              toast("已勾选同意《代理商合作协议》")
            }}
          >
            我已阅读并同意
          </Button>
        </div>
      </Modal>
    </AppShell>
  )
}

/* ============ 申请表单 ============ */
function ApplyForm(props: {
  applyUserType: ApplyUserType
  setApplyUserType: (v: ApplyUserType) => void
  realName: string
  setRealName: (v: string) => void
  contactPhone: string
  setContactPhone: (v: string) => void
  contactEmail: string
  setContactEmail: (v: string) => void
  agree: boolean
  setAgree: (v: boolean) => void
  licenseFile: string
  setLicenseFile: (v: string) => void
  idFront: string
  setIdFront: (v: string) => void
  idBack: string
  setIdBack: (v: string) => void
  licenseRef: React.RefObject<HTMLInputElement | null>
  idFrontRef: React.RefObject<HTMLInputElement | null>
  idBackRef: React.RefObject<HTMLInputElement | null>
  validImg: (name: string) => boolean
  toast: (m: string) => void
  onOpenAgreement: () => void
  onSubmit: () => void
}) {
  const p = props
  return (
    <div className="panel">
      <h3 style={{ marginBottom: 18 }}>申请表单</h3>
      <div className="apply-form">
        <div className="field">
          <label>
            用户类型 <span className="req-tag">必选</span>
          </label>
          <div className="seg">
            {(
              [
                { v: "enterprise", t: "企业用户" },
                { v: "personal", t: "个人用户" },
              ] as { v: ApplyUserType; t: string }[]
            ).map((o) => (
              <label
                key={o.v}
                className={p.applyUserType === o.v ? "checked" : ""}
                onClick={() => p.setApplyUserType(o.v)}
              >
                <input type="radio" name="applyUType" value={o.v} checked={p.applyUserType === o.v} readOnly />
                <span className="tick" aria-hidden="true">
                  ✓
                </span>
                <div className="t">{o.t}</div>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label>真实姓名</label>
          <input
            type="text"
            className="field-input"
            placeholder="请输入真实姓名"
            maxLength={20}
            value={p.realName}
            onChange={(e) => p.setRealName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>联系电话</label>
          <input
            type="text"
            className="field-input"
            placeholder="请输入手机号码"
            maxLength={11}
            value={p.contactPhone}
            onChange={(e) => p.setContactPhone(e.target.value)}
          />
        </div>
        <div className="field">
          <label>联系邮箱</label>
          <input
            type="text"
            className="field-input"
            placeholder="请输入邮箱地址"
            value={p.contactEmail}
            onChange={(e) => p.setContactEmail(e.target.value)}
          />
        </div>

        {p.applyUserType === "enterprise" && (
          <div className="field">
            <label>
              营业执照 <span className="field-hint">（企业用户必传）</span>
            </label>
            <div
              className={`license-upload ${p.licenseFile ? "has-file" : ""}`}
              onClick={() => p.licenseRef.current?.click()}
            >
              <div className="license-icon" aria-hidden="true">
                {p.licenseFile ? "✅" : "📄"}
              </div>
              <div className="license-text">
                {p.licenseFile ? (
                  <>
                    <b style={{ color: "var(--success)" }}>{p.licenseFile}</b>
                    <br />
                    <span style={{ color: "var(--text-2)" }}>点击重新选择</span>
                  </>
                ) : (
                  <>
                    点击上传营业执照图片
                    <br />
                    <b>支持 JPG / PNG 格式，大小不超过 5MB</b>
                  </>
                )}
              </div>
              <input
                ref={p.licenseRef}
                type="file"
                accept=".jpg,.jpeg,.png"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  if (!p.validImg(f.name)) return p.toast("仅支持 JPG / PNG 格式图片")
                  p.setLicenseFile(f.name)
                  p.toast("营业执照图片已上传（原型演示）")
                }}
              />
            </div>
          </div>
        )}

        {p.applyUserType === "personal" && (
          <>
            <div className="field">
              <label>
                身份证正面 <span className="field-hint">（个人用户必传）</span>
              </label>
              <div
                className={`license-upload ${p.idFront ? "has-file" : ""}`}
                onClick={() => p.idFrontRef.current?.click()}
              >
                <div className="license-icon" aria-hidden="true">
                  {p.idFront ? "✅" : "🪪"}
                </div>
                <div className="license-text">
                  {p.idFront ? (
                    <>
                      <b style={{ color: "var(--success)" }}>{p.idFront}</b>
                      <br />
                      <span style={{ color: "var(--text-2)" }}>点击重新选择</span>
                    </>
                  ) : (
                    <>
                      点击上传身份证人像面
                      <br />
                      <b>支持 JPG / PNG 格式，大小不超过 5MB</b>
                    </>
                  )}
                </div>
                <input
                  ref={p.idFrontRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (!p.validImg(f.name)) return p.toast("仅支持 JPG / PNG 格式图片")
                    p.setIdFront(f.name)
                    p.toast("身份证正面已上传（原型演示）")
                  }}
                />
              </div>
            </div>
            <div className="field">
              <label>
                身份证反面 <span className="field-hint">（个人用户必传）</span>
              </label>
              <div
                className={`license-upload ${p.idBack ? "has-file" : ""}`}
                onClick={() => p.idBackRef.current?.click()}
              >
                <div className="license-icon" aria-hidden="true">
                  {p.idBack ? "✅" : "🪪"}
                </div>
                <div className="license-text">
                  {p.idBack ? (
                    <>
                      <b style={{ color: "var(--success)" }}>{p.idBack}</b>
                      <br />
                      <span style={{ color: "var(--text-2)" }}>点击重新选择</span>
                    </>
                  ) : (
                    <>
                      点击上传身份证国徽面
                      <br />
                      <b>支持 JPG / PNG 格式，大小不超过 5MB</b>
                    </>
                  )}
                </div>
                <input
                  ref={p.idBackRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (!f) return
                    if (!p.validImg(f.name)) return p.toast("仅支持 JPG / PNG 格式图片")
                    p.setIdBack(f.name)
                    p.toast("身份证反面已上传（原型演示）")
                  }}
                />
              </div>
            </div>
          </>
        )}

        <div className="agree-row">
          <input
            type="checkbox"
            id="agreeCheck"
            checked={p.agree}
            onChange={(e) => p.setAgree(e.target.checked)}
          />
          <label className="agree-label" htmlFor="agreeCheck">
            我已阅读并同意{" "}
            <a onClick={p.onOpenAgreement}>《代理商合作协议》</a>
            ，承诺所填信息真实有效，愿意遵守平台代理商管理规范。
          </label>
        </div>

        <Button variant="primary" block size="lg" onClick={p.onSubmit} style={{ marginTop: 18 }}>
          提交申请
        </Button>
      </div>
    </div>
  )
}

/* ============ 代理商中心 ============ */
function AgentCenter({
  session,
  toast,
}: {
  session: ReturnType<typeof useSession>["session"]
  toast: (m: string) => void
}) {
  const st = useMemo(() => DB.agentStats(), [])

  const [teamOpen, setTeamOpen] = useState(false)
  const [promoOpen, setPromoOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [wdRecordOpen, setWdRecordOpen] = useState(false)
  const [voucherId, setVoucherId] = useState<string | null>(null)

  // Commission filters
  const [consId, setConsId] = useState("")
  const [consMember, setConsMember] = useState("")
  const [consFrom, setConsFrom] = useState("")
  const [consTo, setConsTo] = useState("")
  const [commPage, setCommPage] = useState(1)

  const filteredComm = useMemo(() => {
    const kwId = consId.trim().toLowerCase()
    const kwM = consMember.trim().toLowerCase()
    return (DB.COMMISSIONS || []).filter((c) => {
      if (kwId && (c.id || "").toLowerCase().indexOf(kwId) === -1) return false
      if (kwM && (c.member || "").toLowerCase().indexOf(kwM) === -1) return false
      if (consFrom && c.time < consFrom) return false
      if (consTo && c.time > consTo) return false
      return true
    })
  }, [consId, consMember, consFrom, consTo])

  const commPages = Math.max(1, Math.ceil(filteredComm.length / COMM_PAGE_SIZE))
  const commCur = Math.min(commPage, commPages)
  const commRows = filteredComm.slice((commCur - 1) * COMM_PAGE_SIZE, commCur * COMM_PAGE_SIZE)

  const teamCount = st.direct + st.indirect
  const tiles = [
    { n: teamCount + " 人", l: "我的团队", c: "blue", click: () => setTeamOpen(true) },
    { n: fmtMoney(st.totalRecharge), l: "累计消费金额", c: "" },
    { n: fmtMoney(st.directComm + st.indirectComm), l: "累计获得佣金", c: "" },
    { n: fmtMoney(st.withdrawable), l: "可提现佣金", c: "green" },
    { n: fmtMoney(st.withdrawn), l: "已提现佣金", c: "amber" },
  ]

  const opButtons = [
    { label: "我的团队", onClick: () => setTeamOpen(true), icon: "team" },
    { label: "推广链接", onClick: () => setPromoOpen(true), icon: "link" },
    { label: "佣金提现", onClick: () => setWithdrawOpen(true), icon: "money" },
    { label: "提现记录", onClick: () => setWdRecordOpen(true), icon: "record" },
  ]

  return (
    <>
      <div className="page-head">
        <h1>代理中心</h1>
        <p>
          用户申请升级为代理商，解锁推广链生成、下级（二级分销）管理、佣金明细查看与提现等分佣能力。申请时代理中心展示申请页。
        </p>
      </div>

      <div className="tiles" style={{ marginBottom: 18 }}>
        {tiles.map((t, i) => (
          <div
            key={i}
            className={`tile ${t.c} ${t.click ? "clickable" : ""}`}
            onClick={t.click}
            role={t.click ? "button" : undefined}
          >
            <div className="n">{t.n}</div>
            <div className="l">
              {t.l}
              {t.click && <span className="tile-go"> 查看 ›</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="op-btn-row" style={{ marginBottom: 18 }}>
        {opButtons.map((b) => (
          <Button key={b.label} variant="outline" block onClick={b.onClick}>
            <OpIcon name={b.icon} />
            {b.label}
          </Button>
        ))}
      </div>

      <div className="panel" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ padding: "18px 22px 0" }}>
          <h3 style={{ margin: 0, marginBottom: 4 }}>佣金明细</h3>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-2)",
              marginTop: 4,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            两级分销：<b style={{ color: "var(--primary)" }}>直推 3‰</b>、
            <b style={{ color: "var(--success)" }}>间推 2‰</b>；仅推广的<b>企业用户</b>产生佣金，个人用户推广<b>无佣金</b>。
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
            <span className="comm-pill direct">
              直推佣金 <b>{fmtMoney(st.directComm)}</b>（企业直推 <span>{st.directEnt}</span> 人）
            </span>
            <span className="comm-pill indirect">
              间推佣金 <b>{fmtMoney(st.indirectComm)}</b>（企业间推 <span>{st.indirectEnt}</span> 人）
            </span>
            <span className="comm-pill none">个人推广 0 佣金</span>
          </div>
        </div>
        <div className="flow-filter-bar" style={{ padding: "14px 22px 12px" }}>
          <div className="filter-field" style={{ flex: 1, minWidth: 140 }}>
            <label>单号</label>
            <input
              type="text"
              className="field-input"
              placeholder="输入单号搜索…"
              value={consId}
              onChange={(e) => {
                setConsId(e.target.value)
                setCommPage(1)
              }}
            />
          </div>
          <div className="filter-field" style={{ flex: 1, minWidth: 140 }}>
            <label>来源用户</label>
            <input
              type="text"
              className="field-input"
              placeholder="输入来源用户搜索…"
              value={consMember}
              onChange={(e) => {
                setConsMember(e.target.value)
                setCommPage(1)
              }}
            />
          </div>
          <div className="filter-field" style={{ minWidth: 150 }}>
            <label>产生时间</label>
            <div className="date-range">
              <input
                type="date"
                className="field-input"
                value={consFrom}
                onChange={(e) => {
                  setConsFrom(e.target.value)
                  setCommPage(1)
                }}
              />
              <span className="date-sep">~</span>
              <input
                type="date"
                className="field-input"
                value={consTo}
                onChange={(e) => {
                  setConsTo(e.target.value)
                  setCommPage(1)
                }}
              />
            </div>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl comm-table">
            <thead>
              <tr>
                <th>单号</th>
                <th>来源用户</th>
                <th>推荐类型</th>
                <th>佣金金额</th>
                <th>产生时间</th>
              </tr>
            </thead>
            <tbody>
              {commRows.map((c) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.member}</td>
                  <td>
                    <span className={`badge ${c.type === "直推" ? "success" : "info"}`}>{c.type}</span>
                  </td>
                  <td className="amount">{fmtMoney(c.amount)}</td>
                  <td>{c.time}</td>
                </tr>
              ))}
              {commRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    暂无佣金记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <Pager page={commCur} pages={commPages} total={filteredComm.length} onGo={setCommPage} />
        </div>
      </div>

      <TeamModal open={teamOpen} onClose={() => setTeamOpen(false)} />
      <PromoModal open={promoOpen} onClose={() => setPromoOpen(false)} account={session?.account} toast={toast} />
      <WithdrawModal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        session={session}
        withdrawable={st.withdrawable}
        toast={toast}
      />
      <WdRecordModal
        open={wdRecordOpen}
        onClose={() => setWdRecordOpen(false)}
        onVoucher={(id) => setVoucherId(id)}
      />
      <VoucherModal id={voucherId} onClose={() => setVoucherId(null)} />
    </>
  )
}

function OpIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  }
  if (name === "team")
    return (
      <svg {...common}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  if (name === "link")
    return (
      <svg {...common}>
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    )
  if (name === "money")
    return (
      <svg {...common}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  return (
    <svg {...common}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  )
}

function Pager({
  page,
  pages,
  total,
  onGo,
}: {
  page: number
  pages: number
  total: number
  onGo: (p: number) => void
}) {
  if (pages <= 1) return <span className="pg-info">共 {total} 条</span>
  return (
    <>
      <button className="pg-btn" disabled={page <= 1} onClick={() => onGo(page - 1)}>
        上一页
      </button>
      <span className="pg-info">
        第 {page} / {pages} 页（共 {total} 条）
      </span>
      <button className="pg-btn" disabled={page >= pages} onClick={() => onGo(page + 1)}>
        下一页
      </button>
    </>
  )
}

/* ============ 我的团队弹窗 ============ */
function TeamModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<"direct" | "indirect">("direct")
  const [page, setPage] = useState(1)
  const isDirect = tab === "direct"
  const list = isDirect ? DB.AGENT_DIRECT : DB.AGENT_INDIRECT
  const rate = isDirect ? DB.AGENT_COMMISSION.directRate : DB.AGENT_COMMISSION.indirectRate
  const pages = Math.max(1, Math.ceil(list.length / TEAM_PAGE_SIZE))
  const cur = Math.min(page, pages)
  const rows = list.slice((cur - 1) * TEAM_PAGE_SIZE, cur * TEAM_PAGE_SIZE)

  function switchTab(t: "direct" | "indirect") {
    setTab(t)
    setPage(1)
  }

  return (
    <Modal open={open} onClose={onClose} title="我的团队" maxWidth={720}>
      <div className="team-tabs">
        <button className={`team-tab ${isDirect ? "active" : ""}`} onClick={() => switchTab("direct")}>
          直推（{DB.AGENT_DIRECT.length}）
        </button>
        <button className={`team-tab ${!isDirect ? "active" : ""}`} onClick={() => switchTab("indirect")}>
          间推（{DB.AGENT_INDIRECT.length}）
        </button>
      </div>
      <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12 }}>
        {isDirect ? "由您直接推广注册的下级客户" : "由您的直推客户再次推广注册的下级客户"}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl" style={{ minWidth: 560 }}>
          <thead>
            <tr>
              <th>昵称</th>
              <th>手机号</th>
              <th>推荐类型</th>
              <th>上级用户</th>
              <th>获得佣金</th>
              <th>注册时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m, i) => (
              <tr key={i}>
                <td>{m.name}</td>
                <td className="mono">{m.phone}</td>
                <td>
                  <span className={`badge ${m.type === "企业" ? "info" : "gray"}`}>
                    {isDirect ? "直推" : "间推"}
                  </span>
                </td>
                <td>{isDirect ? "—" : (m as { via?: string }).via}</td>
                <td>
                  {m.type === "企业" ? (
                    <b style={{ color: "var(--success)" }}>
                      {fmtMoney(Math.round(m.recharge * rate * 100) / 100)}
                    </b>
                  ) : (
                    <span className="muted">无佣金</span>
                  )}
                </td>
                <td>{m.joinedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text-2)", padding: "24px 0" }}>暂无成员数据</div>
      )}
      <div className="pagination">
        <Pager page={cur} pages={pages} total={list.length} onGo={setPage} />
      </div>
    </Modal>
  )
}

/* ============ 推广链接弹窗 ============ */
function PromoModal({
  open,
  onClose,
  account,
  toast,
}: {
  open: boolean
  onClose: () => void
  account?: string
  toast: (m: string) => void
}) {
  const link = "https://ehaiba.com/reg?invite=" + (account || "agent") + "01"
  return (
    <Modal open={open} onClose={onClose} title="推广链接" maxWidth={480}>
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <FakeQr seed={"promo" + account} size={180} />
        </div>
        <p style={{ fontSize: 13, color: "var(--text-2)", margin: "12px 0 6px" }}>专属推广二维码</p>
        <p style={{ color: "var(--primary)", wordBreak: "break-all", fontWeight: 600 }}>{link}</p>
        <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>
          客户通过此链接/二维码注册将永久绑定为您名下的下级成员
        </p>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", paddingTop: 6 }}>
        <Button variant="outline" size="sm" onClick={() => toast("二维码已复制到剪贴板（原型演示）")}>
          复制二维码
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (navigator.clipboard) navigator.clipboard.writeText(link)
            toast("推广链接已复制")
          }}
        >
          复制链接
        </Button>
      </div>
    </Modal>
  )
}

/* ============ 佣金提现弹窗 ============ */
function WithdrawModal({
  open,
  onClose,
  session,
  withdrawable,
  toast,
}: {
  open: boolean
  onClose: () => void
  session: ReturnType<typeof useSession>["session"]
  withdrawable: number
  toast: (m: string) => void
}) {
  const [amt, setAmt] = useState("")
  const [bank, setBank] = useState(session?.wdAccount?.bank || "")
  const [name, setName] = useState(session?.wdAccount?.name || "")
  const [card, setCard] = useState(session?.wdAccount?.card || "")
  const [phone, setPhone] = useState(session?.phone || "")
  const [code, setCode] = useState("")
  const [sentCode, setSentCode] = useState("")
  const [countdown, setCountdown] = useState(0)

  function sendCode() {
    if (!/^1\d{10}$/.test(phone.trim())) return toast("请输入正确的绑定手机号")
    const c = String(Math.floor(100000 + Math.random() * 900000))
    setSentCode(c)
    toast("验证码已发送：" + c + "（演示）")
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((v) => {
        if (v <= 1) {
          clearInterval(timer)
          return 0
        }
        return v - 1
      })
    }, 1000)
  }

  function submit() {
    const n = Number(amt)
    if (!n || n <= 0) return toast("请输入提现金额")
    if (!/^1\d{10}$/.test(phone.trim())) return toast("请输入正确的绑定手机号")
    if (!sentCode) return toast("请先获取短信验证码")
    if (code.trim() !== sentCode) return toast("验证码不正确")
    if (n < 100) return toast("最低提现金额为 ¥100")
    if (n > withdrawable) return toast("超过可提现佣金")
    if (n > 50000) return toast("单笔最高提现 ¥50,000")
    if (!bank.trim() || !name.trim() || !card.trim()) return toast("请填写完整的银行卡信息")
    toast("提现申请已提交，财务将人工审核")
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="佣金提现" maxWidth={500}>
      <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14, lineHeight: 1.7 }}>
        佣金随时可申请结算，填写银行卡号后由平台财务人工审核批量转账。
      </div>
      <div className="wd-settle-note">
        <b>每月结算时间：</b>每月 <b>25 日</b> 为结算日，申请将在 <b>次月 5 日前</b> 完成审核并打款（遇节假日顺延）。
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 12,
          color: "var(--text-2)",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "12px 16px",
          lineHeight: 1.8,
          margin: "12px 0",
        }}
      >
        <span>
          可提现：<b style={{ color: "var(--success)" }}>{fmtMoney(withdrawable)}</b>
        </span>
        <span>
          最低提现：<b>{fmtMoney(100)}</b>
        </span>
        <span>
          手续费：<b>0%</b>
        </span>
        <span>
          单笔最高：<b>{fmtMoney(50000)}</b>
        </span>
        <span>
          日累计最高：<b>{fmtMoney(200000)}</b>
        </span>
      </div>
      <div className="apply-form">
        <div className="field">
          <label>提现金额（元）</label>
          <input
            type="number"
            className="field-input"
            placeholder="请输入提现金额"
            value={amt}
            onChange={(e) => setAmt(e.target.value)}
          />
        </div>
        <div className="field">
          <label>开户银行</label>
          <input
            type="text"
            className="field-input"
            placeholder="如：招商银行"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </div>
        <div className="field">
          <label>户名</label>
          <input
            type="text"
            className="field-input"
            placeholder="银行卡开户人姓名"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>银行卡号</label>
          <input
            type="text"
            className="field-input"
            placeholder="收款银行卡号"
            value={card}
            onChange={(e) => setCard(e.target.value)}
          />
        </div>
        <div className="field">
          <label>绑定手机号</label>
          <input
            type="text"
            className="field-input"
            placeholder="请输入绑定手机号"
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="field">
          <label>短信验证码</label>
          <div className="code-row">
            <input
              type="text"
              className="field-input"
              placeholder="请输入验证码"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Button variant="outline" size="sm" disabled={countdown > 0} onClick={sendCode}>
              {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
            </Button>
          </div>
        </div>
        <Button variant="primary" block size="lg" onClick={submit}>
          提交提现申请
        </Button>
      </div>
    </Modal>
  )
}

/* ============ 提现记录弹窗 ============ */
function WdRecordModal({
  open,
  onClose,
  onVoucher,
}: {
  open: boolean
  onClose: () => void
  onVoucher: (id: string) => void
}) {
  const [page, setPage] = useState(1)
  const list = DB.WITHDRAWS || []
  const pages = Math.max(1, Math.ceil(list.length / WD_PAGE_SIZE))
  const cur = Math.min(page, pages)
  const rows = list.slice((cur - 1) * WD_PAGE_SIZE, cur * WD_PAGE_SIZE)

  function badge(status: string): { cls: string; txt: string } {
    if (status === "已到账") return { cls: "success", txt: "打款成功" }
    if (status === "待打款") return { cls: "process", txt: "待打款" }
    if (status === "待审核") return { cls: "pending", txt: "待审核" }
    return { cls: "fail", txt: "审核驳回" }
  }

  return (
    <Modal open={open} onClose={onClose} title="提现记录" maxWidth={640}>
      <div style={{ overflowX: "auto" }}>
        <table className="tbl wd-table">
          <thead>
            <tr>
              <th>提现单号</th>
              <th>提现金额</th>
              <th>提现账户</th>
              <th>提现状态</th>
              <th>打款凭证</th>
              <th>提现时间</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => {
              const b = badge(w.status)
              return (
                <tr key={w.id}>
                  <td className="mono-sm">{w.id}</td>
                  <td className="amount">{fmtMoney(w.amount)}</td>
                  <td>{w.bank + " " + (w.accountName || "")}</td>
                  <td>
                    <span className={`badge ${b.cls}`}>{b.txt}</span>
                    {w.status === "驳回" && w.rejectReason && (
                      <div className="wd-reason">驳回原因：{w.rejectReason}</div>
                    )}
                  </td>
                  <td>
                    {w.status === "已到账" && w.voucher ? (
                      <button className="wd-voucher-btn" onClick={() => onVoucher(w.id)}>
                        查看凭证
                      </button>
                    ) : (
                      <span className="wd-dash">—</span>
                    )}
                  </td>
                  <td>{w.time}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {list.length === 0 && (
        <div style={{ textAlign: "center", color: "var(--text-2)", padding: "24px 0" }}>暂无提现记录</div>
      )}
      <div className="pagination">
        <Pager page={cur} pages={pages} total={list.length} onGo={setPage} />
      </div>
    </Modal>
  )
}

/* ============ 打款凭证弹窗 ============ */
function VoucherModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const w = id ? (DB.WITHDRAWS || []).find((x) => x.id === id) : null
  return (
    <Modal open={!!id} onClose={onClose} title="打款凭证" maxWidth={360}>
      {w && (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 8px" }}>
          <div className="voucher-card">
            <div className="voucher-head">
              <div className="voucher-check" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#07c160" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <span>转账凭证</span>
            </div>
            <div className="voucher-amount-label">转账金额</div>
            <div className="voucher-amount">{fmtMoney(w.amount)}</div>
            <div className="voucher-rows">
              <div className="v-row">
                <span>收款账户</span>
                <b>{w.bank + " " + (w.accountName || "")}</b>
              </div>
              <div className="v-row">
                <span>转账单号</span>
                <b>{w.id}</b>
              </div>
              <div className="v-row">
                <span>打款时间</span>
                <b>{w.time}</b>
              </div>
            </div>
            <div className="voucher-status">✓ 已到账</div>
            <div className="voucher-foot">本凭证由平台财务系统生成，仅供演示</div>
          </div>
        </div>
      )}
    </Modal>
  )
}
