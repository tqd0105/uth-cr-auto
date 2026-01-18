import { getUTHApi } from './uth-api';
import { userConfigDb, registrationScheduleDb, registrationLogDb } from '../db-postgres';
import { RegistrationStatus } from '../types/uth';
import { emailService } from './email';

interface SchedulerConfig {
  userSession: string;
  courseCode: string;
  courseName: string;
  classId: string;
  classCode: string;
  scheduleTime: Date;
  maxRetries?: number;
  retryDelay?: number; // in milliseconds
}

interface SchedulerResult {
  success: boolean;
  message: string;
  registrationId?: number;
}

// Retry configuration - aggressive retry for server overload situations
const RETRY_CONFIG = {
  baseDelay: 500,      // Start with 500ms delay
  maxDelay: 5000,      // Max 5 seconds between retries
  multiplier: 1.5,     // Increase delay by 1.5x each retry
  maxRetries: 10       // Default 10 retries
};

class AutoRegistrationScheduler {
  private runningJobs: Map<number, NodeJS.Timeout> = new Map();
  private isProcessing: boolean = false;

  /**
   * Schedule a new auto registration
   */
  async scheduleRegistration(config: SchedulerConfig): Promise<SchedulerResult> {
    try {
      // Validate user session
      const userConfig = await userConfigDb.findBySession(config.userSession);
      if (!userConfig) {
        return {
          success: false,
          message: 'Phiên đăng nhập không hợp lệ'
        };
      }

      // Insert schedule into database
      const result = await registrationScheduleDb.insert({
        user_session: config.userSession,
        course_code: config.courseCode,
        course_name: config.courseName,
        class_id: config.classId,
        class_code: config.classCode,
        schedule_time: config.scheduleTime.toISOString(),
        status: RegistrationStatus.PENDING,
        retry_count: 0,
        max_retries: config.maxRetries || RETRY_CONFIG.maxRetries
      });

      const scheduleId = result.lastInsertRowid as number;

      // Calculate time difference
      const now = new Date();
      const timeDiff = config.scheduleTime.getTime() - now.getTime();

      console.log(`[Scheduler] New schedule created:`, {
        scheduleId,
        scheduleTime: config.scheduleTime.toISOString(),
        scheduleTimeLocal: config.scheduleTime.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        nowUTC: now.toISOString(),
        nowLocal: now.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        timeDiffMs: timeDiff,
        timeDiffMinutes: Math.round(timeDiff / 60000)
      });

      // Only execute immediately if schedule time is in the past
      // Changed from 60000 (1 min) to 0 to prevent premature execution
      if (timeDiff <= 0) {
        console.log(`[Scheduler] Schedule time is in the past, executing immediately`);
        this.executeRegistration(scheduleId);
      } else {
        console.log(`[Scheduler] Scheduling for ${Math.round(timeDiff / 60000)} minutes from now`);
        // Note: setTimeout may not work reliably in serverless environment
        // The polling mechanism in checkAndExecutePendingSchedules will handle execution
        const timeout = setTimeout(() => {
          this.executeRegistration(scheduleId);
        }, timeDiff);

        this.runningJobs.set(scheduleId, timeout);
      }

      return {
        success: true,
        message: 'Đã lên lịch đăng ký tự động',
        registrationId: scheduleId
      };
    } catch (error) {
      console.error('Schedule registration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi không xác định'
      };
    }
  }

