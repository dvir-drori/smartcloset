import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getFullImageUrl } from '../utils/image';
import { Outfit, getOutfit, deleteOutfit, updateOutfit } from '../services/outfits';
import { createWearLog } from '../services/wearLogs';
import type { OutfitStackScreenProps } from '../navigation/types';

type Props = OutfitStackScreenProps<'OutfitDetail'>;

export function OutfitDetailScreen({ route, navigation }: Props) {
  const { outfitId } = route.params;
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOutfit = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOutfit(outfitId);
      setOutfit(data);
    } catch {
      Alert.alert('Error', 'Failed to load outfit');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [outfitId, navigation]);

  useEffect(() => {
    fetchOutfit();
  }, [fetchOutfit]);

  const handleWearToday = () => {
    Alert.alert('Wear Today', `Log "${outfit?.name}" as worn today?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log It',
        onPress: async () => {
          try {
            await createWearLog({ outfitId, date: new Date().toISOString() });
            Alert.alert('Logged', 'Wear log saved!');
          } catch {
            Alert.alert('Error', 'Failed to log wear');
          }
        },
      },
    ]);
  };

  const handleRate = () => {
    Alert.alert('Rate Outfit', `Rate "${outfit?.name}"`, [
      ...([1, 2, 3, 4, 5] as const).map((rating) => ({
        text: '\u2605'.repeat(rating) + '\u2606'.repeat(5 - rating),
        onPress: async () => {
          try {
            const updated = await updateOutfit(outfitId, { rating });
            setOutfit(updated);
          } catch {
            Alert.alert('Error', 'Failed to rate outfit');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const handleDelete = () => {
    Alert.alert('Delete Outfit', `Delete "${outfit?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteOutfit(outfitId);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete outfit');
          }
        },
      },
    ]);
  };

  if (loading || !outfit) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.outfitName}>{outfit.name}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{outfit.occasion}</Text>
          </View>
        </View>

        {/* Rating */}
        {outfit.rating && (
          <View style={styles.ratingRow}>
            <Text style={styles.ratingStars}>
              {'\u2605'.repeat(outfit.rating)}{'\u2606'.repeat(5 - outfit.rating)}
            </Text>
            <Text style={styles.ratingLabel}>{outfit.rating}/5</Text>
          </View>
        )}

        {/* Seasons */}
        {outfit.season.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagLabel}>Seasons</Text>
            <View style={styles.tagRow}>
              {outfit.season.map((s) => (
                <View key={s} style={styles.tag}>
                  <Text style={styles.tagText}>{s.charAt(0) + s.slice(1).toLowerCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Items */}
        <Text style={styles.sectionTitle}>Items ({outfit.items.length})</Text>
        {outfit.items.map((item) => (
          <View key={item.id} style={styles.itemCard}>
            <Image
              source={{ uri: getFullImageUrl(item.thumbnailUrl || item.imageUrl) }}
              style={styles.itemImage}
            />
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemMeta}>{item.subcategory} &middot; {item.color}</Text>
              {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
            </View>
          </View>
        ))}

        {/* Info */}
        <View style={styles.infoSection}>
          {outfit.isAISuggested && (
            <View style={styles.infoRow}>
              <Ionicons name="sparkles" size={16} color={Colors.accent} />
              <Text style={styles.infoText}>AI Suggested</Text>
            </View>
          )}
          <Text style={styles.dateText}>
            Created {new Date(outfit.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.wearBtn} onPress={handleWearToday}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
          <Text style={styles.wearBtnText}>Wear Today</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rateBtn} onPress={handleRate}>
          <Ionicons name="star-outline" size={20} color={Colors.warning} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteActionBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  content: { padding: Spacing.lg, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  outfitName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, flex: 1 },
  badge: { backgroundColor: Colors.accent, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: 12, marginLeft: Spacing.sm },
  badgeText: { fontSize: FontSize.xs, color: '#fff', fontWeight: FontWeight.semibold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg },
  ratingStars: { fontSize: FontSize.xl, color: Colors.warning },
  ratingLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  tagSection: { marginBottom: Spacing.lg },
  tagLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.md },
  itemCard: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: BorderRadius.card, padding: Spacing.sm, marginBottom: Spacing.sm, alignItems: 'center' },
  itemImage: { width: 60, height: 60, borderRadius: BorderRadius.card, backgroundColor: Colors.border },
  itemInfo: { flex: 1, marginLeft: Spacing.md },
  itemName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  itemMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  itemBrand: { fontSize: FontSize.xs, color: Colors.accent, marginTop: 2 },
  infoSection: { marginTop: Spacing.xl, alignItems: 'center' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  infoText: { fontSize: FontSize.sm, color: Colors.accent },
  dateText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  bottomBar: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  wearBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.success, paddingVertical: 12, borderRadius: BorderRadius.button },
  wearBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  rateBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 12, borderRadius: BorderRadius.button, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center' },
  deleteActionBtn: { paddingHorizontal: Spacing.lg, paddingVertical: 12, borderRadius: BorderRadius.button, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center' },
});
