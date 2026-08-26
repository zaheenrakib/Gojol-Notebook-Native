import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Text, View, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { Save, ChevronLeft } from 'lucide-react-native';
import { useGojolDb } from '@/db/GojolContext';
import { CATEGORIES } from '@/constants/Categories';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function ManageGojolScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const gojolId = id ? parseInt(id, 10) : null;
  const isEditMode = gojolId !== null;

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const { getGojolById, addGojol, updateGojol } = useGojolDb();

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [category, setCategory] = useState<string>('Hamd');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(isEditMode);
  
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});

  useEffect(() => {
    async function loadGojol() {
      if (!gojolId) return;
      try {
        const gojol = await getGojolById(gojolId);
        if (gojol) {
          setTitle(gojol.title);
          setArtist(gojol.artist || '');
          setCategory(gojol.category);
          setContent(gojol.content);
        } else {
          Alert.alert('Error', 'Gojol not found');
          router.back();
        }
      } catch (error) {
        console.error('Failed to load gojol for edit:', error);
        Alert.alert('Error', 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isEditMode) {
      loadGojol();
    }
  }, [gojolId, getGojolById, isEditMode]);

  const handleSave = async () => {
    const newErrors: { title?: string; content?: string } = {};
    if (!title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!content.trim()) {
      newErrors.content = 'Lyrics content cannot be empty';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const gojolData = {
        title: title.trim(),
        artist: artist.trim() || undefined,
        category,
        content: content.trim(),
      };

      if (isEditMode && gojolId !== null) {
        await updateGojol(gojolId, gojolData);
      } else {
        await addGojol(gojolData);
      }
      router.back();
    } catch (error) {
      console.error('Failed to save gojol:', error);
      Alert.alert('Error', 'Failed to save Gojol');
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <Stack.Screen
        options={{
          title: isEditMode ? 'Edit Gojol' : 'Add Gojol',
          headerLeft: () => (
            <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={6}>
              <ChevronLeft size={24} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Title *</Text>
          <TextInput
            style={[
              styles.input,
              { 
                color: colors.text, 
                backgroundColor: colors.cardBackground, 
                borderColor: errors.title ? colors.favoriteActive : colors.border 
              }
            ]}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) setErrors(prev => ({ ...prev, title: undefined }));
            }}
            placeholder="e.g., সদা মন আমার করো রঙিন"
            placeholderTextColor={colors.textSecondary}
          />
          {errors.title ? <Text style={[styles.errorText, { color: colors.favoriteActive }]}>{errors.title}</Text> : null}
        </View>

        {/* Artist Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Artist / Writer (Optional)</Text>
          <TextInput
            style={[
              styles.input,
              { 
                color: colors.text, 
                backgroundColor: colors.cardBackground, 
                borderColor: colors.border 
              }
            ]}
            value={artist}
            onChangeText={setArtist}
            placeholder="e.g., কবি মতিউর রহমান মল্লিক"
            placeholderTextColor={colors.textSecondary}
          />
        </View>

        {/* Category Choice */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              return (
                <Pressable
                  key={cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: isSelected ? colors.tint : colors.cardBackground,
                      borderColor: isSelected ? colors.tint : colors.border,
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryItemText,
                      {
                        color: isSelected ? '#FFFFFF' : colors.text,
                        fontWeight: isSelected ? '600' : '400',
                      }
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Content/Lyrics Input */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, { color: colors.text }]}>Gojol Lyrics / Content *</Text>
          <TextInput
            style={[
              styles.textArea,
              { 
                color: colors.text, 
                backgroundColor: colors.cardBackground, 
                borderColor: errors.content ? colors.favoriteActive : colors.border 
              }
            ]}
            value={content}
            onChangeText={(text) => {
              setContent(text);
              if (errors.content) setErrors(prev => ({ ...prev, content: undefined }));
            }}
            placeholder="Write or paste gojol lyrics here..."
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
          />
          {errors.content ? <Text style={[styles.errorText, { color: colors.favoriteActive }]}>{errors.content}</Text> : null}
        </View>

        {/* Save Button */}
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={handleSave}
        >
          <Save size={20} color="#FFFFFF" />
          <Text style={styles.saveButtonText}>{isEditMode ? 'Update Gojol' : 'Save Gojol'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
    fontFamily: 'System',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryItemText: {
    fontSize: 14,
    fontFamily: 'System',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    minHeight: 240,
    fontSize: 15,
    fontFamily: 'System',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    fontFamily: 'System',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 12,
    marginTop: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});
