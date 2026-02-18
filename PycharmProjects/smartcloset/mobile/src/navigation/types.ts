import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

// Stack params for each tab
export type ClosetStackParamList = {
  ClosetList: undefined;
  ClothingItemDetail: { itemId: string };
};

export type OutfitStackParamList = {
  OutfitList: undefined;
  OutfitDetail: { outfitId: string };
};

export type AvatarStackParamList = {
  AvatarMain: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  WearHistory: undefined;
};

// Root tab params now use navigators
export type RootTabParamList = {
  Closet: NavigatorScreenParams<ClosetStackParamList>;
  Outfits: NavigatorScreenParams<OutfitStackParamList>;
  Avatar: NavigatorScreenParams<AvatarStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootTabScreenProps<T extends keyof RootTabParamList> =
  BottomTabScreenProps<RootTabParamList, T>;

// Composite types for screens inside stacks inside tabs
export type ClosetStackScreenProps<T extends keyof ClosetStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ClosetStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

export type OutfitStackScreenProps<T extends keyof OutfitStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<OutfitStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;

export type ProfileStackScreenProps<T extends keyof ProfileStackParamList> =
  CompositeScreenProps<
    NativeStackScreenProps<ProfileStackParamList, T>,
    BottomTabScreenProps<RootTabParamList>
  >;
