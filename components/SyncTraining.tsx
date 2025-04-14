import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform } from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { colors } from '@/constants/colors';
import { useFitnessStore } from '@/store/fitness-store';
import { useHolobotStore } from '@/store/holobot-store';
import { Activity, Timer, AlertCircle, Trophy } from 'lucide-react-native';

// Training duration in minutes by rank
const RANK_DURATIONS = {
  common: 5,
  rare: 10,
  elite: 15,
  legendary: 20,
};

// Speed limits in km/h
const SPEED_LIMITS = {
  min: 3,
  max: 10,
};

interface SyncTrainingProps {
  style?: any;
}

export function SyncTraining({ style }: SyncTrainingProps) {
  const { 
    hasHealthPermission,
    healthConnection,
    isLoading: fitnessLoading,
  } = useFitnessStore();

  const {
    holobot,
    isLoading: holobotLoading,
  } = useHolobotStore();

  const [isTraining, setIsTraining] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentStats, setCurrentStats] = useState({
    steps: 0,
    distance: 0,
    speed: 0,
    isValidSpeed: true,
  });

  // Get max duration based on holobot rank
  const getMaxDuration = () => {
    if (!holobot) return RANK_DURATIONS.common;
    return RANK_DURATIONS[holobot.rank.toLowerCase() as keyof typeof RANK_DURATIONS] || RANK_DURATIONS.common;
  };

  const handleStartTraining = async () => {
    if (!hasHealthPermission) {
      Alert.alert(
        "Health Not Connected",
        "Please connect to Health services to start training.",
        [{ text: "OK" }]
      );
      return;
    }

    if (!holobot) {
      Alert.alert(
        "No Holobot Selected",
        "Please select a Holobot to start training with.",
        [{ text: "OK" }]
      );
      return;
    }

    // Start training session
    setIsTraining(true);
    setTimeRemaining(getMaxDuration() * 60); // Convert to seconds
    // TODO: Start tracking steps and speed
  };

  const handleStopTraining = () => {
    if (!isTraining) return;

    Alert.alert(
      "End Training?",
      "Are you sure you want to end your training session early? You'll only receive rewards for the time completed.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "End Training", 
          style: "destructive",
          onPress: endTrainingSession 
        }
      ]
    );
  };

  const endTrainingSession = async () => {
    setIsTraining(false);
    // TODO: Calculate and submit rewards
    showTrainingSummary();
  };

  const showTrainingSummary = () => {
    // TODO: Show training summary modal
  };

  useEffect(() => {
    if (!isTraining) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          endTrainingSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTraining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card style={[styles.container, style]}>
      <View style={styles.header}>
        <Activity size={24} color={colors.primary} />
        <Text style={styles.title}>Sync Training</Text>
      </View>

      {!hasHealthPermission ? (
        <View style={styles.warningContainer}>
          <AlertCircle size={20} color={colors.warning} />
          <Text style={styles.warningText}>
            Connect to Health services to start training
          </Text>
        </View>
      ) : !holobot ? (
        <View style={styles.warningContainer}>
          <AlertCircle size={20} color={colors.warning} />
          <Text style={styles.warningText}>
            Select a Holobot to start training
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Train with your Holobot to earn rewards! Keep your pace between {SPEED_LIMITS.min}-{SPEED_LIMITS.max} km/h.
            </Text>
            <View style={styles.durationInfo}>
              <Timer size={16} color={colors.textSecondary} />
              <Text style={styles.durationText}>
                Max duration: {getMaxDuration()} minutes
              </Text>
            </View>
          </View>

          {isTraining ? (
            <View style={styles.trainingContainer}>
              <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
              
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Steps</Text>
                  <Text style={styles.statValue}>{currentStats.steps}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Speed</Text>
                  <Text style={[
                    styles.statValue,
                    !currentStats.isValidSpeed && styles.invalidSpeed
                  ]}>
                    {currentStats.speed.toFixed(1)} km/h
                  </Text>
                </View>
              </View>

              <Button
                title="Stop Training"
                onPress={handleStopTraining}
                variant="danger"
                loading={fitnessLoading}
                style={styles.actionButton}
              />
            </View>
          ) : (
            <Button
              title="Start Training"
              onPress={handleStartTraining}
              variant="primary"
              loading={fitnessLoading || holobotLoading}
              icon={<Trophy size={16} color={colors.text} />}
              style={styles.actionButton}
            />
          )}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningBg,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    color: colors.warning,
    flex: 1,
  },
  infoContainer: {
    marginBottom: 16,
  },
  infoText: {
    color: colors.textSecondary,
    marginBottom: 8,
  },
  durationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationText: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  trainingContainer: {
    alignItems: 'center',
    gap: 16,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  invalidSpeed: {
    color: colors.danger,
  },
  actionButton: {
    width: '100%',
  },
}); 