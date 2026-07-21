import { ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-panel border border-line rounded-[10px] p-5 mb-5 ${className}`}>
      {children}
    </div>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="font-mono text-[13px] tracking-[2px] uppercase text-gold mb-3">{children}</h2>
  );
}

export function Sub({ children }: { children: ReactNode }) {
  return <div className="text-text-dim text-[13.5px] leading-relaxed mb-4 -mt-1">{children}</div>;
}

export function PrimaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`font-semibold text-sm rounded-lg px-5 py-3 bg-gold text-[#1a1200] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition ${className}`}
    />
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`font-semibold text-sm rounded-lg px-5 py-3 bg-transparent border border-line-strong text-text hover:border-gold hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition ${className}`}
    />
  );
}

export function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`font-semibold text-sm rounded-lg px-5 py-3 bg-transparent border border-red text-red disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition ${className}`}
    />
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`flex-1 bg-bg-deep border border-line-strong text-text placeholder:text-[#5f7a6a] rounded-lg px-3.5 py-3 text-[15px] focus:outline-none focus:border-gold ${className}`}
    />
  );
}

export function Badge({
  children,
  tone = "pending",
}: {
  children: ReactNode;
  tone?: "alive" | "out" | "pending" | "win";
}) {
  const tones: Record<string, string> = {
    alive: "text-green-alive border-green-alive bg-green-alive/10",
    out: "text-red border-red bg-red/10",
    pending: "text-gold border-gold bg-gold/10",
    win: "text-[#1a1200] border-gold bg-gold",
  };
  return (
    <span
      className={`font-mono text-[11px] tracking-[1.5px] uppercase px-2.5 py-1 rounded-full border ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="text-text-dim text-[13.5px] text-center py-2.5">{children}</div>;
}
