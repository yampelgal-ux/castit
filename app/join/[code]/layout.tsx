import { inviteMetadata } from "@/lib/og";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }) {
  return inviteMetadata((await params).code);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
