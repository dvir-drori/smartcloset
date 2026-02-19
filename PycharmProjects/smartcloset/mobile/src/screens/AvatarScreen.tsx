import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import { BodyProfileCard } from '../components/BodyProfileCard';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getFullImageUrl } from '../utils/image';
import {
  BodyPhoto,
  uploadBodyPhoto,
  getBodyPhotos,
  deleteBodyPhoto,
} from '../services/bodyPhotos';
import {
  UserProfile,
  HairStyle,
  HairColor,
  BodyShape,
  getProfile,
  upsertProfile,
} from '../services/profile';
import { TryOnResult, getTryOnResults } from '../services/tryon';

type Angle = 'FRONT' | 'SIDE' | 'BACK';

const ANGLES: { key: Angle; label: string }[] = [
  { key: 'FRONT', label: 'Front' },
  { key: 'SIDE', label: 'Side' },
  { key: 'BACK', label: 'Back' },
];

const SKIN_TONES: { key: string; color: string }[] = [
  { key: 'fair', color: '#FDEBD0' },
  { key: 'light', color: '#F5CBA7' },
  { key: 'medium', color: '#E0AC69' },
  { key: 'olive', color: '#C68642' },
  { key: 'tan', color: '#A0522D' },
  { key: 'brown', color: '#8D5524' },
  { key: 'dark', color: '#5C3317' },
];

const HAIR_STYLES: { key: HairStyle; label: string }[] = [
  { key: 'SHORT', label: 'Short' },
  { key: 'MEDIUM', label: 'Medium' },
  { key: 'LONG', label: 'Long' },
  { key: 'CURLY', label: 'Curly' },
  { key: 'BRAIDS', label: 'Braids' },
  { key: 'BUN', label: 'Bun' },
  { key: 'PONYTAIL', label: 'Ponytail' },
  { key: 'BUZZ', label: 'Buzz' },
];

const HAIR_COLORS: { key: HairColor; color: string; label: string }[] = [
  { key: 'BLACK', color: '#1C1C1C', label: 'Black' },
  { key: 'BROWN', color: '#6B4226', label: 'Brown' },
  { key: 'BLONDE', color: '#D4A76A', label: 'Blonde' },
  { key: 'RED', color: '#B7472A', label: 'Red' },
  { key: 'AUBURN', color: '#922724', label: 'Auburn' },
  { key: 'GRAY', color: '#9E9E9E', label: 'Gray' },
  { key: 'WHITE', color: '#F0F0F0', label: 'White' },
];

const BODY_SHAPES: { key: BodyShape; label: string }[] = [
  { key: 'RECTANGLE', label: 'Rectangle' },
  { key: 'TRIANGLE', label: 'Triangle' },
  { key: 'INVERTED_TRIANGLE', label: 'Inverted Triangle' },
  { key: 'HOURGLASS', label: 'Hourglass' },
  { key: 'OVAL', label: 'Oval' },
];

