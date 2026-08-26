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

  // Get the first character of the title for a premium avatar look
  const firstLetter = item.title ? item.title.trim().charAt(0) : 'গ';

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.cardBackground,
          borderColor: colors.border,
          shadowColor: colors.shadowColor,
          opacity: pressed ? 0.96 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={styles.cardLayout}>
        {/* First Letter Avatar Circle */}
        <View style={[styles.avatarCircle, { backgroundColor: colors.badgeBackground }]}>
          <Text style={[styles.avatarText, { color: colors.tint }]}>
            {firstLetter}
          </Text>
        </View>

        {/* Content Column */}
        <View style={styles.mainContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.artist && item.artist.trim() !== '' ? (
                <Text style={[styles.artist, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.artist}
                </Text>
              ) : null}
            </View>
            
            <Pressable
              onPress={handleFavoritePress}
              hitSlop={10}
              style={styles.favoriteButton}
            >
              <Heart
                size={20}
                color={item.is_favorite === 1 ? colors.favoriteActive : colors.tabIconDefault}
                fill={item.is_favorite === 1 ? colors.favoriteActive : 'transparent'}
              />
            </Pressable>
          </View>

          {/* Lyrics Preview */}
          <Text style={[styles.previewText, { color: colors.textSecondary }]} numberOfLines={2}>
            {item.content ? item.content.replace(/\r\n/g, '\n') : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    // Soft shadow for premium look
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
  },
  mainContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'System',
    marginBottom: 3,
    letterSpacing: 0.1,
  },
  artist: {
    fontSize: 12,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  favoriteButton: {
    padding: 2,
    marginTop: -2,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'System',
  },
});
