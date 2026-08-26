const tintColorLight = '#0D9488'; // Teal 600
const tintColorDark = '#2DD4BF';  // Teal 400

export default {
  light: {
    text: '#0F172A',            // Slate 900
    textSecondary: '#64748B',   // Slate 500
    background: '#F8FAFC',      // Slate 50 (soft background)
    cardBackground: '#FFFFFF',  // Pure white card
    tint: tintColorLight,
    tabIconDefault: '#94A3B8',  // Slate 400
    tabIconSelected: tintColorLight,
    border: '#E2E8F0',          // Slate 200
    favoriteActive: '#EF4444',  // Rose 500
    badgeBackground: '#E6F4F1', // Very light teal
    shadowColor: '#000000',
  },
  dark: {
    text: '#F8FAFC',            // Slate 50
    textSecondary: '#94A3B8',   // Slate 400
    background: '#0F172A',      // Slate 900
    cardBackground: '#1E293B',  // Slate 800
    tint: tintColorDark,
    tabIconDefault: '#475569',  // Slate 600
    tabIconSelected: tintColorDark,
    border: '#334155',          // Slate 700
    favoriteActive: '#F43F5E',  // Rose 500
    badgeBackground: '#115E59', // Teal 800
    shadowColor: '#000000',
  },
};

