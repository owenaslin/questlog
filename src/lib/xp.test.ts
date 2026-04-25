import { describe, it, expect } from 'vitest';
import {
  DIFF_MOD,
  calcSideQuestXP,
  calcMainQuestXP,
  calcHabitXP,
  calcQuestXP,
  clamp,
  durationLabelToMinutes,
  DURATION_MINUTES_MAP,
} from './xp';

describe('XP Calculation', () => {
  describe('DIFF_MOD', () => {
    it('has correct difficulty modifiers', () => {
      expect(DIFF_MOD[1]).toBe(1.0);
      expect(DIFF_MOD[2]).toBe(1.25);
      expect(DIFF_MOD[3]).toBe(1.5);
      expect(DIFF_MOD[4]).toBe(1.75);
      expect(DIFF_MOD[5]).toBe(2.0);
    });
  });

  describe('calcSideQuestXP', () => {
    it('calculates basic side quest XP correctly', () => {
      // 30 min × 5 × 1.0 = 150, rounded to 25 = 150
      expect(calcSideQuestXP(30, 1)).toBe(150);
    });

    it('applies difficulty modifier', () => {
      // 30 min × 5 × 1.5 = 225
      expect(calcSideQuestXP(30, 3)).toBe(225);
    });

    it('respects minimum XP', () => {
      expect(calcSideQuestXP(1, 1)).toBe(25);
    });

    it('respects maximum XP', () => {
      // Very long quest should be clamped
      expect(calcSideQuestXP(10000, 5)).toBe(2500);
    });

    it('uses default modifier for invalid difficulty', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(calcSideQuestXP(60, 10 as any)).toBe(300);
    });
  });

  describe('calcMainQuestXP', () => {
    it('calculates basic main quest XP correctly', () => {
      // 2400 min × 0.5 × 1.0 = 1200, rounded to 50 = 1200
      const result = calcMainQuestXP(2400, 1);
      expect(result).toBe(1200);
    });

    it('respects minimum XP', () => {
      expect(calcMainQuestXP(1, 1)).toBe(100);
    });

    it('respects maximum XP', () => {
      expect(calcMainQuestXP(30000, 5)).toBe(8000);
    });
  });

  describe('calcHabitXP', () => {
    it('calculates basic habit XP correctly', () => {
      // 60 min × 2 × 1.0 = 120, rounded to 5 = 120
      expect(calcHabitXP(60, 1)).toBe(120);
    });

    it('respects minimum XP', () => {
      expect(calcHabitXP(1, 1)).toBe(5);
    });

    it('respects maximum XP', () => {
      expect(calcHabitXP(1000, 5)).toBe(300);
    });
  });

  describe('calcQuestXP', () => {
    it('delegates to calcMainQuestXP for main quests', () => {
      expect(calcQuestXP('main', 2400, 1)).toBe(calcMainQuestXP(2400, 1));
    });

    it('delegates to calcSideQuestXP for side quests', () => {
      expect(calcQuestXP('side', 60, 1)).toBe(calcSideQuestXP(60, 1));
    });
  });

  describe('clamp', () => {
    it('returns value within range', () => {
      expect(clamp(50, 0, 100)).toBe(50);
    });

    it('clamps to minimum', () => {
      expect(clamp(-10, 0, 100)).toBe(0);
    });

    it('clamps to maximum', () => {
      expect(clamp(150, 0, 100)).toBe(100);
    });
  });

  describe('durationLabelToMinutes', () => {
    it('returns mapped value for known labels', () => {
      expect(durationLabelToMinutes('30 min')).toBe(30);
      expect(durationLabelToMinutes('1 week')).toBe(840);
      expect(durationLabelToMinutes('2 months')).toBe(4800);
    });

    it('parses numeric prefix for unknown labels', () => {
      expect(durationLabelToMinutes('5 hours')).toBe(300);
      expect(durationLabelToMinutes('3 days')).toBe(1080);
    });

    it('returns default for unparseable labels', () => {
      expect(durationLabelToMinutes('sometime')).toBe(120);
    });

    it('is case insensitive', () => {
      expect(durationLabelToMinutes('2 WEEKS')).toBe(1680);
      expect(durationLabelToMinutes('3 Months')).toBe(7200);
    });
  });

  describe('DURATION_MINUTES_MAP', () => {
    it('contains all expected ranges', () => {
      expect(DURATION_MINUTES_MAP['10-15 min']).toBeDefined();
      expect(DURATION_MINUTES_MAP['1 week']).toBeDefined();
      expect(DURATION_MINUTES_MAP['12 months']).toBeDefined();
    });
  });
});
