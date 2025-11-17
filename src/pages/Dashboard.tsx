import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useIdeaStore } from '@/stores/ideaStore';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export default function Dashboard() {
  const { getActiveIdea } = useIdeaStore();
  const navigate = useNavigate();
  const activeIdea = getActiveIdea();

  // Check if the active idea has VIABLE or FIRE verdict
  const isIdeaUnlocked = activeIdea && (activeIdea.verdict === 'VIABLE' || activeIdea.verdict === 'FIRE');

  useEffect(() => {
    if (!isIdeaUnlocked) {
      navigate('/');
    }
  }, [isIdeaUnlocked, navigate]);

  if (!isIdeaUnlocked) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
