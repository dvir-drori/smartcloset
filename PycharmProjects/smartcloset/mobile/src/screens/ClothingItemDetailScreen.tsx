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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getFullImageUrl } from '../utils/image';
import {
  ClothingItem,
  ClothingCategory,
  Pattern,
  Season,
  Occasion,
  getClothingItem,
  deleteClothingItem,
  toggleFavorite,
} from '../services/clothingItems';
import { updateClothingItem } from '../services/clothingItems';
import type { ClosetStackScreenProps } from '../navigation/types';
import api from '../services/api';

const CATEGORIES: { key: ClothingCategory; label: string }[] = [
  { key: 'TOP', label: 'Tops' },
  { key: 'BOTTOM', label: 'Bottoms' },
  { key: 'OUTERWEAR', label: 'Outerwear' },
  { key: 'SHOES', label: 'Shoes' },
  { key: 'ACCESSORY', label: 'Accessories' },
  { key: 'FORMAL', label: 'Formal' },
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

type Props = ClosetStackScreenProps<'ClothingItemDetail'>;

export function ClothingItemDetailScreen({ route, navigation }: Props) {
  const { itemId } = route.params;
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<ClothingCategory>('TOP');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPattern, setEditPattern] = useState<Pattern>('SOLID');
  const [editBrand, setEditBrand] = useState('');
  const [editSize, setEditSize] = useState('');
  const [editSeasons, setEditSeasons] = useState<Season[]>([]);
  const [editOccasions, setEditOccasions] = useState<Occasion[]>([]);
  const [editImageUri, setEditImageUri] = useState('');

  const fetchItem = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getClothingItem(itemId);
      setItem(data);
    } catch {
      Alert.alert('Error', 'Failed to load item');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [itemId, navigation]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const openEditModal = () => {
    if (!item) return;
    setEditName(item.name);
    setEditCategory(item.category);
    setEditSubcategory(item.subcategory);
    setEditColor(item.color);
    setEditPattern(item.pattern);
    setEditBrand(item.brand || '');
    setEditSize(item.size || '');
    setEditSeasons(item.season);
    setEditOccasions(item.occasion);
    setEditImageUri('');
    setEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editColor.trim() || !editSubcategory) {
      Alert.alert('Error', 'Name, type, and color are required');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', editName.trim());
      formData.append('category', editCategory);
      formData.append('subcategory', editSubcategory);
      formData.append('color', editColor.trim());
      formData.append('pattern', editPattern);
      if (editBrand.trim()) formData.append('brand', editBrand.trim());
      if (editSize.trim()) formData.append('size', editSize.trim());
      formData.append('season', JSON.stringify(editSeasons));
      formData.append('occasion', JSON.stringify(editOccasions));

      if (editImageUri) {
        const filename = editImageUri.split('/').pop() || 'photo.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        formData.append('image', {
          uri: editImageUri,
          name: filename,
          type: mimeType,
        } as unknown as Blob);
      }

      const { data } = await api.put<ClothingItem>(`/api/clothing-items/${itemId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setItem(data);
      setEditModal(false);
    } catch {
      Alert.alert('Error', 'Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Item', `Delete "${item?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteClothingItem(itemId);
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to delete item');
          }
        },
      },
    ]);
  };

  const handleToggleFavorite = async () => {
    if (!item) return;
    try {
      const updated = await toggleFavorite(itemId);
      setItem(updated);
    } catch {
      Alert.alert('Error', 'Failed to update favorite');
    }
  };

  const handlePickEditImage = async () => {
    Alert.alert('Change Photo', '', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
          });
          if (!result.canceled && result.assets?.[0]) setEditImageUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.8,
          });
          if (!result.canceled && result.assets?.[0]) setEditImageUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleArrayItem = <T extends string>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((i) => i !== val) : [...arr, val];

  if (loading || !item) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Image
          source={{ uri: getFullImageUrl(item.imageUrl) }}
          style={styles.heroImage}
        />

        <View style={styles.headerRow}>
          <View style={styles.headerInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemSub}>{item.subcategory} &middot; {item.category}</Text>
          </View>
          <TouchableOpacity onPress={handleToggleFavorite} style={styles.heartBtn}>
            <Ionicons
              name={item.isFavorite ? 'heart' : 'heart-outline'}
              size={28}
              color={item.isFavorite ? Colors.error : Colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Details */}
        <View style={styles.detailSection}>
          <DetailRow label="Color" value={item.color} />
          <DetailRow label="Pattern" value={item.pattern.charAt(0) + item.pattern.slice(1).toLowerCase()} />
          {item.brand && <DetailRow label="Brand" value={item.brand} />}
          {item.size && <DetailRow label="Size" value={item.size} />}
          {item.material && <DetailRow label="Material" value={item.material} />}
          <DetailRow label="Times Worn" value={String(item.timesWorn)} />
          {item.lastWornAt && (
            <DetailRow label="Last Worn" value={new Date(item.lastWornAt).toLocaleDateString()} />
          )}
        </View>

        {/* Seasons & Occasions */}
        {item.season.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagLabel}>Seasons</Text>
            <View style={styles.tagRow}>
              {item.season.map((s) => (
                <View key={s} style={styles.tag}>
                  <Text style={styles.tagText}>{s.charAt(0) + s.slice(1).toLowerCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {item.occasion.length > 0 && (
          <View style={styles.tagSection}>
            <Text style={styles.tagLabel}>Occasions</Text>
            <View style={styles.tagRow}>
              {item.occasion.map((o) => (
                <View key={o} style={styles.tag}>
                  <Text style={styles.tagText}>{o.replace('_', ' ').charAt(0) + o.replace('_', ' ').slice(1).toLowerCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.dateText}>
          Added {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
          <Ionicons name="create-outline" size={20} color="#fff" />
          <Text style={styles.editBtnText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
          <Text style={styles.deleteBtnText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet">
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalContent}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Item</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={saving}>
              <Text style={[styles.saveText, saving && { opacity: 0.5 }]}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Photo */}
          <TouchableOpacity style={styles.photoPicker} onPress={handlePickEditImage}>
            <Image
              source={{ uri: editImageUri || getFullImageUrl(item.imageUrl) }}
              style={styles.photoPreview}
            />
            <View style={styles.photoOverlay}>
              <Ionicons name="camera" size={20} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>Name *</Text>
          <TextInput style={styles.textInput} value={editName} onChangeText={setEditName} />

          <Text style={styles.fieldLabel}>Category *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.chip, editCategory === cat.key && styles.chipActive]}
                  onPress={() => { setEditCategory(cat.key); setEditSubcategory(''); }}
                >
                  <Text style={[styles.chipText, editCategory === cat.key && styles.chipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>Type *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {SUBCATEGORIES[editCategory].map((sub) => (
                <TouchableOpacity
                  key={sub}
                  style={[styles.chip, editSubcategory === sub && styles.chipActive]}
                  onPress={() => setEditSubcategory(sub)}
                >
                  <Text style={[styles.chipText, editSubcategory === sub && styles.chipTextActive]}>{sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.fieldLabel}>Color *</Text>
          <TextInput style={styles.textInput} value={editColor} onChangeText={setEditColor} />

          <Text style={styles.fieldLabel}>Pattern</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipRow}>
              {PATTERNS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, editPattern === p && styles.chipActive]}
                  onPress={() => setEditPattern(p)}
                >
                  <Text style={[styles.chipText, editPattern === p && styles.chipTextActive]}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Brand</Text>
              <TextInput style={styles.textInput} value={editBrand} onChangeText={setEditBrand} />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Size</Text>
              <TextInput style={styles.textInput} value={editSize} onChangeText={setEditSize} />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Seasons</Text>
          <View style={styles.chipRow}>
            {SEASONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.chip, editSeasons.includes(s) && styles.chipActive]}
                onPress={() => setEditSeasons(toggleArrayItem(editSeasons, s))}
              >
                <Text style={[styles.chipText, editSeasons.includes(s) && styles.chipTextActive]}>
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Occasions</Text>
          <View style={styles.chipRow}>
            {OCCASIONS.map((o) => (
              <TouchableOpacity
                key={o}
                style={[styles.chip, editOccasions.includes(o) && styles.chipActive]}
                onPress={() => setEditOccasions(toggleArrayItem(editOccasions, o))}
              >
                <Text style={[styles.chipText, editOccasions.includes(o) && styles.chipTextActive]}>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  content: { paddingBottom: 80 },
  heroImage: { width: '100%', aspectRatio: 1, backgroundColor: Colors.surface },
  headerRow: { flexDirection: 'row', padding: Spacing.lg, alignItems: 'flex-start' },
  headerInfo: { flex: 1 },
  itemName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  itemSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  heartBtn: { padding: Spacing.sm },
  detailSection: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  detailLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  detailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textPrimary },
  tagSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  tagLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag: { backgroundColor: Colors.surface, paddingHorizontal: Spacing.md, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  dateText: { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: Spacing.lg, paddingBottom: Spacing.lg },
  bottomBar: { flexDirection: 'row', gap: Spacing.md, padding: Spacing.lg, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  editBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.accent, paddingVertical: 12, borderRadius: BorderRadius.button },
  editBtnText: { color: '#fff', fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  deleteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.surface, paddingVertical: 12, borderRadius: BorderRadius.button, borderWidth: 1, borderColor: Colors.border },
  deleteBtnText: { color: Colors.error, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalContent: { padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xl, paddingTop: Spacing.lg },
  modalTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  cancelText: { fontSize: FontSize.md, color: Colors.textSecondary },
  saveText: { fontSize: FontSize.md, color: Colors.accent, fontWeight: FontWeight.semibold },
  photoPicker: { alignSelf: 'center', marginBottom: Spacing.xl },
  photoPreview: { width: 140, height: 140, borderRadius: BorderRadius.card },
  photoOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 14, padding: 6 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginBottom: Spacing.sm, marginTop: Spacing.lg },
  textInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.card, paddingHorizontal: Spacing.md, paddingVertical: 12, fontSize: FontSize.md, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: 16, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  chipTextActive: { color: '#fff' },
  fieldRow: { flexDirection: 'row', gap: Spacing.md },
  fieldHalf: { flex: 1 },
});
