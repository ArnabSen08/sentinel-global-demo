import SentinelDashboard from '@/components/sentinel-dashboard';
import Header from '@/components/header';

export default function Home() {
  return (
    <div className="flex h-screen w-screen flex-col bg-background font-body">
      <Header />
      <main className="relative flex-1">
        <SentinelDashboard />
      </main>
    </div>
  );
}
