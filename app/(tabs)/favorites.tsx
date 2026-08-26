import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Pressable } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Heart } from 'lucide-react-native';
import { useGojolDb } from '@/db/GojolContext';
import { Gojol } from '@/db/types';
import SearchBar from '@/components/SearchBar';
import CategoryPills from '@/components/CategoryPills';
import GojolCard from '@/components/GojolCard';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function FavoritesScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { getGojols, refreshKey } = useGojolDb();

  const [gojols, setGojols] = useState<Gojol[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadGojols() {
      try {
        setIsLoading(true);
        const data = await getGojols(searchQuery, selectedCategory, true);
        if (active) {
          setGojols(data);
        }
      } catch (error) {
        console.error('Failed to load favorite gojols:', error);
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
  }, [searchQuery, selectedCategory, refreshKey, getGojols]);

  const renderEmptyComponent = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Heart size={48} color={colors.favoriteActive} style={{ marginBottom: 12, opacity: 0.5 }} />
        <Text style={[styles.emptyText, { color: colors.text }]}>No Favorites Yet</Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {searchQuery || selectedCategory !== 'All'
            ? 'Try adjusting your search query or category filters.'
            : 'Tap the heart icon on any Gojol to save it to your favorites list.'}
        </Text>
        {searchQuery || selectedCategory !== 'All' ? (
          <Pressable
            style={[styles.resetButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
          >
            <Text style={styles.resetButtonText}>Reset Filters</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Search & Filter */}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search favorites..." />
      <CategoryPills
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main List */}
      {isLoading && gojols.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlashList
          data={gojols}
          renderItem={({ item }) => <GojolCard item={item} />}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={styles.listContent}
        />
      )}
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
  listContent: {
    paddingBottom: 24,
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
});
