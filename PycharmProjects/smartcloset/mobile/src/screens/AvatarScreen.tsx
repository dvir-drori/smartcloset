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
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getFullImageUrl } from '../utils/image';
import {
  BodyPhoto,
  uploadBodyPhoto,
  getBodyPhotos,
  deleteBodyPhoto,
} from '../services/bodyPhotos';

type Angle = 'FRONT' | 'SIDE' | 'BACK';

const ANGLES: { key: Angle; label: string }[] = [
  { key: 'FRONT', label: 'Front' },
  { key: 'SIDE', label: 'Side' },
  { key: 'BACK', label: 'Back' },
];

export function AvatarScreen() {
  const [photos, setPhotos] = useState<Record<Angle, BodyPhoto | null>>({
    FRONT: null,
    SIDE: null,
    BACK: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const pickImage = async (angle: Angle, source: 'camera' | 'library') => {
    const launchFn =
      source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    const result = await launchFn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setLoading(true);
    setError(null);
    try {
      await uploadBodyPhoto(result.assets[0].uri, angle);
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
    const options: string[] = ['Take Photo', 'Choose from Library'];
    if (existing) options.push('Delete');
    options.push('Cancel');

    Alert.alert('Body Photo', `${angle.charAt(0) + angle.slice(1).toLowerCase()} view`, [
      { text: 'Take Photo', onPress: () => pickImage(angle, 'camera') },
      { text: 'Choose from Library', onPress: () => pickImage(angle, 'library') },
      ...(existing
        ? [{ text: 'Delete', style: 'destructive' as const, onPress: () => handleDelete(angle) }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} style={styles.container}>
      <Text style={styles.title}>Body Photos</Text>
      <Text style={styles.subtitle}>
        Add front, side, and back photos for your avatar
      </Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

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
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    marginBottom: Spacing.md,
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
    backgroundColor: Colors.surface,
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
