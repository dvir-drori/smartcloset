import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getFullImageUrl } from '../utils/image';
import { Outfit, getOutfits, createOutfit, deleteOutfit, updateOutfit } from '../services/outfits';
import { ClothingItem, Occasion, Season, getClothingItems } from '../services/clothingItems';
import { createWearLog } from '../services/wearLogs';

const OCCASIONS: { key: Occasion; label: string }[] = [
  { key: 'CASUAL', label: 'Casual' },
  { key: 'WORK', label: 'Work' },
  { key: 'FORMAL', label: 'Formal' },
  { key: 'SPORT', label: 'Sport' },
  { key: 'GOING_OUT', label: 'Going Out' },
];

const SEASONS: Season[] = ['SPRING', 'SUMMER', 'FALL', 'WINTER'];

export function OutfitsScreen() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [closetItems, setClosetItems] = useState<ClothingItem[]>([]);
  const [filterOccasion, setFilterOccasion] = useState<Occasion | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formOccasion, setFormOccasion] = useState<Occasion>('CASUAL');
  const [formSeasons, setFormSeasons] = useState<Season[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const fetchOutfits = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getOutfits(filterOccasion ? { occasion: filterOccasion } : undefined);
      setOutfits(data);
    } catch {
      Alert.alert('Error', 'Failed to load outfits');
    } finally {
      setLoading(false);
    }
  }, [filterOccasion]);

  useEffect(() => {
    fetchOutfits();
  }, [fetchOutfits]);

  const openAddModal = async () => {
    try {
      const items = await getClothingItems();
      setClosetItems(items);
      setModalVisible(true);
    } catch {
      Alert.alert('Error', 'Failed to load closet items');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormOccasion('CASUAL');
    setFormSeasons([]);
    setSelectedItemIds([]);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (selectedItemIds.length === 0) {
      Alert.alert('Error', 'Select at least one clothing item');
      return;
    }

    setSaving(true);
    try {
      await createOutfit({
        name: formName.trim(),
        occasion: formOccasion,
        season: formSeasons.length > 0 ? formSeasons : undefined,
        itemIds: selectedItemIds,
      });
      setModalVisible(false);
      resetForm();
      fetchOutfits();
    } catch {
      Alert.alert('Error', 'Failed to create outfit');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (outfit: Outfit) => {
    Alert.alert('Delete Outfit', `Delete "${outfit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteOutfit(outfit.id);
            fetchOutfits();
          } catch {
            Alert.alert('Error', 'Failed to delete outfit');
          }
        },
      },
    ]);
  };

  const handleWearToday = (outfit: Outfit) => {
    Alert.alert('Wear Today', `Log "${outfit.name}" as worn today?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log It',
        onPress: async () => {
          try {
            await createWearLog({
              outfitId: outfit.id,
              date: new Date().toISOString(),
            });
            Alert.alert('Logged', 'Wear log saved!');
          } catch {
            Alert.alert('Error', 'Failed to log wear');
          }
        },
      },
    ]);
  };

  const handleRate = (outfit: Outfit) => {
    Alert.alert('Rate Outfit', `Rate "${outfit.name}"`, [
      ...([1, 2, 3, 4, 5] as const).map((rating) => ({
        text: '★'.repeat(rating) + '☆'.repeat(5 - rating),
        onPress: async () => {
          try {
            await updateOutfit(outfit.id, { rating });
            fetchOutfits();
          } catch {
            Alert.alert('Error', 'Failed to rate outfit');
          }
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleSeason = (s: Season) => {
    setFormSeasons((prev) =>
      prev.includes(s) ? prev.filter((i) => i !== s) : [...prev, s],
    );
  };

  const renderOutfit = ({ item: outfit }: { item: Outfit }) => (
    <TouchableOpacity
      style={styles.outfitCard}
      onLongPress={() => handleDelete(outfit)}
    >
      <View style={styles.outfitHeader}>
        <Text style={styles.outfitName} numberOfLines={1}>{outfit.name}</Text>
        <View style={styles.outfitBadge}>
          <Text style={styles.outfitBadgeText}>{outfit.occasion}</Text>
        </View>
      </View>

      {/* Item thumbnails */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemThumbs}>
        {outfit.items.map((item) => (
          <Image
            key={item.id}
            source={{ uri: getFullImageUrl(item.thumbnailUrl || item.imageUrl) }}
            style={styles.thumbImage}
          />
        ))}
      </ScrollView>

      <View style={styles.outfitFooter}>
        <Text style={styles.itemCount}>{outfit.items.length} items</Text>
        {outfit.rating && (
          <Text style={styles.ratingText}>{'★'.repeat(outfit.rating)}{'☆'.repeat(5 - outfit.rating)}</Text>
        )}
      </View>

      <View style={styles.outfitActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleWearToday(outfit)}>
          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.success} />
          <Text style={styles.actionText}>Wear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleRate(outfit)}>
          <Ionicons name="star-outline" size={20} color={Colors.warning} />
          <Text style={styles.actionText}>Rate</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Occasion Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, !filterOccasion && styles.filterChipActive]}
          onPress={() => setFilterOccasion(null)}
        >
          <Text style={[styles.filterText, !filterOccasion && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {OCCASIONS.map((occ) => (
          <TouchableOpacity
            key={occ.key}
            style={[styles.filterChip, filterOccasion === occ.key && styles.filterChipActive]}
            onPress={() => setFilterOccasion(occ.key)}
          >
            <Text style={[styles.filterText, filterOccasion === occ.key && styles.filterTextActive]}>
              {occ.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
      ) : outfits.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="grid-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyText}>No outfits yet</Text>
          <Text style={styles.emptySubtext}>Combine your closet items into outfits</Text>
        </View>
      ) : (
        <FlatList
          data={outfits}
          renderItem={renderOutfit}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Create Outfit Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Outfit</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
              <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput
            style={styles.textInput}
            value={formName}
            onChangeText={setFormName}
            placeholder="e.g. Casual Friday"
            placeholderTextColor={Colors.textSecondary}
          />

          {/* Occasion */}
          <Text style={styles.fieldLabel}>Occasion *</Text>
          <View style={styles.chipRow}>
            {OCCASIONS.map((occ) => (
              <TouchableOpacity
                key={occ.key}
                style={[styles.chip, formOccasion === occ.key && styles.chipActive]}
                onPress={() => setFormOccasion(occ.key)}
              >
                <Text style={[styles.chipText, formOccasion === occ.key && styles.chipTextActive]}>
                  {occ.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Seasons */}
          <Text style={styles.fieldLabel}>Seasons</Text>
          <View style={styles.chipRow}>
            {SEASONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, formSeasons.includes(s) && styles.chipActive]}
                onPress={() => toggleSeason(s)}
              >
                <Text style={[styles.chipText, formSeasons.includes(s) && styles.chipTextActive]}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Select Items */}
          <Text style={styles.fieldLabel}>
            Select Items * ({selectedItemIds.length} selected)
          </Text>
          <View style={styles.itemGrid}>
            {closetItems.map((item) => {
              const selected = selectedItemIds.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.selectableItem, selected && styles.selectableItemActive]}
                  onPress={() => toggleItemSelection(item.id)}
                >
                  <Image
                    source={{ uri: getFullImageUrl(item.thumbnailUrl || item.imageUrl) }}
                    style={styles.selectableImage}
                  />
                  {selected && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
                    </View>
                  )}
                  <Text style={styles.selectableLabel} numberOfLines={1}>{item.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterBar: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
  },
  filterText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  filterTextActive: {
    color: '#fff',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 80,
  },
  emptyText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
  },
  emptySubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  outfitCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  outfitName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    flex: 1,
  },
  outfitBadge: {
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: Spacing.sm,
  },
  outfitBadgeText: {
    fontSize: FontSize.xs,
    color: '#fff',
    fontWeight: FontWeight.medium,
  },
  itemThumbs: {
    marginBottom: Spacing.sm,
  },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.card,
    marginRight: Spacing.sm,
    backgroundColor: Colors.border,
  },
  outfitFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemCount: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  ratingText: {
    fontSize: FontSize.sm,
    color: Colors.warning,
  },
  outfitActions: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalContent: {
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  cancelText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  saveText: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: Colors.surface,
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
  itemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  selectableItem: {
    width: '30%',
    alignItems: 'center',
    padding: 4,
    borderRadius: BorderRadius.card,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectableItemActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  selectableImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.border,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  selectableLabel: {
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    marginTop: 4,
    textAlign: 'center',
  },
});
