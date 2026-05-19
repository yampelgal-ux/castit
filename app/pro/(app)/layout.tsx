import { BottomNav } from "@/components/BottomNav";

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-20 min-h-dvh">
      {children}
      <BottomNav />
    </div>
  );
}
