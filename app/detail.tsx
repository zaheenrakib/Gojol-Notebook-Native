import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Text, View, Pressable, Share, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Share2, Edit3, Trash2, ZoomIn, ZoomOut, Heart } from 'lucide-react-native';
import { useGojolDb } from '@/db/GojolContext';
import { Gojol } from '@/db/types';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gojolId = parseInt(id || '0', 10);

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { getGojolById, deleteGojol, toggleFavorite, refreshKey } = useGojolDb();

  const [gojol, setGojol] = useState<Gojol | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fontSize, setFontSize] = useState(18); // Default comfortable font size

  useEffect(() => {
    async function loadGojol() {
      try {
        setIsLoading(true);
        const data = await getGojolById(gojolId);
        setGojol(data);
      } catch (error) {
        console.error('Failed to load gojol detail:', error);
        Alert.alert('Error', 'Failed to load Gojol details');
      } finally {
        setIsLoading(false);
      }
    }
    loadGojol();
  }, [gojolId, refreshKey, getGojolById]);

  const handleIncreaseFont = () => {
    setFontSize((prev) => Math.min(32, prev + 2));
  };

  const handleDecreaseFont = () => {
    setFontSize((prev) => Math.max(12, prev - 2));
  };

  const handleShare = async () => {
    if (!gojol) return;
    try {
      const message = `${gojol.title}\n${gojol.artist ? `Artist: ${gojol.artist}\n` : ''}\n${gojol.content}`;
      await Share.share({
        message,
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Unable to share Gojol lyrics');
    }
  };

  const handleEdit = () => {
    if (!gojol) return;
    router.push({
      pathname: '/manage',
      params: { id: gojol.id },
    });
  };

  const handleDelete = () => {
    if (!gojol) return;
    Alert.alert(
      'Delete Gojol',
      'Are you sure you want to delete this Gojol from your notebook?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGojol(gojol.id);
              router.back();
            } catch (error) {
              console.error('Failed to delete gojol:', error);
              Alert.alert('Error', 'Failed to delete Gojol');
            }
          },
        },
      ]
    );
  };

  const handleFavoriteToggle = async () => {
    if (!gojol) return;
    try {
      const newFavStatus = gojol.is_favorite === 1 ? false : true;
      await toggleFavorite(gojol.id, newFavStatus);
      // Let standard useEffect refresh the detail screen via refreshKey
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Loading...' }} />
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  if (!gojol) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Text style={[styles.errorText, { color: colors.text }]}>Gojol Not Found</Text>
        <Pressable
          style={[styles.backButton, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Configures Stack Header Actions */}
      <Stack.Screen
        options={{
          headerTitle: '',
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable onPress={handleShare} style={styles.headerBtn} hitSlop={6}>
                <Share2 size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={handleEdit} style={styles.headerBtn} hitSlop={6}>
                <Edit3 size={20} color={colors.text} />
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.headerBtn} hitSlop={6}>
                <Trash2 size={20} color={colors.favoriteActive} />
              </Pressable>
            </View>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gojol Metadata Info */}
        <View style={styles.metaContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{gojol.title}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              {gojol.artist ? (
                <Text style={[styles.artist, { color: colors.textSecondary }]}>
                  By {gojol.artist}
                </Text>
              ) : (
                <Text style={[styles.artist, { color: colors.textSecondary }]}>
                  Unknown Artist
                </Text>
              )}
              <View style={[styles.badge, { backgroundColor: colors.badgeBackground }]}>
                <Text style={[styles.badgeText, { color: colors.tint }]}>{gojol.category}</Text>
              </View>
            </View>
            
            <Pressable
              onPress={handleFavoriteToggle}
              style={[styles.favCircle, { borderColor: colors.border }]}
            >
              <Heart
                size={20}
                color={gojol.is_favorite === 1 ? colors.favoriteActive : colors.textSecondary}
                fill={gojol.is_favorite === 1 ? colors.favoriteActive : 'transparent'}
              />
            </Pressable>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Gojol Lyrics/Content */}
        <View style={styles.lyricsContainer}>
          <Text 
            style={[
              styles.lyricsText, 
              { 
                color: colors.text, 
                fontSize: fontSize,
                lineHeight: fontSize * 1.6 
              }
            ]}
          >
            {gojol.content}
          </Text>
        </View>
      </ScrollView>

      {/* Floating Font Size Customizer Overlay */}
      <View style={[styles.floatingControls, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <Pressable onPress={handleDecreaseFont} style={styles.controlBtn}>
          <ZoomOut size={20} color={colors.text} />
          <Text style={[styles.controlBtnText, { color: colors.text }]}>A-</Text>
        </Pressable>
        <View style={[styles.controlDivider, { backgroundColor: colors.border }]} />
        <Pressable onPress={handleIncreaseFont} style={styles.controlBtn}>
          <ZoomIn size={20} color={colors.text} />
          <Text style={[styles.controlBtnText, { color: colors.text }]}>A+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    fontFamily: 'System',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerBtn: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Account for floating font controls
  },
  metaContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
    marginBottom: 12,
    fontFamily: 'System',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
  },
  artist: {
    fontSize: 15,
    fontWeight: '500',
    fontFamily: 'System',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  favCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginVertical: 16,
  },
  lyricsContainer: {
    paddingBottom: 40,
  },
  lyricsText: {
    fontFamily: 'System',
    textAlign: 'left',
    letterSpacing: 0.2,
  },
  floatingControls: {
    position: 'absolute',
    bottom: 24,
    left: '25%',
    right: '25%',
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: '100%',
  },
  controlBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  controlDivider: {
    width: 1,
    height: 24,
  },
});
