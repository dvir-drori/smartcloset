import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getFullImageUrl } from '../utils/image';
import { Occasion, Season } from '../services/clothingItems';
import {
  Recommendation,
  getRecommendations,
  saveRecommendation,
} from '../services/recommendations';

const OCCASIONS: { key: Occasion; label: string }[] = [
  { key: 'CASUAL', label: 'Casual' },
  { key: 'WORK', label: 'Work' },
  { key: 'FORMAL', label: 'Formal' },
  { key: 'SPORT', label: 'Sport' },
  { key: 'GOING_OUT', label: 'Going Out' },
];

const SEASONS: { key: Season; label: string }[] = [
  { key: 'SPRING', label: 'Spring' },
  { key: 'SUMMER', label: 'Summer' },
  { key: 'FALL', label: 'Fall' },
  { key: 'WINTER', label: 'Winter' },
];

export function RecommendationsScreen() {
  const [selectedOccasion, setSelectedOccasion] = useState<Occasion | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  const handleGetSuggestions = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const result = await getRecommendations({
        occasion: selectedOccasion ?? undefined,
        season: selectedSeason ?? undefined,
      });
      setRecommendations(result.recommendations);
      setMessage(result.message ?? null);
      setFetched(true);
    } catch {
      Alert.alert('Error', 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (rec: Recommendation) => {
    if (!selectedOccasion) {
      Alert.alert('Select Occasion', 'Please select an occasion before saving.');
      return;
    }

    setSaving(rec.suggestedName);
    try {
      await saveRecommendation({
        name: rec.suggestedName,
        occasion: selectedOccasion,
        season: selectedSeason ? [selectedSeason] : undefined,
        itemIds: rec.items.map((i) => i.id),
      });
      Alert.alert('Saved', `"${rec.suggestedName}" saved to your outfits!`);
      // Remove from list
      setRecommendations((prev) => prev.filter((r) => r !== rec));
    } catch {
      Alert.alert('Error', 'Failed to save outfit');
    } finally {
      setSaving(null);
    }
  };

  const renderRecommendation = ({ item: rec }: { item: Recommendation }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{rec.suggestedName}</Text>
        <View style={styles.scoreBadge}>
          <Text style={styles.scoreText}>{rec.score} pts</Text>
        </View>
      </View>

      {/* Item thumbnails */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemThumbs}>
        {rec.items.map((item) => (
          <View key={item.id} style={styles.thumbContainer}>
            <Image
              source={{ uri: getFullImageUrl(item.thumbnailUrl || item.imageUrl) }}
              style={styles.thumbImage}
            />
            <Text style={styles.thumbLabel} numberOfLines={1}>{item.name}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Reasons */}
      <View style={styles.reasonsContainer}>
        {rec.reasons.map((reason, i) => (
          <View key={i} style={styles.reasonChip}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.reasonText}>{reason}</Text>
          </View>
        ))}
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[styles.saveBtn, saving === rec.suggestedName && { opacity: 0.5 }]}
        onPress={() => handleSave(rec)}
        disabled={saving === rec.suggestedName}
      >
        <Ionicons name="bookmark-outline" size={18} color="#fff" />
        <Text style={styles.saveBtnText}>
          {saving === rec.suggestedName ? 'Saving...' : 'Save as Outfit'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Occasion</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {OCCASIONS.map((occ) => (
              <TouchableOpacity
                key={occ.key}
                style={[styles.filterChip, selectedOccasion === occ.key && styles.filterChipActive]}
                onPress={() =>
                  setSelectedOccasion(selectedOccasion === occ.key ? null : occ.key)
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedOccasion === occ.key && styles.filterChipTextActive,
                  ]}
                >
                  {occ.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.filterLabel}>Season</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {SEASONS.map((s) => (
              <TouchableOpacity
                key={s.key}
                style={[styles.filterChip, selectedSeason === s.key && styles.filterChipActive]}
                onPress={() =>
                  setSelectedSeason(selectedSeason === s.key ? null : s.key)
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedSeason === s.key && styles.filterChipTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.suggestBtn, loading && { opacity: 0.5 }]}
          onPress={handleGetSuggestions}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={styles.suggestBtnText}>Get Suggestions</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Results */}
      {message ? (
        <View style={styles.messageContainer}>
          <Ionicons name="information-circle-outline" size={48} color={Colors.border} />
          <Text style={styles.messageText}>{message}</Text>
        </View>
      ) : !fetched ? (
        <View style={styles.messageContainer}>
          <Ionicons name="sparkles-outline" size={48} color={Colors.border} />
          <Text style={styles.messageText}>
            Select filters and tap "Get Suggestions" to see AI-powered outfit recommendations
          </Text>
        </View>
      ) : recommendations.length === 0 ? (
        <View style={styles.messageContainer}>
          <Ionicons name="shirt-outline" size={48} color={Colors.border} />
          <Text style={styles.messageText}>
            No new recommendations found. Try different filters or add more items to your closet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={recommendations}
          renderItem={renderRecommendation}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filtersContainer: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  filterScroll: {
    marginBottom: Spacing.xs,
  },
  filterRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  suggestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
    marginTop: Spacing.md,
  },
  suggestBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  messageText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
  },
  scoreBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: Spacing.sm,
  },
  scoreText: {
    fontSize: FontSize.xs,
    color: '#fff',
    fontWeight: FontWeight.medium,
  },
  itemThumbs: {
    marginBottom: Spacing.sm,
  },
  thumbContainer: {
    alignItems: 'center',
    marginRight: Spacing.sm,
    width: 72,
  },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.border,
  },
  thumbLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reasonText: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingVertical: 10,
    borderRadius: BorderRadius.button,
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
});
