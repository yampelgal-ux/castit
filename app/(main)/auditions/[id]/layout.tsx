import { inviteMetadata } from "@/lib/og";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return inviteMetadata((await params).id);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
