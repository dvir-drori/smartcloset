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
  RefreshControl,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getFullImageUrl } from '../utils/image';
import { PhotoPreviewModal } from '../components/PhotoPreviewModal';
import type { ClosetStackParamList } from '../navigation/types';
import {
  ClothingItem,
  ClothingCategory,
  Pattern,
  Season,
  Occasion,
  getClothingItems,
  createClothingItem,
  deleteClothingItem,
  toggleFavorite,
} from '../services/clothingItems';

const CATEGORIES: { key: ClothingCategory; label: string; icon: string }[] = [
  { key: 'TOP', label: 'Tops', icon: 'shirt-outline' },
  { key: 'BOTTOM', label: 'Bottoms', icon: 'resize-outline' },
  { key: 'OUTERWEAR', label: 'Outerwear', icon: 'cloudy-outline' },
  { key: 'SHOES', label: 'Shoes', icon: 'footsteps-outline' },
  { key: 'ACCESSORY', label: 'Accessories', icon: 'watch-outline' },
  { key: 'FORMAL', label: 'Formal', icon: 'bowtie-outline' },
];

const SUBCATEGORIES: Record<ClothingCategory, string[]> = {
  TOP: ['T-Shirt', 'Shirt', 'Blouse', 'Sweater', 'Hoodie', 'Tank Top', 'Polo'],
  BOTTOM: ['Jeans', 'Pants', 'Shorts', 'Skirt', 'Leggings', 'Sweatpants'],
  OUTERWEAR: ['Jacket', 'Coat', 'Blazer', 'Vest', 'Windbreaker', 'Parka'],
  SHOES: ['Sneakers', 'Boots', 'Sandals', 'Loafers', 'Heels', 'Flats'],
  ACCESSORY: ['Hat', 'Scarf', 'Belt', 'Bag', 'Jewelry', 'Sunglasses', 'Watch'],
  UNDERWEAR: ['Underwear', 'Socks', 'Bra', 'Undershirt'],
  SWIMWEAR: ['Bikini', 'Swim Trunks', 'One-Piece', 'Rash Guard'],
  FORMAL: ['Suit', 'Dress', 'Tuxedo', 'Gown'],
};

const PATTERNS: Pattern[] = ['SOLID', 'STRIPED', 'PLAID', 'FLORAL', 'PRINTED', 'OTHER'];
const SEASONS: Season[] = ['SPRING', 'SUMMER', 'FALL', 'WINTER'];
const OCCASIONS: Occasion[] = ['CASUAL', 'WORK', 'FORMAL', 'SPORT', 'GOING_OUT'];

