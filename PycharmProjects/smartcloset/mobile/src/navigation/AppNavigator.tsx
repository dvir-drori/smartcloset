import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import {
  RootTabParamList,
  ClosetStackParamList,
  OutfitStackParamList,
  AvatarStackParamList,
  ProfileStackParamList,
} from './types';
import { ClosetScreen } from '../screens/ClosetScreen';
import { ClothingItemDetailScreen } from '../screens/ClothingItemDetailScreen';
import { OutfitsScreen } from '../screens/OutfitsScreen';
import { OutfitDetailScreen } from '../screens/OutfitDetailScreen';
import { AvatarScreen } from '../screens/AvatarScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { WearHistoryScreen } from '../screens/WearHistoryScreen';
import { RecommendationsScreen } from '../screens/RecommendationsScreen';
import { Colors, FontSize } from '../constants/theme';

const Tab = createBottomTabNavigator<RootTabParamList>();

const ClosetStack = createNativeStackNavigator<ClosetStackParamList>();
const OutfitStack = createNativeStackNavigator<OutfitStackParamList>();
const AvatarStack = createNativeStackNavigator<AvatarStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ClosetNavigator() {
  return (
    <ClosetStack.Navigator>
      <ClosetStack.Screen name="ClosetList" component={ClosetScreen} options={{ title: 'My Closet' }} />
      <ClosetStack.Screen name="ClothingItemDetail" component={ClothingItemDetailScreen} options={{ title: 'Item Details' }} />
    </ClosetStack.Navigator>
  );
}

function OutfitNavigator() {
  return (
    <OutfitStack.Navigator>
      <OutfitStack.Screen name="OutfitList" component={OutfitsScreen} options={{ title: 'Outfits' }} />
      <OutfitStack.Screen name="OutfitDetail" component={OutfitDetailScreen} options={{ title: 'Outfit Details' }} />
      <OutfitStack.Screen name="Recommendations" component={RecommendationsScreen} options={{ title: 'Recommendations' }} />
    </OutfitStack.Navigator>
  );
}

function AvatarNavigator() {
  return (
    <AvatarStack.Navigator>
      <AvatarStack.Screen name="AvatarMain" component={AvatarScreen} options={{ title: 'Avatar' }} />
    </AvatarStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Profile' }} />
      <ProfileStack.Screen name="WearHistory" component={WearHistoryScreen} options={{ title: 'Wear History' }} />
    </ProfileStack.Navigator>
  );
}

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
        headerShown: false,
      })}
    >
      <Tab.Screen name="Closet" component={ClosetNavigator} />
      <Tab.Screen name="Outfits" component={OutfitNavigator} />
      <Tab.Screen name="Avatar" component={AvatarNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
