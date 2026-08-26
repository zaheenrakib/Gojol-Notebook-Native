import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Music, Heart, Smartphone, ShieldCheck, ChevronRight } from 'lucide-react-native';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function ModalScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
      
      <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.badgeBackground }]}>
          <Music size={40} color={colors.tint} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Gojol Notebook</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Version 1.0.0 (Offline-First)</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          A beautiful, fast, and minimalist Islamic lyrics diary. Keep your favorite Hamd, Naats, and spiritual poetry safe on your device and access them anytime, even without an internet connection.
        </Text>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Features</Text>

      <View style={styles.featuresList}>
        <View style={styles.featureItem}>
          <ShieldCheck size={20} color={colors.tint} />
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>100% Offline Database</Text>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Powered by Expo SQLite Next for instant query speeds.</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Heart size={20} color={colors.tint} />
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Favorites & Filtering</Text>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Quickly pin lyrics and search by title, artist, or content.</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Smartphone size={20} color={colors.tint} />
          <View style={styles.featureTextContainer}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>Distraction-Free Reader</Text>
            <Text style={[styles.featureDesc, { color: colors.textSecondary }]}>Custom text sizing allows you to adjust the lyrics scale.</Text>
          </View>
        </View>
      </View>

      <Pressable 
        style={[styles.closeButton, { backgroundColor: colors.tint }]} 
        onPress={() => router.back()}
      >
        <Text style={styles.closeButtonText}>Done</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'flex-start',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'System',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'System',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    fontFamily: 'System',
  },
  featuresList: {
    gap: 16,
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'System',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'System',
  },
  closeButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
});

