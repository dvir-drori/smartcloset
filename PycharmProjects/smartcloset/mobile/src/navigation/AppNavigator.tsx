import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootTabParamList } from './types';
import { ClosetScreen } from '../screens/ClosetScreen';
import { OutfitsScreen } from '../screens/OutfitsScreen';
import { AvatarScreen } from '../screens/AvatarScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { Colors, FontSize } from '../constants/theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<keyof RootTabParamList, keyof typeof Ionicons.glyphMap> = {
  Closet: 'shirt-outline',
  Outfits: 'grid-outline',
  Avatar: 'body-outline',
  Profile: 'person-outline',
};

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={TAB_ICONS[route.name]} size={size} color={color} />
        ),
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarLabelStyle: { fontSize: FontSize.xs },
        headerStyle: { backgroundColor: Colors.background },
        headerTitleStyle: { color: Colors.textPrimary, fontWeight: '600' },
      })}
    >
      <Tab.Screen name="Closet" component={ClosetScreen} />
      <Tab.Screen name="Outfits" component={OutfitsScreen} />
      <Tab.Screen name="Avatar" component={AvatarScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
