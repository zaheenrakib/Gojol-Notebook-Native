import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Pressable, FlatList, Modal, TextInput, Alert, Platform } from 'react-native';
import { Plus, Music, Lock, Unlock, Download, Upload, Eye, EyeOff } from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
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
  const { 
    getGojols, 
    refreshKey, 
    isAdmin, 
    authenticateAdmin, 
    logoutAdmin,
    exportDatabase,
    importDatabase
  } = useGojolDb();

  const [gojols, setGojols] = useState<Gojol[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Admin controls
  const [adminTab, setAdminTab] = useState<'approved' | 'pending' | 'backup'>('approved');
  const [passcodeModalVisible, setPasscodeModalVisible] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const flatListRef = useRef<FlatList<FlatListItem>>(null);

  // Force reset adminTab to approved if user logs out of Admin Mode
  useEffect(() => {
    if (!isAdmin) {
      setAdminTab('approved');
    }
  }, [isAdmin]);

  useEffect(() => {
    let active = true;
    async function loadGojols() {
      // If we are in the backup tab, we do not need to fetch or display gojols list
      if (isAdmin && adminTab === 'backup') {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // If not admin, always query approvedOnly = true
        const approvedOnly = isAdmin ? (adminTab === 'approved') : true;
        const data = await getGojols(searchQuery, undefined, false, approvedOnly);
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
  }, [searchQuery, refreshKey, getGojols, isAdmin, adminTab]);

  // Transform hierarchical data into a flat array of headers and items
  const flatData = useMemo((): FlatListItem[] => {
    if (gojols.length === 0 || (isAdmin && adminTab === 'backup')) return [];

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
        firstChar = '#';
      }

      if (!seenLetters.has(firstChar)) {
        seenLetters.add(firstChar);
        result.push({ type: 'header', title: firstChar });
      }
      result.push({ type: 'item', ...gojol });
    });

    return result;
  }, [gojols, isAdmin, adminTab]);

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

  const getItemLayout = useCallback((data: any, index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const item = data[i];
      if (item && item.type === 'header') {
        offset += 34; // Height of section header
      } else {
        offset += 126; // Height of GojolCard + bottom margin
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

    const { type, ...gojol } = item;
    return <GojolCard item={gojol as Gojol} />;
  };

  const handleAdminPress = () => {
    if (isAdmin) {
      Alert.alert('Admin Mode', 'Exit Admin Mode?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            logoutAdmin();
          },
        },
      ]);
    } else {
      setPasscodeInput('');
      setSecureTextEntry(true);
      setPasscodeModalVisible(true);
    }
  };

  const handleLoginSubmit = () => {
    if (authenticateAdmin(passcodeInput)) {
      setPasscodeModalVisible(false);
      Alert.alert('Success', 'Admin mode activated successfully!');
    } else {
      Alert.alert('Error', 'Invalid Admin Passcode!');
    }
  };

  const handleExportBackup = async () => {
    try {
      setIsLoading(true);
      const jsonString = await exportDatabase();

      if (Platform.OS === 'web') {
        // Web browser download implementation
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gojol_notebook_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        Alert.alert('Success', 'Backup file downloaded successfully!');
        return;
      }

      // Native mobile file export
      const fileUri = FileSystem.documentDirectory + 'gojol_notebook_backup.json';
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Gojol Notebook Backup',
          UTI: 'public.json'
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device.');
      }
    } catch (e) {
      console.error("Export failed:", e);
      Alert.alert('Error', 'Failed to export backup.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsLoading(true);
      const fileUri = result.assets[0].uri;
      let fileContent = '';

      if (Platform.OS === 'web') {
        // Web browser reader implementation using native fetch
        const response = await fetch(fileUri);
        fileContent = await response.text();
      } else {
        // Native mobile file reader
        fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      }

      const importResult = await importDatabase(fileContent);
      if (importResult.success) {
        Alert.alert('Success', `Successfully imported and restored ${importResult.count} songs! Data will sync to Supabase in the background.`);
      }
    } catch (e) {
      console.error("Import failed:", e);
      Alert.alert('Import Failed', 'Please ensure the selected file is a valid Gojol Notebook backup JSON file.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmptyComponent = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Music size={48} color={colors.textSecondary} style={{ marginBottom: 12, opacity: 0.5 }} />
        <Text style={[styles.emptyText, { color: colors.text }]}>
          {adminTab === 'approved' ? 'No Gojols Found' : 'No Pending Submissions'}
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
          {searchQuery
            ? 'Try adjusting your search query.'
            : adminTab === 'approved'
            ? 'Get started by creating your very first Gojol lyrics notebook!'
            : 'All lyrics suggested by users are currently approved!'}
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
      {/* Header configurations with dynamic admin lock icon */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={handleAdminPress} style={styles.headerRightBtn} hitSlop={10}>
              {isAdmin ? (
                <Unlock size={22} color={colors.tint} />
              ) : (
                <Lock size={22} color={colors.textSecondary} />
              )}
            </Pressable>
          ),
        }}
      />

      {/* Header Search - hide when on backup tab */}
      {!(isAdmin && adminTab === 'backup') && (
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
      )}

      {/* Admin Mode Mode Bar Tabs */}
      {isAdmin && (
        <View style={[styles.adminTabBar, { borderBottomColor: colors.border }]}>
          <Pressable
            onPress={() => setAdminTab('approved')}
            style={[
              styles.adminTab,
              adminTab === 'approved' && [styles.adminTabActive, { borderBottomColor: colors.tint }],
            ]}
          >
            <Text
              style={[
                styles.adminTabText,
                { color: adminTab === 'approved' ? colors.tint : colors.textSecondary },
              ]}
            >
              Approved
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAdminTab('pending')}
            style={[
              styles.adminTab,
              adminTab === 'pending' && [styles.adminTabActive, { borderBottomColor: colors.tint }],
            ]}
          >
            <Text
              style={[
                styles.adminTabText,
                { color: adminTab === 'pending' ? colors.tint : colors.textSecondary },
              ]}
            >
              Pending
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setAdminTab('backup')}
            style={[
              styles.adminTab,
              adminTab === 'backup' && [styles.adminTabActive, { borderBottomColor: colors.tint }],
            ]}
          >
            <Text
              style={[
                styles.adminTabText,
                { color: adminTab === 'backup' ? colors.tint : colors.textSecondary },
              ]}
            >
              Backup
            </Text>
          </Pressable>
        </View>
      )}

      {/* Main Content Areas */}
      {isAdmin && adminTab === 'backup' ? (
        // Backup / Restore Tab Screen
        <View style={styles.backupContainer}>
          <View style={[styles.backupCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.backupTitle, { color: colors.text }]}>Database Backup & Restore</Text>
            <Text style={[styles.backupDescription, { color: colors.textSecondary }]}>
              Export all local song data (including favorites and settings) into a single JSON file that you can store securely, or restore your database from an existing backup file.
            </Text>

            <View style={styles.backupActions}>
              <Pressable 
                onPress={handleExportBackup} 
                style={[styles.backupButton, { backgroundColor: colors.tint }]}
              >
                <Download size={20} color="#FFFFFF" />
                <Text style={styles.backupButtonText}>Export Backup File</Text>
              </Pressable>

              <Pressable 
                onPress={handleImportBackup} 
                style={[styles.backupButton, { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border }]}
              >
                <Upload size={20} color={colors.text} />
                <Text style={[styles.backupButtonText, { color: colors.text }]}>Import / Restore Backup</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : (
        // Standard List & Index Sidebar View
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
                  flatListRef.current?.scrollToOffset({
                    offset: info.highestMeasuredFrameIndex * 126,
                    animated: true,
                  });
                }}
                showsVerticalScrollIndicator={false}
              />

              {/* Quick-Scroll Sidebar Index */}
              {indexLetters.length > 1 && (
                <View style={[styles.indexContainer, { backgroundColor: colors.cardBackground }]}>
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
      )}

      {/* Floating Action Button (FAB) */}
      <Pressable
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/manage')}
      >
        <Plus size={24} color="#FFFFFF" />
      </Pressable>

      {/* Passcode Prompt Modal */}
      <Modal
        visible={passcodeModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPasscodeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Admin Login</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Enter passcode to enable Admin privileges.
            </Text>

            {/* Premium Input Container with Eye Icon & no borders */}
            <View style={[styles.modalInputWrapper, { backgroundColor: colors.background }]}>
              <TextInput
                style={[styles.modalInputText, { color: colors.text, outlineStyle: 'none' } as any]}
                value={passcodeInput}
                onChangeText={setPasscodeInput}
                secureTextEntry={secureTextEntry}
                keyboardType="default"
                placeholder="Enter passcode"
                placeholderTextColor={colors.textSecondary}
                autoFocus
              />
              <Pressable
                onPress={() => setSecureTextEntry(prev => !prev)}
                style={styles.eyeButton}
                hitSlop={8}
              >
                {secureTextEntry ? (
                  <Eye size={18} color={colors.textSecondary} />
                ) : (
                  <EyeOff size={18} color={colors.textSecondary} />
                )}
              </Pressable>
            </View>

            <View style={styles.modalButtons}>
              <Pressable
                onPress={() => setPasscodeModalVisible(false)}
                style={[styles.modalBtn, { backgroundColor: colors.background }]}
              >
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleLoginSubmit}
                style={[styles.modalBtn, { backgroundColor: colors.tint }]}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>Login</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRightBtn: {
    padding: 8,
    marginRight: 8,
  },
  adminTabBar: {
    flexDirection: 'row',
    height: 44,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  adminTab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  adminTabActive: {
    borderBottomWidth: 2,
  },
  adminTabText: {
    fontSize: 14,
    fontWeight: '600',
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
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingVertical: 8,
    // Subtle shadow and no border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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
    right: 48,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    // Soft shadow without border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  modalInputText: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontFamily: 'System',
  },
  eyeButton: {
    padding: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Backup / Restore Tab Styles
  backupContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  backupCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    // Soft shadow and no border
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  backupTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  backupDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  backupActions: {
    width: '100%',
    gap: 12,
  },
  backupButton: {
    width: '100%',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  backupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
