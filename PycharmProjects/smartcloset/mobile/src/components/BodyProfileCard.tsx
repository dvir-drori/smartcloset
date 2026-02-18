import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { UserProfile } from '../services/profile';

interface Props {
  profile: UserProfile | null | undefined;
}

// Map skin tone names to approximate colors
const SKIN_TONE_COLORS: Record<string, string> = {
  fair: '#FDEBD0',
  light: '#F5CBA7',
  medium: '#E0AC69',
  olive: '#C68642',
  tan: '#A0522D',
  brown: '#8D5524',
  dark: '#5C3317',
};

function getSkinColor(skinTone?: string): string {
  if (!skinTone) return '#D4A574';
  return SKIN_TONE_COLORS[skinTone.toLowerCase()] || '#D4A574';
}

export function BodyProfileCard({ profile }: Props) {
  if (!profile) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Body Profile</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>&#x1F464;</Text>
          <Text style={styles.emptyText}>Set up your measurements</Text>
          <Text style={styles.emptySubtext}>
            Go to Profile to add your body measurements
          </Text>
        </View>
      </View>
    );
  }

  const skinColor = getSkinColor(profile.skinTone);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Body Profile</Text>
      <View style={styles.bodyContainer}>
        {/* Silhouette */}
        <View style={styles.silhouette}>
          {/* Head */}
          <View style={[styles.head, { backgroundColor: skinColor }]} />
          {/* Neck */}
          <View style={[styles.neck, { backgroundColor: skinColor }]} />
          {/* Shoulders */}
          <View
            style={[
              styles.shoulders,
              { backgroundColor: skinColor },
              profile.shouldersCm != null ? { width: Math.min(100, Math.max(60, profile.shouldersCm * 1.5)) } : undefined,
            ]}
          />
          {/* Torso */}
          <View
            style={[
              styles.torso,
              { backgroundColor: skinColor },
              profile.chestCm != null ? { width: Math.min(90, Math.max(50, profile.chestCm * 1.2)) } : undefined,
            ]}
          />
          {/* Waist */}
          <View
            style={[
              styles.waist,
              { backgroundColor: skinColor },
              profile.waistCm != null ? { width: Math.min(85, Math.max(40, profile.waistCm * 1.1)) } : undefined,
            ]}
          />
          {/* Hips */}
          <View
            style={[
              styles.hips,
              { backgroundColor: skinColor },
              profile.hipsCm != null ? { width: Math.min(95, Math.max(50, profile.hipsCm * 1.2)) } : undefined,
            ]}
          />
          {/* Legs */}
          <View style={styles.legRow}>
            <View style={[styles.leg, { backgroundColor: skinColor }]} />
            <View style={[styles.leg, { backgroundColor: skinColor }]} />
          </View>
        </View>

        {/* Measurement labels */}
        <View style={styles.labels}>
          <View style={styles.labelRow}>
            <Text style={styles.labelKey}>Height</Text>
            <Text style={styles.labelValue}>{profile.heightCm} cm</Text>
          </View>
          <View style={styles.labelRow}>
            <Text style={styles.labelKey}>Weight</Text>
            <Text style={styles.labelValue}>{profile.weightKg} kg</Text>
          </View>
          {profile.shouldersCm != null && (
            <View style={styles.labelRow}>
              <Text style={styles.labelKey}>Shoulders</Text>
              <Text style={styles.labelValue}>{profile.shouldersCm} cm</Text>
            </View>
          )}
          {profile.chestCm != null && (
            <View style={styles.labelRow}>
              <Text style={styles.labelKey}>Chest</Text>
              <Text style={styles.labelValue}>{profile.chestCm} cm</Text>
            </View>
          )}
          {profile.waistCm != null && (
            <View style={styles.labelRow}>
              <Text style={styles.labelKey}>Waist</Text>
              <Text style={styles.labelValue}>{profile.waistCm} cm</Text>
            </View>
          )}
          {profile.hipsCm != null && (
            <View style={styles.labelRow}>
              <Text style={styles.labelKey}>Hips</Text>
              <Text style={styles.labelValue}>{profile.hipsCm} cm</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  bodyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  silhouette: {
    alignItems: 'center',
    marginRight: Spacing.xl,
    width: 110,
  },
  head: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  neck: {
    width: 14,
    height: 8,
  },
  shoulders: {
    width: 80,
    height: 10,
    borderRadius: 5,
  },
  torso: {
    width: 70,
    height: 40,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  waist: {
    width: 55,
    height: 10,
  },
  hips: {
    width: 70,
    height: 14,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  legRow: {
    flexDirection: 'row',
    gap: 6,
  },
  leg: {
    width: 18,
    height: 55,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  labels: {
    flex: 1,
    gap: Spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  labelKey: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  labelValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
});
