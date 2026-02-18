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
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '../constants/theme';
import { getFullImageUrl } from '../utils/image';
import { WearLog, getWearLogs, deleteWearLog } from '../services/wearLogs';

export function WearHistoryScreen() {
  const [wearLogs, setWearLogs] = useState<WearLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = useCallback(async (reset = true) => {
    try {
      if (reset) setLoading(true);
      const data = await getWearLogs(20, reset ? 0 : wearLogs.length);
      if (reset) {
        setWearLogs(data.wearLogs);
      } else {
        setWearLogs((prev) => [...prev, ...data.wearLogs]);
      }
      setTotal(data.total);
    } catch {
      Alert.alert('Error', 'Failed to load wear history');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [wearLogs.length]);

  useEffect(() => {
    fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchLogs(true);
  };

  const handleLoadMore = () => {
    if (loadingMore || wearLogs.length >= total) return;
    setLoadingMore(true);
    fetchLogs(false);
  };

  const handleDelete = (log: WearLog) => {
    Alert.alert('Delete Entry', 'Remove this wear log?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteWearLog(log.id);
            fetchLogs(true);
          } catch {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const renderLog = ({ item: log }: { item: WearLog }) => (
    <TouchableOpacity style={styles.logCard} onLongPress={() => handleDelete(log)}>
      <View style={styles.logDate}>
        <Ionicons name="calendar-outline" size={16} color={Colors.accent} />
        <Text style={styles.logDateText}>{formatDate(log.date)}</Text>
      </View>

      {log.outfit ? (
        <View style={styles.outfitRow}>
          <View style={styles.outfitInfo}>
            <Text style={styles.outfitName}>{log.outfit.name}</Text>
            <Text style={styles.outfitMeta}>
              {log.outfit.occasion} &middot; {log.outfit.items.length} items
            </Text>
          </View>
          <View style={styles.thumbRow}>
            {log.outfit.items.slice(0, 3).map((item) => (
              <Image
                key={item.id}
                source={{ uri: getFullImageUrl(item.thumbnailUrl || item.imageUrl) }}
                style={styles.thumbImage}
              />
            ))}
            {log.outfit.items.length > 3 && (
              <View style={styles.moreThumb}>
                <Text style={styles.moreText}>+{log.outfit.items.length - 3}</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.noOutfit}>No outfit linked</Text>
      )}

      {(log.weatherTemp || log.weatherCondition || log.notes) && (
        <View style={styles.extraInfo}>
          {log.weatherTemp && (
            <View style={styles.weatherRow}>
              <Ionicons name="thermometer-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.weatherText}>{log.weatherTemp}&deg;C</Text>
            </View>
          )}
          {log.weatherCondition && (
            <View style={styles.weatherRow}>
              <Ionicons name="cloud-outline" size={14} color={Colors.textSecondary} />
              <Text style={styles.weatherText}>{log.weatherCondition}</Text>
            </View>
          )}
          {log.notes && <Text style={styles.notesText}>{log.notes}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {wearLogs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={64} color={Colors.border} />
          <Text style={styles.emptyText}>No wear history yet</Text>
          <Text style={styles.emptySubtext}>Log outfits you wear to track your style</Text>
        </View>
      ) : (
        <FlatList
          data={wearLogs}
          renderItem={renderLog}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator size="small" color={Colors.accent} style={{ padding: Spacing.lg }} /> : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 80 },
  emptyText: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.textPrimary, marginTop: Spacing.lg },
  emptySubtext: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  listContent: { padding: Spacing.md },
  logCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.card, padding: Spacing.md, marginBottom: Spacing.md },
  logDate: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  logDateText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.accent },
  outfitRow: { gap: Spacing.sm },
  outfitInfo: { marginBottom: Spacing.sm },
  outfitName: { fontSize: FontSize.md, fontWeight: FontWeight.semibold, color: Colors.textPrimary },
  outfitMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  thumbRow: { flexDirection: 'row', gap: Spacing.sm },
  thumbImage: { width: 48, height: 48, borderRadius: BorderRadius.card, backgroundColor: Colors.border },
  moreThumb: { width: 48, height: 48, borderRadius: BorderRadius.card, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  moreText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  noOutfit: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic' },
  extraInfo: { marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  weatherText: { fontSize: FontSize.xs, color: Colors.textSecondary },
  notesText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontStyle: 'italic', marginTop: 4 },
});
