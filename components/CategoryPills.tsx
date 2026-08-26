import React from 'react';
import { StyleSheet, ScrollView, Text, Pressable, View } from 'react-native';
import { CATEGORIES } from '@/constants/Categories';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

interface CategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export default function CategoryPills({ selectedCategory, onSelectCategory }: CategoryPillsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  const allCategories = ['All', ...CATEGORIES];

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {allCategories.map((category) => {
          const isSelected = selectedCategory === category;
          return (
            <Pressable
              key={category}
              onPress={() => onSelectCategory(category)}
              style={[
                styles.pill,
                {
                  backgroundColor: isSelected ? colors.tint : colors.cardBackground,
                  borderColor: isSelected ? colors.tint : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.text,
                    fontWeight: isSelected ? '600' : '400',
                  },
                ]}
              >
                {category}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    height: 48,
    marginBottom: 8,
  },
  container: {
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
  },
  pillText: {
    fontSize: 14,
    fontFamily: 'System',
  },
});
