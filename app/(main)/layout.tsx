import { BottomNav } from "@/components/BottomNav";
import { AriaFAB } from "@/components/AriaFAB";
import { TypecastGuard } from "@/components/TypecastGuard";
import { ProRouteGuard } from "@/components/ProRouteGuard";
import { InstallBanner } from "@/components/InstallBanner";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProRouteGuard>
      <TypecastGuard>
        <div className="pb-20 min-h-dvh">
          {children}
          <AriaFAB />
          <BottomNav />
          <InstallBanner />
        </div>
      </TypecastGuard>
    </ProRouteGuard>
  );
}
