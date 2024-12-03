interface RateLimitState {
  isLimited: boolean;
  lastErrorTime: number | null;
  cooldownPeriod: number; // in milliseconds
}

class RateLimitManager {
  private static instance: RateLimitManager;
  private state: Record<string, RateLimitState> = {};
  
  private constructor() {
    // Initialize with default state
    this.state = {
      tts: {
        isLimited: false,
        lastErrorTime: null,
        cooldownPeriod: 60 * 60 * 1000 // 1 hour in milliseconds
      }
    };
  }

  public static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  public setRateLimit(service: string): void {
    if (!this.state[service]) return;
    
    this.state[service] = {
      ...this.state[service],
      isLimited: true,
      lastErrorTime: Date.now()
    };
  }

  public checkRateLimit(service: string): { 
    isLimited: boolean; 
    remainingTime: number | null;
  } {
    const serviceState = this.state[service];
    if (!serviceState || !serviceState.isLimited || !serviceState.lastErrorTime) {
      return { isLimited: false, remainingTime: null };
    }

    const now = Date.now();
    const timeSinceError = now - serviceState.lastErrorTime;
    
    if (timeSinceError < serviceState.cooldownPeriod) {
      const remainingTime = Math.ceil((serviceState.cooldownPeriod - timeSinceError) / 1000);
      return { isLimited: true, remainingTime };
    }

    // Reset rate limit if cooldown period has passed
    this.state[service].isLimited = false;
    this.state[service].lastErrorTime = null;
    return { isLimited: false, remainingTime: null };
  }

  public getRateLimitMessage(service: string): string {
    const { remainingTime } = this.checkRateLimit(service);
    if (!remainingTime) return '';

    const minutes = Math.ceil(remainingTime / 60);
    if (minutes > 60) {
      const hours = Math.ceil(minutes / 60);
      return `Rate limit exceeded. Please try again in ${hours} hour${hours > 1 ? 's' : ''}.`;
    }
    return `Rate limit exceeded. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`;
  }
}

export const rateLimitManager = RateLimitManager.getInstance();