  /**
   * Execute a scheduled registration
   */
  private async executeRegistration(scheduleId: number): Promise<void> {
    try {
      console.log(`[Scheduler] Starting execution for schedule ID: ${scheduleId}`);
      
      // Get schedule from database by ID
      const schedule = await registrationScheduleDb.findById(scheduleId);

      if (!schedule) {
        console.error(`[Scheduler] Schedule ${scheduleId} not found in database`);
        return;
      }

      console.log(`[Scheduler] Found schedule:`, {
        id: schedule.id,
        courseCode: schedule.course_code,
        className: schedule.course_name,
        classCode: schedule.class_code,
        classId: schedule.class_id,
        status: schedule.status
      });

      // Update status to running
      await registrationScheduleDb.updateStatus(scheduleId, RegistrationStatus.RUNNING);

      // Get user cookies
      const userConfig = await userConfigDb.findBySession(schedule.user_session);
      if (!userConfig) {
        await registrationScheduleDb.updateStatus(
          scheduleId, 
          RegistrationStatus.FAILED, 
          'Phiên đăng nhập không hợp lệ'
        );
        return;
      }

      // Create UTH API instance with token
      const savedData = JSON.parse(userConfig.uth_cookies);
      const { authToken, ...cookies } = savedData;
      const uthApi = getUTHApi(cookies, authToken);

      console.log(`[Scheduler] Attempting registration for class ${schedule.class_id}`);
      console.log(`[Scheduler] Course: ${schedule.course_name}, Class: ${schedule.class_code}`);

      // First, check if already registered (in case of retry)
      try {
        const registeredCourses = await uthApi.getRegisteredCourses(75); // idDot = 75
        const alreadyRegistered = registeredCourses.some(
          (course) => course.maLopHocPhan === schedule.class_code
        );

        if (alreadyRegistered) {
          console.log(`[Scheduler] Class ${schedule.class_code} already registered! Marking as success.`);
          await registrationScheduleDb.updateStatus(scheduleId, RegistrationStatus.SUCCESS);
          
          // Log success
          await registrationLogDb.insert({
            user_session: schedule.user_session,
            action: 'register',
            course_name: schedule.course_name,
            class_code: schedule.class_code,
            status: 'success',
            message: 'Đã đăng ký thành công (phát hiện từ danh sách đã đăng ký)'
          });

          // Send success email notification
          if (userConfig.notification_email) {
            await emailService.sendRegistrationSuccess(
              userConfig.notification_email,
              schedule.course_name,
              schedule.class_code
            );
          }
          return; // Exit early - no need to try registering again
        }
      } catch (checkError) {
        console.log(`[Scheduler] Could not check registered courses, proceeding with registration`);
      }

      // Attempt registration
      // Note: UTH Portal may or may not require valid reCAPTCHA for registration
      // We'll try with an empty string first, as some APIs don't validate it strictly
      try {
        const success = await uthApi.registerForClass({
          idLopHocPhan: parseInt(schedule.class_id),
          'g-recaptcha-response': '' // Try with empty string
        });

        if (success) {
          console.log(`[Scheduler] Registration successful for schedule ${scheduleId}`);
          await registrationScheduleDb.updateStatus(scheduleId, RegistrationStatus.SUCCESS);
          
          // Log success
          await registrationLogDb.insert({
            user_session: schedule.user_session,
            action: 'register',
            course_name: schedule.course_name,
            class_code: schedule.class_code,
            status: 'success',
            message: 'Đăng ký tự động thành công'
          });

          // Send success email notification
          if (userConfig.notification_email) {
            await emailService.sendRegistrationSuccess(
              userConfig.notification_email,
              schedule.course_name,
              schedule.class_code
            );
          }
        } else {
          throw new Error('Đăng ký không thành công - API returned false');
        }
      } catch (regError) {
        console.error(`[Scheduler] Registration error:`, regError);
        throw regError;
      }

    } catch (error) {
      console.error(`Registration execution error for schedule ${scheduleId}:`, error);
      
      // Handle retry logic
      await this.handleRetry(scheduleId, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      // Remove from running jobs
      this.runningJobs.delete(scheduleId);
    }
  }

  /**
   * Handle retry logic for failed registrations
   * Uses aggressive retry with shorter delays for server overload situations
   */
  private async handleRetry(scheduleId: number, errorMessage: string): Promise<void> {
    const schedule = await registrationScheduleDb.findById(scheduleId);

    if (!schedule) {
      console.error(`[Scheduler] Retry: Schedule ${scheduleId} not found`);
      return;
    }

    const maxRetries = schedule.max_retries || RETRY_CONFIG.maxRetries;
    const userConfig = await userConfigDb.findBySession(schedule.user_session);
    
    if (schedule.retry_count < maxRetries) {
      // Schedule retry
      await registrationScheduleDb.updateStatus(
        scheduleId, 
        RegistrationStatus.RETRY, 
        errorMessage, 
        true // increment retry count
      );

      // Calculate retry delay - aggressive but with backoff
      // Starts at 500ms, increases by 1.5x each retry, max 5 seconds
      const retryDelay = Math.min(
        RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.multiplier, schedule.retry_count),
        RETRY_CONFIG.maxDelay
      );
      
      console.log(`[Scheduler] Retrying in ${retryDelay}ms (attempt ${schedule.retry_count + 1}/${maxRetries})`);
      
      const timeout = setTimeout(() => {
        this.executeRegistration(scheduleId);
      }, retryDelay);

      this.runningJobs.set(scheduleId, timeout);
    } else {
      // Max retries reached
      await registrationScheduleDb.updateStatus(
        scheduleId, 
        RegistrationStatus.FAILED, 
        `Đã thử ${maxRetries} lần nhưng không thành công: ${errorMessage}`
      );

      // Log failure
      if (userConfig) {
        await registrationLogDb.insert({
          user_session: schedule.user_session,
          action: 'register',
          course_name: schedule.course_name,
          class_code: schedule.class_code,
          status: 'failed',
          message: `Đăng ký tự động thất bại sau ${maxRetries} lần thử: ${errorMessage}`
        });

        // Send failure email notification
        if (userConfig.notification_email) {
          await emailService.sendRegistrationFailed(
            userConfig.notification_email,
            schedule.course_name,
            schedule.class_code,
            errorMessage,
            schedule.retry_count,
            maxRetries
          );
        }
      }
    }
  }