export function AvatarScreen() {
  const [photos, setPhotos] = useState<Record<Angle, BodyPhoto | null>>({
    FRONT: null,
    SIDE: null,
    BACK: null,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState('');
  const [previewAngle, setPreviewAngle] = useState<Angle>('FRONT');
  const [previewSource, setPreviewSource] = useState<'camera' | 'library'>('camera');
  const [tryOnResults, setTryOnResults] = useState<TryOnResult[]>([]);

  const fetchProfile = useCallback(async () => {
    try {
      const data = await getProfile();
      setProfile(data.profile ?? null);
    } catch {
      // Profile not set up yet
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const fetchPhotos = useCallback(async () => {
    try {
      setError(null);
      const data = await getBodyPhotos();
      const mapped: Record<Angle, BodyPhoto | null> = { FRONT: null, SIDE: null, BACK: null };
      data.forEach((photo) => {
        mapped[photo.angle] = photo;
      });
      setPhotos(mapped);
    } catch {
      setError('Failed to load photos');
    }
  }, []);

  const fetchTryOnResults = useCallback(async () => {
    try {
      const data = await getTryOnResults();
      setTryOnResults(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchPhotos();
    fetchTryOnResults();
  }, [fetchProfile, fetchPhotos, fetchTryOnResults]);

  const saveAvatarField = async (updates: Partial<{ skinTone: string; hairStyle: HairStyle; hairColor: HairColor; bodyShape: BodyShape }>) => {
    if (!profile) return;
    try {
      const updated = await upsertProfile({
        heightCm: profile.heightCm,
        weightKg: profile.weightKg,
        chestCm: profile.chestCm,
        waistCm: profile.waistCm,
        hipsCm: profile.hipsCm,
        shouldersCm: profile.shouldersCm,
        skinTone: profile.skinTone,
        hairStyle: profile.hairStyle,
        hairColor: profile.hairColor,
        bodyShape: profile.bodyShape,
        preferredStyle: profile.preferredStyle,
        ...updates,
      });
      setProfile(updated);
    } catch {
      Alert.alert('Error', 'Failed to save');
    }
  };

  const pickImage = async (angle: Angle, source: 'camera' | 'library') => {
    const launchFn =
      source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    const result = await launchFn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setPreviewUri(result.assets[0].uri);
    setPreviewAngle(angle);
    setPreviewSource(source);
  };

  const approvePhoto = async () => {
    const uri = previewUri;
    const angle = previewAngle;
    setPreviewUri('');

    setLoading(true);
    setError(null);
    try {
      await uploadBodyPhoto(uri, angle);
      await fetchPhotos();
    } catch {
      setError('Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (angle: Angle) => {
    const photo = photos[angle];
    if (!photo) return;

    setLoading(true);
    setError(null);
    try {
      await deleteBodyPhoto(photo.id);
      await fetchPhotos();
    } catch {
      setError('Failed to delete photo');
    } finally {
      setLoading(false);
    }
  };

  const handleSlotPress = (angle: Angle) => {
    const existing = photos[angle];

    Alert.alert('Body Photo', `${angle.charAt(0) + angle.slice(1).toLowerCase()} view`, [
      { text: 'Take Photo', onPress: () => pickImage(angle, 'camera') },
      { text: 'Choose from Library', onPress: () => pickImage(angle, 'library') },
      ...(existing
        ? [{ text: 'Delete', style: 'destructive' as const, onPress: () => handleDelete(angle) }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  if (loadingProfile) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Section 1: Body Profile Card */}
      <BodyProfileCard profile={profile} frontPhotoUrl={photos.FRONT?.imageUrl} />

      {/* Section 2: Avatar Customization */}
      {profile ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avatar Customization</Text>

          {/* Skin Tone */}
          <Text style={styles.fieldLabel}>Skin Tone</Text>
          <View style={styles.swatchRow}>
            {SKIN_TONES.map((st) => (
              <TouchableOpacity
                key={st.key}
                style={[
                  styles.swatch,
                  { backgroundColor: st.color },
                  profile.skinTone === st.key && styles.swatchActive,
                ]}
                onPress={() => saveAvatarField({ skinTone: st.key })}
              />
            ))}
          </View>

          {/* Hair Style */}
          <Text style={styles.fieldLabel}>Hair Style</Text>
          <View style={styles.chipRow}>
            {HAIR_STYLES.map((hs) => (
              <TouchableOpacity
                key={hs.key}
                style={[styles.chip, profile.hairStyle === hs.key && styles.chipActive]}
                onPress={() => saveAvatarField({ hairStyle: hs.key })}
              >
                <Text style={[styles.chipText, profile.hairStyle === hs.key && styles.chipTextActive]}>
                  {hs.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Hair Color */}
          <Text style={styles.fieldLabel}>Hair Color</Text>
          <View style={styles.swatchRow}>
            {HAIR_COLORS.map((hc) => (
              <TouchableOpacity
                key={hc.key}
                style={[
                  styles.swatch,
                  { backgroundColor: hc.color },
                  profile.hairColor === hc.key && styles.swatchActive,
                ]}
                onPress={() => saveAvatarField({ hairColor: hc.key })}
              />
            ))}
          </View>

          {/* Body Shape */}
          <Text style={styles.fieldLabel}>Body Shape</Text>
          <View style={styles.chipRow}>
            {BODY_SHAPES.map((bs) => (
              <TouchableOpacity
                key={bs.key}
                style={[styles.chip, profile.bodyShape === bs.key && styles.chipActive]}
                onPress={() => saveAvatarField({ bodyShape: bs.key })}
              >
                <Text style={[styles.chipText, profile.bodyShape === bs.key && styles.chipTextActive]}>
                  {bs.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Avatar Customization</Text>
          <View style={styles.setupCta}>
            <Text style={styles.setupText}>
              Set up your measurements in the Profile tab to customize your avatar
            </Text>
          </View>
        </View>
      )}

      {/* Section 3: Recent Try-Ons */}
      {tryOnResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Try-Ons</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tryOnRow}>
              {tryOnResults.map((result) => (
                <View key={result.id} style={styles.tryOnThumb}>
                  <Image
                    source={{ uri: getFullImageUrl(result.resultImageUrl) }}
                    style={styles.tryOnImage}
                  />
                  {result.clothingItem && (
                    <Text style={styles.tryOnLabel} numberOfLines={1}>
                      {result.clothingItem.name}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Section 4: Body Photos */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Body Photos</Text>
        <Text style={styles.sectionSubtitle}>
          Add front, side, and back photos for reference
        </Text>

        <View style={styles.photoRow}>
          {ANGLES.map(({ key, label }) => {
            const photo = photos[key];
            return (
              <TouchableOpacity
                key={key}
                style={styles.photoSlot}
                onPress={() => handleSlotPress(key)}
                disabled={loading}
              >
                {photo ? (
                  <Image
                    source={{ uri: getFullImageUrl(photo.imageUrl) }}
                    style={styles.photoImage}
                  />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderIcon}>+</Text>
                  </View>
                )}
                <Text style={styles.slotLabel}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <PhotoPreviewModal
        visible={!!previewUri}
        imageUri={previewUri}
        aspectRatio={3 / 4}
        onApprove={approvePhoto}
        onRetake={() => {
          setPreviewUri('');
          pickImage(previewAngle, previewSource);
        }}
        onCancel={() => setPreviewUri('')}
      />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: Colors.accent,
    borderWidth: 3,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#fff',
  },
  setupCta: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  setupText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: Spacing.md,
  },
  photoSlot: {
    flex: 1,
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.surface,
  },
  placeholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 36,
    color: Colors.textSecondary,
  },
  slotLabel: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  tryOnRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  tryOnThumb: {
    alignItems: 'center',
    width: 100,
  },
  tryOnImage: {
    width: 100,
    height: 133,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.border,
  },
  tryOnLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
});
