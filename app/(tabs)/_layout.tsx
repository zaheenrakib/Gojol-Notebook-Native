import { Link, Tabs } from 'expo-router';
import { Platform, Pressable } from 'react-native';
import { Music, Heart, Info } from 'lucide-react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useClientOnlyValue } from '@/components/useClientOnlyValue';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.border,
          elevation: 8,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.cardBackground,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
          color: colors.text,
        },
        headerShadowVisible: false,
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Gojol Notebook',
          tabBarLabel: 'Gojols',
          tabBarIcon: ({ color, size }) => (
            <Music color={color} size={22} />
          ),
          headerRight: () => (
            <Link href="/modal" asChild>
              <Pressable style={{ marginRight: 15, padding: 4 }}>
                {({ pressed }) => (
                  <Info
                    size={22}
                    color={colors.textSecondary}
                    style={{ opacity: pressed ? 0.5 : 1 }}
                  />
                )}
              </Pressable>
            </Link>
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favorites',
          tabBarLabel: 'Favorites',
          tabBarIcon: ({ color, size }) => (
            <Heart color={color} size={22} />
          ),
        }}
      />
    </Tabs>
  );
}

