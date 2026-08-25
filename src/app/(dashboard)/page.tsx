import { auth } from "@/lib/auth";
import { HomePage } from "@/modules/home/components/home-page";

export default async function DashboardHomePage() {
  const session = await auth();

  return <HomePage userName={session?.user?.name} />;
}
