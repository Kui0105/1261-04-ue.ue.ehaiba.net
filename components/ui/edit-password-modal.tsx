"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "./modal";
import { Button } from "./button";
import { useToast } from "./toast";
import { useSession } from "@/lib/session";
import { isValidPhone } from "@/lib/format";

export function EditPasswordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const router = useRouter();
  const { session, logout } = useSession();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [sec, setSec] = useState(0);
  const sentCode = useRef("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open) {
      setPhone(session?.phone || "");
      setCode("");
      setNewPwd("");
      setConfirmPwd("");
      setSec(0);
      sentCode.current = "";
      if (timer.current) clearInterval(timer.current);
    }
  }, [open, session]);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  function sendCode() {
    if (!isValidPhone(phone)) {
      toast("请输入正确的手机号");
      return;
    }
    if (sec > 0) return;
    sentCode.current = "111111";
    toast("验证码已发送（演示验证码：111111）");
    setSec(60);
    timer.current = setInterval(() => {
      setSec((s) => {
        if (s <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function submit() {
    if (!isValidPhone(phone)) return toast("请输入正确的手机号");
    if (!code) return toast("请输入短信验证码");
    if (!sentCode.current) return toast("请先获取验证码");
    if (code !== sentCode.current) return toast("验证码错误");
    if (!newPwd || newPwd.length < 6 || newPwd.length > 20) return toast("新密码长度需为 6-20 位");
    if (newPwd !== confirmPwd) return toast("两次输入的密码不一致");
    onClose();
    toast("密码修改成功，正在退出登录…");
    setTimeout(() => {
      logout();
      router.push("/login");
    }, 1200);
  }

  return (
    <Modal open={open} onClose={onClose} title="修改密码" maxWidth={440}>
      <div className="flex flex-col gap-4">
        <Field label="手机号">
          <input
            className="field-input"
            value={phone}
            maxLength={11}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="请输入绑定手机号"
          />
        </Field>
        <Field label="短信验证码">
          <div className="flex gap-2.5">
            <input
              className="field-input"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入验证码"
            />
            <Button variant="outline" size="md" onClick={sendCode} disabled={sec > 0} className="shrink-0">
              {sec > 0 ? `${sec}s` : "获取验证码"}
            </Button>
          </div>
        </Field>
        <Field label="新密码">
          <input
            type="password"
            className="field-input"
            value={newPwd}
            maxLength={20}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder="请输入新密码（6-20位）"
          />
        </Field>
        <Field label="确认新密码">
          <input
            type="password"
            className="field-input"
            value={confirmPwd}
            maxLength={20}
            onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="请再次输入新密码"
          />
        </Field>
        <div className="mt-1 flex gap-2.5">
          <Button variant="outline" block onClick={onClose}>取消</Button>
          <Button block onClick={submit}>确认修改</Button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
