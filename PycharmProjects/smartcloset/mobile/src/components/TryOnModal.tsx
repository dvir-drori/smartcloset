import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getFullImageUrl } from '../utils/image';
import { generateTryOnWithProgress, checkTryOnResult, TryOnResult } from '../services/tryon';

interface Props {
  visible: boolean;
  clothingItemId: string;
  itemName: string;
  onClose: () => void;
}

const PROGRESS_STAGES = [
  { key: 'checking', label: 'Checking cache...', icon: 'search-outline' as const },
  { key: 'preparing', label: 'Preparing images...', icon: 'images-outline' as const },
  { key: 'connecting', label: 'Connecting to AI...', icon: 'cloud-outline' as const },
  { key: 'generating', label: 'Generating preview...', icon: 'sparkles-outline' as const },
  { key: 'downloading', label: 'Downloading result...', icon: 'download-outline' as const },
];

function getStageIndex(stage: string): number {
  if (stage.includes('Preparing')) return 1;
  if (stage.includes('Connecting')) return 2;
  if (stage.includes('Generating')) return 3;
  if (stage.includes('Downloading')) return 4;
  if (stage.includes('Done')) return 5;
  return 0;
}

export function TryOnModal({ visible, clothingItemId, itemName, onClose }: Props) {
  const [state, setState] = useState<'loading' | 'error' | 'result'>('loading');
  const [result, setResult] = useState<TryOnResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentStage, setCurrentStage] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const abortRef = useRef<(() => void) | null>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && clothingItemId) {
      doGenerate();
    }
    return () => {
      abortRef.current?.();
      abortRef.current = null;
      setState('loading');
      setResult(null);
      setErrorMsg('');
      setCurrentStage(0);
      setFromCache(false);
      progressAnim.setValue(0);
    };
  }, [visible, clothingItemId]);

  // Animate progress bar when stage changes
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentStage / PROGRESS_STAGES.length,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentStage]);

  const doGenerate = () => {
    setState('loading');
    setErrorMsg('');
    setCurrentStage(0);
    setFromCache(false);

    // First check cache via the quick check endpoint
    checkTryOnResult(clothingItemId)
      .then((check) => {
        if (check.result) {
          // Cached result available - show immediately
          setResult(check.result);
          setFromCache(true);
          setState('result');
          return;
        }

        if (!check.hasBodyPhoto) {
          setErrorMsg('Upload a front body photo in the Avatar tab first.');
          setState('error');
          return;
        }

        // No cache - start SSE generation
        startGeneration();
      })
      .catch(() => {
        // Check failed, try generation anyway
        startGeneration();
      });
  };

  const startGeneration = () => {
    setCurrentStage(1);

    const abort = generateTryOnWithProgress(clothingItemId, {
      onProgress: (stage) => {
        setCurrentStage(getStageIndex(stage));
      },
      onComplete: (data) => {
        setResult(data);
        setFromCache(!!data.fromCache);
        setState('result');
      },
      onError: (error) => {
        setErrorMsg(error);
        setState('error');
      },
    });

    abortRef.current = abort;
  };

  const handleClose = () => {
    abortRef.current?.();
    abortRef.current = null;
    onClose();
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Try On: {itemName}</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        {state === 'loading' && (
          <View style={styles.centered}>
            {/* Progress stages */}
            <View style={styles.stagesContainer}>
              {PROGRESS_STAGES.map((stage, idx) => (
                <View key={stage.key} style={styles.stageRow}>
                  <View style={[
                    styles.stageIcon,
                    idx < currentStage && styles.stageIconDone,
                    idx === currentStage && styles.stageIconActive,
                  ]}>
                    {idx < currentStage ? (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    ) : idx === currentStage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name={stage.icon} size={16} color={Colors.textSecondary} />
                    )}
                  </View>
                  <Text style={[
                    styles.stageLabel,
                    idx < currentStage && styles.stageLabelDone,
                    idx === currentStage && styles.stageLabelActive,
                  ]}>
                    {stage.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Progress bar */}
            <View style={styles.progressBarContainer}>
              <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
            </View>

            <Text style={styles.loadingSubtext}>
              AI is generating your try-on preview
            </Text>
          </View>
        )}

        {state === 'error' && (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={64} color={Colors.error} />
            <Text style={styles.errorText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={doGenerate}>
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'result' && result && (
          <View style={styles.resultContainer}>
            {fromCache && (
              <View style={styles.cacheBadge}>
                <Ionicons name="flash" size={14} color={Colors.success} />
                <Text style={styles.cacheBadgeText}>Loaded instantly from cache</Text>
              </View>
            )}
            <Image
              source={{ uri: getFullImageUrl(result.resultImageUrl) }}
              style={styles.resultImage}
              resizeMode="contain"
            />
            <Text style={styles.caption}>{itemName}</Text>

            {/* Action buttons */}
            <View style={styles.resultActions}>
              <TouchableOpacity style={styles.closeResultBtn} onPress={handleClose}>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.closeResultBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  stagesContainer: {
    width: '100%',
    maxWidth: 280,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stageIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stageIconDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  stageIconActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  stageLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  stageLabelDone: {
    color: Colors.success,
  },
  stageLabelActive: {
    color: Colors.textPrimary,
    fontWeight: FontWeight.semibold,
  },
  progressBarContainer: {
    width: '100%',
    maxWidth: 280,
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
  loadingSubtext: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
  },
  retryBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },
  cacheBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: Spacing.sm,
  },
  cacheBadgeText: {
    fontSize: FontSize.xs,
    color: Colors.success,
    fontWeight: FontWeight.medium,
  },
  resultImage: {
    width: '100%',
    flex: 1,
    borderRadius: BorderRadius.card,
  },
  caption: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  resultActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  closeResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.accent,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
  },
  closeResultBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    color: '#fff',
  },
});
