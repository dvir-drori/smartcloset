import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';

interface Props {
  visible: boolean;
  imageUri: string;
  onApprove: () => void;
  onRetake: () => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export function PhotoPreviewModal({
  visible,
  imageUri,
  onApprove,
  onRetake,
  onCancel,
  aspectRatio = 1,
}: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Review Photo</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={[styles.image, { aspectRatio }]}
              resizeMode="contain"
            />
          ) : null}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.retakeBtn} onPress={onRetake}>
            <Ionicons name="camera-reverse-outline" size={22} color={Colors.textPrimary} />
            <Text style={styles.retakeBtnText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveBtn} onPress={onApprove}>
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            <Text style={styles.approveBtnText}>Use Photo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeBtn: {
    padding: 4,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  image: {
    width: '100%',
    borderRadius: BorderRadius.card,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: BorderRadius.button,
  },
  retakeBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: BorderRadius.button,
  },
  approveBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
});
