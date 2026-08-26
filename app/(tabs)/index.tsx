import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Pressable, FlatList } from 'react-native';
import { Plus, Music } from 'lucide-react-native';
import { router } from 'expo-router';
import { useGojolDb } from '@/db/GojolContext';
import { Gojol } from '@/db/types';
import SearchBar from '@/components/SearchBar';
import GojolCard from '@/components/GojolCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

type FlatListItem = 
  | { type: 'header'; title: string }
  | ({ type: 'item' } & Gojol);

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { getGojols, refreshKey } = useGojolDb();

  const [gojols, setGojols] = useState<Gojol[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const flatListRef = useRef<FlatList<FlatListItem>>(null);

  useEffect(() => {
    let active = true;
    async function loadGojols() {
      try {
        setIsLoading(true);
        const data = await getGojols(searchQuery, undefined, false);
        if (active) {
          setGojols(data);
        }
      } catch (error) {
        console.error('Failed to load gojols:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    loadGojols();
    return () => {
      active = false;
    };
  }, [searchQuery, refreshKey, getGojols]);

  // Transform hierarchical data into a flat array of headers and items
  const flatData = useMemo((): FlatListItem[] => {
    if (gojols.length === 0) return [];

    // Sort alphabetically by title using Bengali locale
    const sortedGojols = [...gojols].sort((a, b) =>
      a.title.localeCompare(b.title, 'bn')
    );

    const result: FlatListItem[] = [];
    const seenLetters = new Set<string>();

    sortedGojols.forEach((gojol) => {
      let firstChar = gojol.title.trim().charAt(0);
      
      // Normalize character grouping
      if (/[a-zA-Z]/.test(firstChar)) {
        firstChar = firstChar.toUpperCase();
      } else if (!/^[ক-হঅ-ঊএ-ঐও-ঔ]/.test(firstChar)) {
        firstChar = '#'; // Group numbers/special characters
      }

      if (!seenLetters.has(firstChar)) {
        seenLetters.add(firstChar);
        result.push({ type: 'header', title: firstChar });
      }
      result.push({ type: 'item', ...gojol });
    });

    // Sort sections so headers are alphabetical
    // (In our case, the list is already sorted by title, so headers naturally appear in order)
    return result;
  }, [gojols]);

  // Index indices for sticky headers
  const stickyHeaderIndices = useMemo(() => {
    const indices: number[] = [];
    flatData.forEach((item, idx) => {
      if (item.type === 'header') {
        indices.push(idx);
      }
    });
    return indices;
  }, [flatData]);

  // Unique letters list for the right-side vertical index bar
  const indexLetters = useMemo(() => {
    return flatData
      .filter((item): item is { type: 'header'; title: string } => item.type === 'header')
      .map((item) => item.title);
  }, [flatData]);

  const handleIndexPress = (letter: string) => {
    const targetIdx = flatData.findIndex(
      (item) => item.type === 'header' && item.title === letter
    );

    if (targetIdx !== -1) {
      flatListRef.current?.scrollToIndex({
        index: targetIdx,
        animated: true,
        viewPosition: 0,
      });
    }
  };

  // Precise layout calculation to prevent offscreen scroll-to-index failures
  const getItemLayout = useCallback((data: any, index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const item = data[i];
      if (item && item.type === 'header') {
        offset += 34; // Height of section header in pixels
      } else {
        offset += 126; // Estimated height of GojolCard + bottom margin in pixels
      }
    }
    const currentItem = data[index];
    const length = currentItem && currentItem.type === 'header' ? 34 : 126;
    return { length, offset, index };
  }, []);

  const renderItem = ({ item }: { item: FlatListItem }) => {
    if (item.type === 'header') {
      return (
        <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
          <Text style={[styles.sectionHeaderText, { color: colors.tint }]}>
            {item.title}
          </Text>
          <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
        </View>
      );
    }

    // Pass the typed Gojol item to GojolCard
    const { type, ...gojol } = item;
    return <GojolCard item={gojol as Gojol} />;
  };

  const renderEmptyComponent = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Music size={48} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
        <Text style={[styles.emptyText, { color: colors.text }]}>No Gojols Found</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {searchQuery
            ? 'Try adjusting your search query.'
            : 'Get started by creating your very first Gojol lyrics notebook!'}
        </Text>
        {searchQuery ? (
          <Pressable
            style={[styles.resetButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              setSearchQuery('');
            }}
          >
            <Text style={styles.resetButtonText}>Reset Search</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Search & Filter */}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {/* Main List & Index Sidebar */}
      <View style={styles.listContainer}>
        {isLoading && gojols.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.tint} />
          </View>
        ) : (
          <View style={{ flex: 1, flexDirection: 'row' }}>
            <FlatList
              ref={flatListRef}
              data={flatData}
              keyExtractor={(item, index) =>
                item.type === 'header' ? `h-${item.title}` : `item-${item.id}`
              }
              renderItem={renderItem}
              ListEmptyComponent={renderEmptyComponent}
              contentContainerStyle={styles.listContent}
              stickyHeaderIndices={stickyHeaderIndices}
              getItemLayout={getItemLayout}
              onScrollToIndexFailed={(info) => {
                // Graceful fallback to avoid app crashes
                flatListRef.current?.scrollToOffset({
                  offset: info.highestMeasuredFrameIndex * 126,
                  animated: true,
                });
              }}
              showsVerticalScrollIndicator={false}
            />

            {/* Quick-Scroll Sidebar Index */}
            {indexLetters.length > 1 && (
              <View style={[styles.indexContainer, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                {indexLetters.map((letter) => (
                  <Pressable
                    key={letter}
                    onPress={() => handleIndexPress(letter)}
                    style={styles.indexButton}
                    hitSlop={8}
                  >
                    <Text style={[styles.indexText, { color: colors.textSecondary }]}>
                      {letter}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Floating Action Button (FAB) */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/manage')}
      >
        <Plus size={24} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 88, // Space for FAB and TabBar
    paddingRight: 40,  // Add padding to keep cards from going under the floating index sidebar
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 12,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    width: 24,
    textAlign: 'center',
  },
  sectionLine: {
    flex: 1,
    height: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: 'System',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'System',
    marginBottom: 16,
  },
  resetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  indexContainer: {
    position: 'absolute',
    right: 8,
    top: 10,
    bottom: 90,
    width: 24,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 8,
    // Subtle shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  indexButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  indexText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 48, // Adjusted to avoid overlapping the index bar
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
