import { profileMetadata } from "@/lib/og";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  return profileMetadata((await params).username);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
