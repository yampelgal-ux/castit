import { BottomNav } from "@/components/BottomNav";
import { AriaFAB } from "@/components/AriaFAB";
import { TypecastGuard } from "@/components/TypecastGuard";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <TypecastGuard>
      <div className="pb-20 min-h-dvh">
        {children}
        <AriaFAB />
        <BottomNav />
      </div>
    </TypecastGuard>
  );
}