export function ClosetScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ClosetStackParamList>>();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ClothingCategory | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Add item form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ClothingCategory>('TOP');
  const [formSubcategory, setFormSubcategory] = useState('');
  const [formColor, setFormColor] = useState('');
  const [formPattern, setFormPattern] = useState<Pattern>('SOLID');
  const [formBrand, setFormBrand] = useState('');
  const [formSize, setFormSize] = useState('');
  const [formSeasons, setFormSeasons] = useState<Season[]>([]);
  const [formOccasions, setFormOccasions] = useState<Occasion[]>([]);
  const [formImageUri, setFormImageUri] = useState('');
  const [previewUri, setPreviewUri] = useState('');
  const [previewSource, setPreviewSource] = useState<'camera' | 'library'>('camera');

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getClothingItems({
        category: selectedCategory ?? undefined,
        favorite: showFavorites || undefined,
        search: searchQuery.trim() || undefined,
      });
      setItems(data);
    } catch {
      Alert.alert('Error', 'Failed to load clothing items');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, showFavorites, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const launchPicker = async (source: 'camera' | 'library') => {
    const launchFn =
      source === 'camera'
        ? ImagePicker.launchCameraAsync
        : ImagePicker.launchImageLibraryAsync;

    const result = await launchFn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) {
      setPreviewUri(result.assets[0].uri);
      setPreviewSource(source);
    }
  };

  const handlePickImage = () => launchPicker('library');
  const handleTakePhoto = () => launchPicker('camera');

  const resetForm = () => {
    setFormName('');
    setFormCategory('TOP');
    setFormSubcategory('');
    setFormColor('');
    setFormPattern('SOLID');
    setFormBrand('');
    setFormSize('');
    setFormSeasons([]);
    setFormOccasions([]);
    setFormImageUri('');
  };

  const handleSaveItem = async () => {
    if (!formName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!formSubcategory) {
      Alert.alert('Error', 'Subcategory is required');
      return;
    }
    if (!formColor.trim()) {
      Alert.alert('Error', 'Color is required');
      return;
    }
    if (!formImageUri) {
      Alert.alert('Error', 'Please add a photo');
      return;
    }

    setSaving(true);
    try {
      await createClothingItem({
        name: formName.trim(),
        category: formCategory,
        subcategory: formSubcategory,
        color: formColor.trim(),
        pattern: formPattern,
        brand: formBrand.trim() || undefined,
        size: formSize.trim() || undefined,
        season: formSeasons.length > 0 ? formSeasons : undefined,
        occasion: formOccasions.length > 0 ? formOccasions : undefined,
        imageUri: formImageUri,
      });
      setModalVisible(false);
      resetForm();
      fetchItems();
    } catch {
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: ClothingItem) => {
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteClothingItem(item.id);
            fetchItems();
          } catch {
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const handleToggleFavorite = async (item: ClothingItem) => {
    try {
      await toggleFavorite(item.id);
      fetchItems();
    } catch {
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const toggleArrayItem = <T extends string>(arr: T[], item: T): T[] =>
    arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];

  const renderItem = ({ item }: { item: ClothingItem }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => navigation.navigate('ClothingItemDetail', { itemId: item.id })}
      onLongPress={() => handleDelete(item)}
    >
      <Image
        source={{ uri: getFullImageUrl(item.thumbnailUrl || item.imageUrl) }}
        style={styles.itemImage}
      />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.itemMeta}>{item.subcategory} &middot; {item.color}</Text>
        {item.brand && <Text style={styles.itemBrand}>{item.brand}</Text>}
      </View>
      <TouchableOpacity style={styles.favoriteBtn} onPress={() => handleToggleFavorite(item)}>
        <Ionicons
          name={item.isFavorite ? 'heart' : 'heart-outline'}
          size={22}
          color={item.isFavorite ? Colors.error : Colors.textSecondary}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.filterChip, showFavorites && styles.filterChipActive]}
          onPress={() => { setShowFavorites(!showFavorites); setSelectedCategory(null); }}
        >
          <Ionicons name="heart" size={14} color={showFavorites ? '#fff' : Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, !selectedCategory && !showFavorites && styles.filterChipActive]}
          onPress={() => { setSelectedCategory(null); setShowFavorites(false); }}
        >
          <Text style={[styles.filterText, !selectedCategory && !showFavorites && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.filterChip, selectedCategory === cat.key && styles.filterChipActive]}
            onPress={() => { setSelectedCategory(cat.key); setShowFavorites(false); }}
          >
            <Text style={[styles.filterText, selectedCategory === cat.key && styles.filterTextActive]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items List */}
      {loading ? (
        <ActivityIndicator size="large" color={Colors.accent} style={styles.loader} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="shirt-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyText}>No items yet</Text>
          <Text style={styles.emptySubtext}>Tap + to add your first clothing item</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />
          }
        />
      )}

      {/* Add Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Photo Preview */}
      <PhotoPreviewModal
        visible={!!previewUri}
        imageUri={previewUri}
        onApprove={() => {
          setFormImageUri(previewUri);
          setPreviewUri('');
        }}
        onRetake={() => {
          setPreviewUri('');
          launchPicker(previewSource);
        }}
        onCancel={() => setPreviewUri('')}
      />

      {/* Add Item Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Item</Text>
            <TouchableOpacity onPress={handleSaveItem} disabled={saving}>
              <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Photo */}
          <TouchableOpacity
            style={styles.photoPicker}
            onPress={() => {
              Alert.alert('Add Photo', '', [
                { text: 'Take Photo', onPress: handleTakePhoto },
                { text: 'Choose from Library', onPress: handlePickImage },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }}
          >
            {formImageUri ? (
              <Image source={{ uri: formImageUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={40} color={Colors.textSecondary} />
                <Text style={styles.photoPlaceholderText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Name */}
          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput
            style={styles.textInput}
            value={formName}
            onChangeText={setFormName}
            placeholder="e.g. Blue Oxford Shirt"
            placeholderTextColor={Colors.textSecondary}
          />

          {/* Category */}
          <Text style={styles.fieldLabel}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.chip, formCategory === cat.key && styles.chipActive]}
                  onPress={() => { setFormCategory(cat.key); setFormSubcategory(''); }}
                >
                  <Text style={[styles.chipText, formCategory === cat.key && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Subcategory */}
          <Text style={styles.fieldLabel}>Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {SUBCATEGORIES[formCategory].map((sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.chip, formSubcategory === sub && styles.chipActive]}
                  onPress={() => setFormSubcategory(sub)}
                >
                  <Text style={[styles.chipText, formSubcategory === sub && styles.chipTextActive]}>
                    {sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Color */}
          <Text style={styles.fieldLabel}>Color *</Text>
          <TextInput
            style={styles.textInput}
            value={formColor}
            onChangeText={setFormColor}
            placeholder="e.g. Navy Blue"
            placeholderTextColor={Colors.textSecondary}
          />

          {/* Pattern */}
          <Text style={styles.fieldLabel}>Pattern</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {PATTERNS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, formPattern === p && styles.chipActive]}
                  onPress={() => setFormPattern(p)}
                >
                  <Text style={[styles.chipText, formPattern === p && styles.chipTextActive]}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Brand & Size */}
          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Brand</Text>
              <TextInput
                style={styles.textInput}
                value={formBrand}
                onChangeText={setFormBrand}
                placeholder="Optional"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Size</Text>
              <TextInput
                style={styles.textInput}
                value={formSize}
                onChangeText={setFormSize}
                placeholder="Optional"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </View>

          {/* Seasons */}
          <Text style={styles.fieldLabel}>Seasons</Text>
          <View style={styles.chipRow}>
            {SEASONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, formSeasons.includes(s) && styles.chipActive]}
                onPress={() => setFormSeasons(toggleArrayItem(formSeasons, s))}
              >
                <Text style={[styles.chipText, formSeasons.includes(s) && styles.chipTextActive]}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Occasions */}
          <Text style={styles.fieldLabel}>Occasions</Text>
          <View style={styles.chipRow}>
            {OCCASIONS.map((o) => (
              <TouchableOpacity
                key={o}
                style={[styles.chip, formOccasions.includes(o) && styles.chipActive]}
                onPress={() => setFormOccasions(toggleArrayItem(formOccasions, o))}
              >
                <Text style={[styles.chipText, formOccasions.includes(o) && styles.chipTextActive]}>
                  {o.replace('_', ' ').charAt(0) + o.replace('_', ' ').slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    paddingVertical: 0,
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
  row: {
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  itemCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    maxWidth: '48%',
  },
  itemImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.border,
  },
  itemInfo: {
    padding: Spacing.sm,
  },
  itemName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  itemMeta: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  itemBrand: {
    fontSize: FontSize.xs,
    color: Colors.accent,
    marginTop: 2,
  },
  favoriteBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 14,
    padding: 4,
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
  photoPicker: {
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  photoPreview: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius.card,
  },
  photoPlaceholder: {
    width: 160,
    height: 160,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
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
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  fieldHalf: {
    flex: 1,
  },
});
