import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Heart } from 'lucide-react-native';
import { router } from 'expo-router';
import { Gojol } from '@/db/types';
import { useGojolDb } from '@/db/GojolContext';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface GojolCardProps {
  item: Gojol;
}

export default function GojolCard({ item }: GojolCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { toggleFavorite } = useGojolDb();

  const handlePress = () => {
    router.push({
      pathname: '/detail',
      params: { id: item.id },
    });
  };

  const handleFavoritePress = async (e: any) => {
    e.stopPropagation(); // Prevent card navigation trigger
    const newFavStatus = item.is_favorite === 1 ? false : true;
    await toggleFavorite(item.id, newFavStatus);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
          opacity: pressed ? 0.95 : 1,
          transform: [{ scale: pressed ? 0.99 : 1 }],
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.artist ? (
            <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.artist}
            </Text>
          ) : null}
        </View>
        
        <Pressable
          onPress={handleFavoritePress}
          hitSlop={8}
          style={styles.favoriteButton}
        >
          <Heart
            size={22}
            color={item.is_favorite === 1 ? colors.favoriteActive : colors.tabIconDefault}
            fill={item.is_favorite === 1 ? colors.favoriteActive : 'transparent'}
          />
        </Pressable>
      </View>

      <Text style={[styles.previewText, { color: colors.textSecondary }]} numberOfLines={2}>
        {item.content}
      </Text>

      <View style={styles.cardFooter}>
        <View style={[styles.badge, { backgroundColor: colors.badgeBackground }]}>
          <Text style={[styles.badgeText, { color: colors.tint }]}>
            {item.category}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: 2,
  },
  artist: {
    fontSize: 13,
    fontFamily: 'System',
    fontWeight: '500',
  },
  favoriteButton: {
    padding: 4,
    alignSelf: 'flex-start',
  },
  previewText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'System',
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
