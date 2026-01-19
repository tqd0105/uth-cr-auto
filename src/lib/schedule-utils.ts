/**
 * Utilities for parsing and detecting schedule conflicts
 */

export interface TimeSlot {
  day: number; // 2-8 (Thứ 2 - CN)
  startPeriod: number; // 1-15
  endPeriod: number;
  room?: string;
}

export interface ParsedSchedule {
  classCode: string;
  courseName: string;
  timeSlots: TimeSlot[];
  raw?: string;
}

export interface ScheduleConflict {
  class1: ParsedSchedule;
  class2: ParsedSchedule;
  conflictingSlots: {
    day: number;
    periods: number[];
  }[];
}

/**
 * Parse schedule string from UTH format
 * Common formats:
 * - "Thứ 2 (1-3)" 
 * - "T2 (1-3), T4 (6-8)"
 * - "2 (1-3)"
 */
export function parseScheduleString(scheduleStr: string): TimeSlot[] {
  if (!scheduleStr) return [];
  
  const slots: TimeSlot[] = [];
  
  // Split by comma or semicolon for multiple time slots
  const parts = scheduleStr.split(/[,;]/);
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    
    // Match patterns like "Thứ 2 (1-3)" or "T2 (1-3)" or "2 (1-3)"
    const dayMatch = trimmed.match(/(?:Thứ\s*)?(?:T)?(\d)(?:\s*\((\d+)-(\d+)\))?/i);
    
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      const startPeriod = dayMatch[2] ? parseInt(dayMatch[2]) : 1;
      const endPeriod = dayMatch[3] ? parseInt(dayMatch[3]) : startPeriod;
      
      // Extract room if present
      const roomMatch = trimmed.match(/phòng[:\s]*([A-Za-z0-9.-]+)/i);
      
      slots.push({
        day,
        startPeriod,
        endPeriod,
        room: roomMatch?.[1]
      });
    }
  }
  
  return slots;
}

/**
 * Check if two time slots conflict
 */
export function doTimeSlotsConflict(slot1: TimeSlot, slot2: TimeSlot): boolean {
  // Different days - no conflict
  if (slot1.day !== slot2.day) return false;
  
  // Check period overlap
  return !(slot1.endPeriod < slot2.startPeriod || slot2.endPeriod < slot1.startPeriod);
}

/**
 * Get conflicting periods between two time slots
 */
export function getConflictingPeriods(slot1: TimeSlot, slot2: TimeSlot): number[] {
  if (slot1.day !== slot2.day) return [];
  
  const periods: number[] = [];
  const start = Math.max(slot1.startPeriod, slot2.startPeriod);
  const end = Math.min(slot1.endPeriod, slot2.endPeriod);
  
  for (let i = start; i <= end; i++) {
    periods.push(i);
  }
  
  return periods;
}

/**
 * Check if two schedules conflict
 */
export function doSchedulesConflict(schedule1: ParsedSchedule, schedule2: ParsedSchedule): ScheduleConflict | null {
  const conflicts: { day: number; periods: number[] }[] = [];
  
  for (const slot1 of schedule1.timeSlots) {
    for (const slot2 of schedule2.timeSlots) {
      if (doTimeSlotsConflict(slot1, slot2)) {
        const periods = getConflictingPeriods(slot1, slot2);
        if (periods.length > 0) {
          conflicts.push({
            day: slot1.day,
            periods
          });
        }
      }
    }
  }
  
  if (conflicts.length === 0) return null;
  
  return {
    class1: schedule1,
    class2: schedule2,
    conflictingSlots: conflicts
  };
}

/**
 * Find all conflicts between a new class and existing registered classes
 */
export function findScheduleConflicts(
  newClass: ParsedSchedule,
  existingClasses: ParsedSchedule[]
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  
  for (const existing of existingClasses) {
    const conflict = doSchedulesConflict(newClass, existing);
    if (conflict) {
      conflicts.push(conflict);
    }
  }
  
  return conflicts;
}

/**
 * Format day number to Vietnamese
 */
export function formatDayVi(day: number): string {
  const days = ['', '', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];
  return days[day] || `Thứ ${day}`;
}

/**
 * Format periods to string
 */
export function formatPeriods(start: number, end: number): string {
  if (start === end) return `tiết ${start}`;
  return `tiết ${start}-${end}`;
}

/**
 * Format conflict to human readable message
 */
export function formatConflictMessage(conflict: ScheduleConflict): string {
  const slots = conflict.conflictingSlots
    .map(s => `${formatDayVi(s.day)} (tiết ${s.periods.join(', ')})`)
    .join(', ');
  
  return `Trùng lịch với "${conflict.class2.courseName}" (${conflict.class2.classCode}): ${slots}`;
}

/**
 * Parse class info to schedule
 */
export function classToSchedule(
  classCode: string,
  courseName: string,
  scheduleStr: string
): ParsedSchedule {
  return {
    classCode,
    courseName,
    timeSlots: parseScheduleString(scheduleStr),
    raw: scheduleStr
  };
}
