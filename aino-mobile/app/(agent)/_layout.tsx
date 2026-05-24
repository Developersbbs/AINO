import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';

type IconProps = { color: string; size: number };

const DashboardIcon  = ({ color, size }: IconProps) => <Feather name="grid"        size={size} color={color} />;
const ShareIcon      = ({ color, size }: IconProps) => <Feather name="share-2"     size={size} color={color} />;
const LeadsIcon      = ({ color, size }: IconProps) => <Feather name="activity"    size={size} color={color} />;
const EarningsIcon   = ({ color, size }: IconProps) => <Feather name="dollar-sign" size={size} color={color} />;
const SearchIcon     = ({ color, size }: IconProps) => <Feather name="search"      size={size} color={color} />;
const ProfileIcon    = ({ color, size }: IconProps) => <Feather name="user"        size={size} color={color} />;

export default function AgentLayout() {
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
      <Tabs.Screen name="dashboard"   options={{ title: 'Dashboard', tabBarIcon: DashboardIcon }} />
      <Tabs.Screen name="share"       options={{ title: 'Share',     tabBarIcon: ShareIcon }} />
      <Tabs.Screen name="leads"       options={{ title: 'Leads',     tabBarIcon: LeadsIcon }} />
      <Tabs.Screen name="commissions" options={{ title: 'Earnings',  tabBarIcon: EarningsIcon }} />
      <Tabs.Screen name="search"      options={{ title: 'Search',    tabBarIcon: SearchIcon }} />
      <Tabs.Screen name="profile"     options={{ title: 'Profile',   tabBarIcon: ProfileIcon }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
