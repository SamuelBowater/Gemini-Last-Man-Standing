import { ReactNode } from "react";

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-panel border border-line rounded-2xl shadow-sm p-5 mb-5 ${className}`}>
      {children}
    </div>
  );
}

export function PanelTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[13px] font-semibold tracking-wide uppercase text-accent mb-3">{children}</h2>
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
      className={`font-semibold text-sm rounded-xl px-5 py-3 bg-accent text-white shadow-sm hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition ${className}`}
    />
  );
}

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`font-semibold text-sm rounded-xl px-5 py-3 bg-transparent border border-line-strong text-text hover:border-accent hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition ${className}`}
    />
  );
}

export function DangerButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`font-semibold text-sm rounded-xl px-5 py-3 bg-transparent border border-red text-red hover:bg-red/5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition ${className}`}
    />
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`flex-1 bg-bg-deep border border-line-strong text-text placeholder:text-[#9fb3ab] rounded-xl px-3.5 py-3 text-[15px] focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft ${className}`}
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
    alive: "text-green-alive border-green-alive/30 bg-green-alive/10",
    out: "text-red border-red/30 bg-red/10",
    pending: "text-accent border-accent/30 bg-accent/10",
    win: "text-white border-accent bg-accent",
  };
  return (
    <span
      className={`text-[11px] font-semibold tracking-wide uppercase px-2.5 py-1 rounded-full border ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div className="text-text-dim text-[13.5px] text-center py-2.5">{children}</div>;
}

export function Modal({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-line rounded-2xl shadow-lg max-w-[520px] w-full max-h-[85vh] overflow-y-auto p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-text-dim hover:text-text text-xl leading-none"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export function LoadingScreen({ label = "One sec…" }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-accent-soft" />
        <div className="absolute inset-0 rounded-full border-4 border-accent border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">⚽</div>
      </div>
      <div className="font-display text-lg text-text">Gemini&apos;s Last Man Standing</div>
      <div className="text-text-dim text-[13px]">{label}</div>
    </div>
  );
}
