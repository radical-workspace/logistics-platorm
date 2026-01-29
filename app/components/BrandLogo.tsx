import Image from "next/image";

export function BrandLogo() {
  return (
    <div className="flex items-center gap-3">
      <Image
        src="/brand/afghco-logo.png"
        alt="AFGHCO Shipping & Logistics"
        width={56}
        height={56}
        priority
      />
      <div className="leading-tight">
        <div className="font-black text-slate-100">AFGHCO</div>
        <div className="text-xs text-slate-400">Shipping & Logistics</div>
      </div>
    </div>
  );
}
