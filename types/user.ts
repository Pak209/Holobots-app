export interface User {
  id: string;
  email: string;
  username: string;
  walletAddress?: string;
  holosTokens: number;
  gachaTickets: number;
  dailyEnergy: number;
  maxDailyEnergy: number;
  lastEnergyRefresh?: string;
  energyRefills: number;
  arenaPasses: number;
  expBoosters: number;
  rankSkips: number;
  holobots?: any[];
  blueprints?: Record<string, number>;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface UserStats {
  totalBattles?: number;
  wins: number;
  losses: number;
  draws?: number;
  totalSteps?: number;
  totalSyncPoints?: number;
  highestWinStreak?: number;
}

export interface UserPreferences {
  notifications: boolean;
  theme: 'light' | 'dark';
  sound: boolean;
  vibration: boolean;
}

export interface UserProfile extends User {
  avatarUrl?: string;
  bio?: string;
  level: number;
  experience: number;
  achievements: Achievement[];
  stats: UserStats;
  preferences: UserPreferences;
  player_rank: 'Rookie' | 'Scout' | 'Champion' | 'Elite' | 'Legend' | 'Mythic';
  prestige_count: number;
}

export interface Quest {
  id: string;
  startTime: string;
  endTime: string;
  type: 'exploration' | 'boss';
  difficulty: 'easy' | 'medium' | 'hard' | 'boss';
}