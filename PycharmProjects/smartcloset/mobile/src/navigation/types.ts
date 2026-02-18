import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type RootTabParamList = {
  Closet: undefined;
  Outfits: undefined;
  Avatar: undefined;
  Profile: undefined;
};

export type RootTabScreenProps<T extends keyof RootTabParamList> =
  BottomTabScreenProps<RootTabParamList, T>;