  /**
   * Cancel a scheduled registration
   */
  async cancelSchedule(scheduleId: number): Promise<boolean> {
    const timeout = this.runningJobs.get(scheduleId);
    
    if (timeout) {
      clearTimeout(timeout);
      this.runningJobs.delete(scheduleId);
    }

    await registrationScheduleDb.delete(scheduleId);
    return true;
  }

  /**
   * Get all schedules for a user
   */
  async getUserSchedules(userSession: string) {
    return await registrationScheduleDb.findByUserSession(userSession);
  }

  /**
   * Check and execute pending schedules for a user (polling-based)
   * This is called every time the scheduler API is polled
   */
  async checkAndExecutePendingSchedules(userSession: string): Promise<void> {
    console.log(`[Scheduler] checkAndExecutePendingSchedules called for user session`);
    
    try {
      const schedules = await registrationScheduleDb.findByUserSession(userSession);
      const now = new Date();

      console.log(`[Scheduler] Found ${schedules.length} schedules for user`);
      console.log(`[Scheduler] Current time: ${now.toISOString()}`);

      for (const schedule of schedules) {
        console.log(`[Scheduler] Schedule ${schedule.id}: status=${schedule.status}, time=${schedule.schedule_time}`);
        
        // Only process pending or retry schedules
        if (schedule.status !== 'pending' && schedule.status !== 'retry') {
          console.log(`[Scheduler] Skipping schedule ${schedule.id} - status is ${schedule.status}`);
          continue;
        }

        const scheduleTime = new Date(schedule.schedule_time);
        console.log(`[Scheduler] Schedule time: ${scheduleTime.toISOString()}, Now: ${now.toISOString()}`);
        console.log(`[Scheduler] Time comparison: scheduleTime (${scheduleTime.getTime()}) <= now (${now.getTime()}) = ${scheduleTime.getTime() <= now.getTime()}`);
        
        // If schedule time has passed, execute it
        if (scheduleTime.getTime() <= now.getTime()) {
          console.log(`[Scheduler] *** EXECUTING overdue schedule ${schedule.id} for course ${schedule.course_name} ***`);
          
          // Check if not already being executed (avoid duplicate execution)
          if (!this.runningJobs.has(schedule.id)) {
            // Mark as running to prevent duplicate execution
            this.runningJobs.set(schedule.id, setTimeout(() => {}, 0));
            
            // Execute registration
            await this.executeRegistration(schedule.id);
          } else {
            console.log(`[Scheduler] Schedule ${schedule.id} is already running, skipping`);
          }
        } else {
          console.log(`[Scheduler] Schedule ${schedule.id} not due yet. Will run at ${scheduleTime.toLocaleString('vi-VN')}`);
        }
      }
    } catch (error) {
      console.error('[Scheduler] Error checking pending schedules:', error);
    }
  }

  /**
   * Process all pending schedules (call on server startup)
   */
  async processPendingSchedules(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;

    try {
      const pendingSchedules = await registrationScheduleDb.findPending();

      for (const schedule of pendingSchedules) {
        const scheduleTime = new Date(schedule.schedule_time);
        const now = new Date();
        const timeDiff = scheduleTime.getTime() - now.getTime();

        if (timeDiff <= 0) {
          // Execute immediately
          this.executeRegistration(schedule.id);
        } else {
          // Schedule for later
          const timeout = setTimeout(() => {
            this.executeRegistration(schedule.id);
          }, timeDiff);

          this.runningJobs.set(schedule.id, timeout);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Stop all running jobs
   */
  stopAll(): void {
    for (const [id, timeout] of this.runningJobs) {
      clearTimeout(timeout);
    }
    this.runningJobs.clear();
  }
}

// Export singleton instance
export const autoRegistrationScheduler = new AutoRegistrationScheduler();

// Export types
export type { SchedulerConfig, SchedulerResult };