import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { useAuthStore } from '../stores/authStore';
import { UserWithProfile, UserStats, getProfile, upsertProfile, getStats, updateUser } from '../services/profile';
import type { ProfileStackParamList } from '../navigation/types';

const PREFERRED_STYLES = ['CASUAL', 'FORMAL', 'SPORTY', 'CLASSIC', 'STREETWEAR', 'MINIMALIST'];
const GENDERS = [
  { key: 'MALE', label: 'Male' },
  { key: 'FEMALE', label: 'Female' },
  { key: 'UNSPECIFIED', label: 'Prefer not to say' },
];

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const { user, logout } = useAuthStore();
  const [profile, setProfile] = useState<UserWithProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [chestCm, setChestCm] = useState('');
  const [waistCm, setWaistCm] = useState('');
  const [hipsCm, setHipsCm] = useState('');
  const [shouldersCm, setShouldersCm] = useState('');
  const [preferredStyle, setPreferredStyle] = useState('CASUAL');

  // User edit modal state
  const [userEditModal, setUserEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('UNSPECIFIED');
  const [savingUser, setSavingUser] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileData, statsData] = await Promise.all([getProfile(), getStats()]);
      setProfile(profileData);
      setStats(statsData);

      if (profileData.profile) {
        setHeightCm(String(profileData.profile.heightCm));
        setWeightKg(String(profileData.profile.weightKg));
        setChestCm(profileData.profile.chestCm ? String(profileData.profile.chestCm) : '');
        setWaistCm(profileData.profile.waistCm ? String(profileData.profile.waistCm) : '');
        setHipsCm(profileData.profile.hipsCm ? String(profileData.profile.hipsCm) : '');
        setShouldersCm(profileData.profile.shouldersCm ? String(profileData.profile.shouldersCm) : '');
        setPreferredStyle(profileData.profile.preferredStyle);
      }
    } catch {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    const height = parseFloat(heightCm);
    const weight = parseFloat(weightKg);

    if (!height || height <= 0) {
      Alert.alert('Error', 'Please enter a valid height');
      return;
    }
    if (!weight || weight <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    setSaving(true);
    try {
      await upsertProfile({
        heightCm: height,
        weightKg: weight,
        chestCm: chestCm ? parseFloat(chestCm) : undefined,
        waistCm: waistCm ? parseFloat(waistCm) : undefined,
        hipsCm: hipsCm ? parseFloat(hipsCm) : undefined,
        shouldersCm: shouldersCm ? parseFloat(shouldersCm) : undefined,
        preferredStyle,
      });
      setEditing(false);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const openUserEditModal = () => {
    setEditName(profile?.fullName || '');
    setEditGender(profile?.gender || 'UNSPECIFIED');
    setUserEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSavingUser(true);
    try {
      await updateUser({ fullName: editName.trim(), gender: editGender });
      setUserEditModal(false);
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSavingUser(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User Info */}
      <View style={styles.userCard}>
        <TouchableOpacity style={styles.editUserBtn} onPress={openUserEditModal}>
          <Ionicons name="create-outline" size={18} color={Colors.accent} />
        </TouchableOpacity>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>
            {profile?.fullName?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{profile?.fullName}</Text>
        <Text style={styles.userEmail}>{profile?.email}</Text>
        <Text style={styles.userGender}>
          {profile?.gender === 'MALE' ? 'Male' : profile?.gender === 'FEMALE' ? 'Female' : ''}
        </Text>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.clothingCount}</Text>
            <Text style={styles.statLabel}>Items</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.outfitCount}</Text>
            <Text style={styles.statLabel}>Outfits</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.favoriteCount}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.wearLogCount}</Text>
            <Text style={styles.statLabel}>Wears</Text>
          </View>
        </View>
      )}

      {/* Measurements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Measurements</Text>
          {!editing && (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Ionicons name="create-outline" size={22} color={Colors.accent} />
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View>
            <View style={styles.measureRow}>
              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Height (cm) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="decimal-pad"
                  placeholder="170"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Weight (kg) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="decimal-pad"
                  placeholder="70"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.measureRow}>
              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Chest (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={chestCm}
                  onChangeText={setChestCm}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Waist (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={waistCm}
                  onChangeText={setWaistCm}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.measureRow}>
              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Hips (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={hipsCm}
                  onChangeText={setHipsCm}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              <View style={styles.measureField}>
                <Text style={styles.fieldLabel}>Shoulders (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={shouldersCm}
                  onChangeText={setShouldersCm}
                  keyboardType="decimal-pad"
                  placeholder="Optional"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            {/* Preferred Style */}
            <Text style={styles.fieldLabel}>Preferred Style</Text>
            <View style={styles.chipRow}>
              {PREFERRED_STYLES.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, preferredStyle === s && styles.chipActive]}
                  onPress={() => setPreferredStyle(s)}
                >
                  <Text style={[styles.chipText, preferredStyle === s && styles.chipTextActive]}>
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.editActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditing(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : profile?.profile ? (
          <View style={styles.measureDisplay}>
            <View style={styles.measureDisplayRow}>
              <Text style={styles.measureLabel}>Height</Text>
              <Text style={styles.measureValue}>{profile.profile.heightCm} cm</Text>
            </View>
            <View style={styles.measureDisplayRow}>
              <Text style={styles.measureLabel}>Weight</Text>
              <Text style={styles.measureValue}>{profile.profile.weightKg} kg</Text>
            </View>
            {profile.profile.chestCm && (
              <View style={styles.measureDisplayRow}>
                <Text style={styles.measureLabel}>Chest</Text>
                <Text style={styles.measureValue}>{profile.profile.chestCm} cm</Text>
              </View>
            )}
            {profile.profile.waistCm && (
              <View style={styles.measureDisplayRow}>
                <Text style={styles.measureLabel}>Waist</Text>
                <Text style={styles.measureValue}>{profile.profile.waistCm} cm</Text>
              </View>
            )}
            {profile.profile.hipsCm && (
              <View style={styles.measureDisplayRow}>
                <Text style={styles.measureLabel}>Hips</Text>
                <Text style={styles.measureValue}>{profile.profile.hipsCm} cm</Text>
              </View>
            )}
            {profile.profile.shouldersCm && (
              <View style={styles.measureDisplayRow}>
                <Text style={styles.measureLabel}>Shoulders</Text>
                <Text style={styles.measureValue}>{profile.profile.shouldersCm} cm</Text>
              </View>
            )}
            <View style={styles.measureDisplayRow}>
              <Text style={styles.measureLabel}>Style</Text>
              <Text style={styles.measureValue}>
                {profile.profile.preferredStyle.charAt(0) + profile.profile.preferredStyle.slice(1).toLowerCase()}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.setupBtn} onPress={() => setEditing(true)}>
            <Ionicons name="body-outline" size={24} color={Colors.accent} />
            <Text style={styles.setupText}>Set up your measurements</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Wear History */}
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => navigation.navigate('WearHistory')}
      >
        <View style={styles.menuItemLeft}>
          <Ionicons name="time-outline" size={22} color={Colors.accent} />
          <Text style={styles.menuItemText}>Wear History</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={Colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />

      {/* User Edit Modal */}
      <Modal visible={userEditModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setUserEditModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveUser} disabled={savingUser}>
              <Text style={[styles.modalSaveText, savingUser && { opacity: 0.5 }]}>
                {savingUser ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={styles.textInput}
            value={editName}
            onChangeText={setEditName}
            placeholder="Your name"
            placeholderTextColor={Colors.textSecondary}
          />

          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.key}
                style={[styles.chip, editGender === g.key && styles.chipActive]}
                onPress={() => setEditGender(g.key)}
              >
                <Text style={[styles.chipText, editGender === g.key && styles.chipTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  userCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarLetter: {
    fontSize: 32,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },
  userName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  userGender: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  editUserBtn: {
    position: 'absolute',
    top: Spacing.xl,
    right: 0,
    padding: Spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  measureRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  measureField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: 4,
    marginTop: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.card,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
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
  editActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.accent,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: FontSize.md,
    color: '#fff',
    fontWeight: FontWeight.semibold,
  },
  measureDisplay: {
    gap: Spacing.sm,
  },
  measureDisplayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  measureLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  measureValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
  },
  setupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  setupText: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: FontWeight.medium,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
  },
  logoutText: {
    fontSize: FontSize.md,
    color: Colors.error,
    fontWeight: FontWeight.medium,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: FontWeight.medium,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
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
  modalCancelText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },
  modalSaveText: {
    fontSize: FontSize.md,
    color: Colors.accent,
    fontWeight: FontWeight.semibold,
  },
});
