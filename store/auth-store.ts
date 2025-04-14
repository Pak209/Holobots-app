import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserProfile } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthStore extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  linkWallet: (walletAddress: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// Mock user data for development/testing
const mockUser: User = {
  id: '1',
  email: 'user@example.com',
  username: 'HoloTrainer',
  walletAddress: '0x1234...5678',
  holosTokens: 5000,
  gachaTickets: 10,
  dailyEnergy: 80,
  maxDailyEnergy: 100,
  lastEnergyRefresh: new Date().toISOString(),
  energyRefills: 3,
  arenaPasses: 5,
  expBoosters: 2,
  rankSkips: 1,
  blueprints: {
    ace: 5,
    kuma: 3,
    shadow: 8,
    hare: 2,
    tora: 0
  }
};

// Mock profile data for development/testing
const mockProfile: UserProfile = {
  ...mockUser,
  avatarUrl: 'https://source.unsplash.com/random/200x200?avatar',
  bio: 'Holobot trainer and collector',
  level: 15,
  experience: 2500,
  achievements: [
    {
      id: '1',
      name: 'First Battle',
      description: 'Complete your first battle',
      completed: true,
      completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      name: 'Step Master',
      description: 'Walk 10,000 steps in a day',
      completed: false,
      progress: 8500,
      maxProgress: 10000
    }
  ],
  stats: {
    totalBattles: 25,
    wins: 15,
    losses: 8,
    draws: 2,
    totalSteps: 125000,
    totalSyncPoints: 1250,
    highestWinStreak: 5
  },
  preferences: {
    notifications: true,
    theme: 'dark',
    sound: true,
    vibration: true
  },
  player_rank: 'Rookie',
  prestige_count: 0
};

// Helper function to map database profile to our app's user profile format
const mapDatabaseToUserProfile = (data: any): UserProfile => {
  // First create a base user object with all required fields
  const baseUser: User = {
    id: data.id,
    username: data.username || 'User',
    email: data.email || '',
    holobots: data.holobots || [],
    dailyEnergy: data.daily_energy || 100,
    maxDailyEnergy: data.max_daily_energy || 100,
    holosTokens: data.holos_tokens || 0,
    gachaTickets: data.gacha_tickets || 0,
    energyRefills: data.energy_refills || 0,
    arenaPasses: data.arena_passes || 0,
    expBoosters: data.exp_boosters || 0,
    rankSkips: data.rank_skips || 0,
    lastEnergyRefresh: data.last_energy_refresh || new Date().toISOString(),
    blueprints: data.blueprints || {},
    walletAddress: data.wallet_address
  };

  // Then extend it with profile-specific fields
  return {
    ...baseUser,
    level: data.level || 1,
    experience: data.experience || 0,
    achievements: data.achievements || [],
    stats: {
      wins: data.wins || 0,
      losses: data.losses || 0,
      totalBattles: (data.wins || 0) + (data.losses || 0),
      draws: 0,
      totalSteps: 0,
      totalSyncPoints: 0,
      highestWinStreak: 0
    },
    preferences: {
      notifications: true,
      theme: 'dark',
      sound: true,
      vibration: true
    },
    avatarUrl: data.avatar_url || 'https://source.unsplash.com/random/200x200?avatar',
    bio: data.bio || 'Holobot trainer',
    player_rank: (data.player_rank || 'Rookie') as UserProfile['player_rank'],
    prestige_count: data.prestige_count || 0
  };
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      signIn: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Try to sign in with Supabase
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (error) throw new Error(error.message);
          
          if (data.user) {
            // Fetch user profile from Supabase
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();
              
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              throw new Error('Failed to load user profile');
            }
            
            // If we have profile data, use it
            if (profileData) {
              const userProfile = mapDatabaseToUserProfile(profileData);
              set({
                user: userProfile,
                profile: userProfile,
                isAuthenticated: true,
                isLoading: false
              });
              
              // Navigate to the main app
              router.replace('/(tabs)');
            } else {
              throw new Error('User profile not found');
            }
          } else {
            throw new Error('Authentication failed');
          }
        } catch (error) {
          console.error('Sign in error:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to sign in'
          });
          throw error;
        }
      },

      signUp: async (email: string, password: string, username: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Try to sign up with Supabase
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { username }
            }
          });
          
          if (error) throw new Error(error.message);
          
          if (data.user) {
            // Create a new profile in Supabase
            const newUserData = {
              id: data.user.id,
              username,
              email: data.user.email,
              holos_tokens: 1000, // Starting amount
              gacha_tickets: 5,
              daily_energy: 100,
              max_daily_energy: 100,
              last_energy_refresh: new Date().toISOString(),
              blueprints: {
                ace: 10 // Start with enough blueprints to mint Ace
              }
            };
            
            const { error: profileError } = await supabase
              .from('profiles')
              .insert(newUserData);
              
            if (profileError) {
              console.error('Error creating profile:', profileError);
              throw new Error('Failed to create user profile');
            }
            
            // Map to our app's user profile format
            const userProfile = mapDatabaseToUserProfile({
              ...newUserData,
              id: data.user.id
            });
            
            set({
              user: userProfile,
              profile: userProfile,
              isAuthenticated: true,
              isLoading: false
            });
            
            // Navigate to the main app
            router.replace('/(tabs)');
          } else {
            throw new Error('Registration failed');
          }
        } catch (error) {
          console.error('Sign up error:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to sign up'
          });
          throw error;
        }
      },

      signOut: async () => {
        try {
          set({ isLoading: true });
          
          // Sign out from Supabase
          const { error } = await supabase.auth.signOut();
          
          if (error) throw new Error(error.message);
          
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: null
          });
          
          // Navigate to the auth screen
          router.replace('/(auth)');
        } catch (error) {
          console.error('Sign out error:', error);
          
          // Still sign out even if there's an error
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to sign out'
          });
          
          // Navigate to the auth screen
          router.replace('/(auth)');
        }
      },

      resetPassword: async (email: string) => {
        try {
          set({ isLoading: true, error: null });
          
          // Send password reset email with Supabase
          const { error } = await supabase.auth.resetPasswordForEmail(email);
          
          if (error) throw new Error(error.message);
          
          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to reset password'
          });
          throw error;
        }
      },

      updateUser: async (userData: Partial<User>) => {
        try {
          const { user } = get();
          if (!user) throw new Error('User not authenticated');
          
          set({ isLoading: true, error: null });
          
          // Update user in Supabase
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Convert to database format
            const dbUpdates: any = {};
            
            if (userData.username) dbUpdates.username = userData.username;
            if (userData.holosTokens !== undefined) dbUpdates.holos_tokens = userData.holosTokens;
            if (userData.gachaTickets !== undefined) dbUpdates.gacha_tickets = userData.gachaTickets;
            if (userData.dailyEnergy !== undefined) dbUpdates.daily_energy = userData.dailyEnergy;
            if (userData.maxDailyEnergy !== undefined) dbUpdates.max_daily_energy = userData.maxDailyEnergy;
            if (userData.lastEnergyRefresh) dbUpdates.last_energy_refresh = userData.lastEnergyRefresh;
            if (userData.blueprints) dbUpdates.blueprints = userData.blueprints;
            if (userData.walletAddress) dbUpdates.wallet_address = userData.walletAddress;
            if (userData.energyRefills !== undefined) dbUpdates.energy_refills = userData.energyRefills;
            if (userData.arenaPasses !== undefined) dbUpdates.arena_passes = userData.arenaPasses;
            if (userData.expBoosters !== undefined) dbUpdates.exp_boosters = userData.expBoosters;
            if (userData.rankSkips !== undefined) dbUpdates.rank_skips = userData.rankSkips;
            
            const { error } = await supabase
              .from('profiles')
              .update(dbUpdates)
              .eq('id', session.user.id);
              
            if (error) throw new Error(error.message);
            
            // Fetch updated profile to ensure we have all the correct data
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) throw new Error(profileError.message);
            
            if (profileData) {
              const updatedProfile = mapDatabaseToUserProfile(profileData);
              set({
                user: updatedProfile,
                profile: updatedProfile,
                isLoading: false
              });
              return;
            }
          }
          
          throw new Error('Failed to update user data');
        } catch (error) {
          console.error('Update user error:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update user'
          });
          throw error;
        }
      },

      updateProfile: async (updates: Partial<UserProfile>) => {
        try {
          const { profile } = get();
          if (!profile) throw new Error('User profile not found');
          
          set({ isLoading: true, error: null });
          
          // Update profile in Supabase
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Convert to database format
            const dbUpdates: any = {};
            
            // Handle energy refill specifically
            if (updates.dailyEnergy !== undefined) {
              // If using energy refill, ensure energyRefills is decremented
              if (updates.energyRefills !== undefined && updates.energyRefills < (profile.energyRefills || 0)) {
                dbUpdates.energy_refills = updates.energyRefills;
                dbUpdates.daily_energy = profile.maxDailyEnergy; // Set to max energy when using refill
              } else {
                dbUpdates.daily_energy = updates.dailyEnergy;
              }
            }

            // Handle other standard fields
            if (updates.username) dbUpdates.username = updates.username;
            if (updates.holosTokens !== undefined) dbUpdates.holos_tokens = updates.holosTokens;
            if (updates.gachaTickets !== undefined) dbUpdates.gacha_tickets = updates.gachaTickets;
            if (updates.maxDailyEnergy !== undefined) dbUpdates.max_daily_energy = updates.maxDailyEnergy;
            if (updates.lastEnergyRefresh) dbUpdates.last_energy_refresh = updates.lastEnergyRefresh;
            if (updates.blueprints) dbUpdates.blueprints = updates.blueprints;
            if (updates.walletAddress) dbUpdates.wallet_address = updates.walletAddress;
            if (updates.energyRefills !== undefined) dbUpdates.energy_refills = updates.energyRefills;
            if (updates.arenaPasses !== undefined) dbUpdates.arena_passes = updates.arenaPasses;
            if (updates.expBoosters !== undefined) dbUpdates.exp_boosters = updates.expBoosters;
            if (updates.rankSkips !== undefined) dbUpdates.rank_skips = updates.rankSkips;
            if (updates.level !== undefined) dbUpdates.level = updates.level;
            if (updates.experience !== undefined) dbUpdates.experience = updates.experience;
            if (updates.player_rank) dbUpdates.player_rank = updates.player_rank;
            if (updates.prestige_count !== undefined) dbUpdates.prestige_count = updates.prestige_count;
            
            const { error } = await supabase
              .from('profiles')
              .update(dbUpdates)
              .eq('id', session.user.id);
              
            if (error) throw new Error(error.message);
            
            // Fetch updated profile to ensure we have all the correct data
            const { data: updatedData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) throw new Error(profileError.message);
            
            if (updatedData) {
              const updatedProfile = mapDatabaseToUserProfile(updatedData);
              set({
                user: updatedProfile,
                profile: updatedProfile,
                isLoading: false
              });
              return;
            }
          }
          
          throw new Error('Failed to update profile data');
        } catch (error) {
          console.error('Update profile error:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to update profile'
          });
          throw error;
        }
      },

      linkWallet: async (walletAddress: string) => {
        try {
          const { user } = get();
          if (!user) throw new Error('User not authenticated');
          
          set({ isLoading: true, error: null });
          
          // Update wallet address in Supabase
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            const { error } = await supabase
              .from('profiles')
              .update({ wallet_address: walletAddress })
              .eq('id', session.user.id);
              
            if (error) throw new Error(error.message);
            
            // Fetch updated profile to ensure we have all the correct data
            const { data: updatedData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) throw new Error(profileError.message);
            
            if (updatedData) {
              const updatedProfile = mapDatabaseToUserProfile(updatedData);
              set({
                user: updatedProfile,
                profile: updatedProfile,
                isLoading: false
              });
              return;
            }
          }
          
          throw new Error('Failed to update wallet address');
        } catch (error) {
          console.error('Link wallet error:', error);
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to link wallet'
          });
          throw error;
        }
      },

      refreshUser: async () => {
        try {
          set({ isLoading: true, error: null });
          
          // Get current session from Supabase
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Fetch user profile from Supabase
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
              
            if (profileError) {
              console.error('Error fetching profile:', profileError);
              throw new Error('Failed to load user profile');
            }
            
            if (profileData) {
              const userProfile = mapDatabaseToUserProfile(profileData);
              set({
                user: userProfile,
                profile: userProfile,
                isAuthenticated: true,
                isLoading: false
              });
              return;
            }
          }
          
          // If no session or profile data, user is not authenticated
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false
          });
        } catch (error) {
          console.error('Refresh user error:', error);
          set({
            user: null,
            profile: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to refresh user'
          });
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);