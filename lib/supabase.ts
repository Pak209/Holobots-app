import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

const supabaseUrl = "https://pfpidggrdnmfgrbncpyl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcGlkZ2dyZG5tZmdyYm5jcHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3ODM5ODcsImV4cCI6MjA1NjM1OTk4N30.fyR2E6WWCGmBTK322Tre7RRMh65I55kaPHF5RYJKGgo";

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false
    }
  }
);

// Helper functions
export const updateHolobotExperience = (holobots, holobotName, newExperience, newLevel) => {
  if (!holobots || !Array.isArray(holobots)) {
    return [];
  }
  
  return holobots.map(holobot => {
    if (holobot.name.toLowerCase() === holobotName.toLowerCase()) {
      return {
        ...holobot,
        level: newLevel,
        experience: newExperience,
        nextLevelExp: calculateExperience(newLevel)
      };
    }
    return holobot;
  });
};

export const calculateExperience = (level) => {
  const BASE_XP = 100;
  return Math.floor(BASE_XP * Math.pow(level, 2));
};

export const HOLOBOT_STATS = {
  MAX_LEVEL: 50,
  BASE_HEALTH: 100,
  BASE_ATTACK: 10,
  BASE_DEFENSE: 5,
  BASE_SPEED: 8
};

// Function to get Holobot image URL
export const getHolobotImageUrl = (nameOrKey) => {
  if (!nameOrKey) return null;
  const key = nameOrKey.toLowerCase();
  return `https://pfpidggrdnmfgrbncpyl.supabase.co/storage/v1/object/public/holobots/${key}.png`;
};