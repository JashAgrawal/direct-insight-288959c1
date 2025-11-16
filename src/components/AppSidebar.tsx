import { NavLink } from '@/components/NavLink';
import { AGENTS } from '@/lib/agents';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Grid3x3, Users, Lightbulb, BarChart3, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function AppSidebar() {
  const { state } = useSidebar();
  const { reset } = useAuthStore();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

  const mainRoutes = [
    { title: 'HiveMind Chat', url: '/dashboard', icon: Grid3x3 },
    { title: 'Boardroom', url: '/dashboard/boardroom', icon: Users },
    { title: 'Idea Stats', url: '/dashboard/stats', icon: BarChart3 },
    { title: 'Validator', url: '/dashboard/validator', icon: Lightbulb },
  ];

  const agentRoutes = Object.values(AGENTS).map((agent) => ({
    title: agent.name,
    url: `/dashboard/agent/${agent.id}`,
    emoji: agent.emoji,
  }));

  const handleLogout = () => {
    reset();
    navigate('/');
  };

  return (
    <Sidebar className={collapsed ? 'w-14' : 'w-64'} collapsible="icon">
      <SidebarContent>
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className={`font-mono font-bold text-primary ${collapsed ? 'text-xs' : 'text-lg'}`}>
            {collapsed ? 'NS' : 'NO SHIT'}
          </h2>
          {!collapsed && (
            <p className="text-xs font-mono text-muted-foreground">HiveMind Active</p>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? 'text-xs' : ''}>
            {collapsed ? 'Main' : 'MAIN MENU'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainRoutes.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end={item.url === '/dashboard'}
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span className="ml-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Agent Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? 'text-xs' : ''}>
            {collapsed ? 'AI' : 'AI AGENTS'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {agentRoutes.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className="hover:bg-muted/50" 
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <span className="text-lg">{item.emoji}</span>
                      {!collapsed && <span className="ml-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout */}
        <div className="mt-auto p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Exit Oracle</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
