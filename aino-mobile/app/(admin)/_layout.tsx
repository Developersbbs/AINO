import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

type IconProps = { color: string; size: number };

const DashboardIcon  = ({ color, size }: IconProps) => <Feather name="grid"      size={size} color={color} />;
const TeamIcon       = ({ color, size }: IconProps) => <Feather name="users"     size={size} color={color} />;
const ProjectsIcon   = ({ color, size }: IconProps) => <Feather name="home"      size={size} color={color} />;
const SearchIcon     = ({ color, size }: IconProps) => <Feather name="search"    size={size} color={color} />;
const ProfileIcon    = ({ color, size }: IconProps) => <Feather name="user"      size={size} color={color} />;

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1A2744',
        tabBarInactiveTintColor: '#8a95a5',
        tabBarStyle: { borderTopColor: '#f0f0f0' },
        tabBarLabelStyle: { fontSize: 10 },
      }}
    >
      <Tabs.Screen name="dashboard"  options={{ title: 'Dashboard',  tabBarIcon: DashboardIcon }} />
      <Tabs.Screen name="agents"     options={{ title: 'Team',       tabBarIcon: TeamIcon }} />
      <Tabs.Screen name="owners"     options={{ href: null }} />
      <Tabs.Screen name="projects"   options={{ title: 'Projects',   tabBarIcon: ProjectsIcon }} />
      <Tabs.Screen name="commission" options={{ href: null }} />
      <Tabs.Screen name="auditlog"   options={{ href: null }} />
      <Tabs.Screen name="search"     options={{ title: 'Search',     tabBarIcon: SearchIcon }} />
      <Tabs.Screen name="profile"    options={{ title: 'Profile',    tabBarIcon: ProfileIcon }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
