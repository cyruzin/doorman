import { MainNav } from "@/components/nav/main-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MainNav />
      <main>{children}</main>
    </>
  );
}
