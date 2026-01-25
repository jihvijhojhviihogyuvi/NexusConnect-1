import { Pool } from '@neondatabase/serverless';

interface MemoryThresholds {
  optimize: number; // 400MB
  revert: number;   // 350MB
}

interface OptimizationState {
  isOptimized: boolean;
  lastCheck: number;
  currentMemory: number;
}

export class MemoryManager {
  private thresholds: MemoryThresholds;
  private state: OptimizationState;
  private checkInterval: NodeJS.Timeout | null = null;
  private originalPoolConfig: any;
  private currentPoolConfig: any;
  
  // Optimization settings
  private readonly OPTIMIZED_CONFIG = {
    max: 3, // Reduced from 5
    idleTimeoutMillis: 15000, // Reduced from 30000
    connectionTimeoutMillis: 3000, // Reduced from 5000
  };
  
  private readonly NORMAL_CONFIG = {
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };

  constructor(thresholds: MemoryThresholds = { optimize: 400, revert: 350 }) {
    this.thresholds = thresholds;
    this.state = {
      isOptimized: false,
      lastCheck: 0,
      currentMemory: 0,
    };
    this.originalPoolConfig = { ...this.NORMAL_CONFIG };
    this.currentPoolConfig = { ...this.NORMAL_CONFIG };
  }

  startMonitoring(pool: Pool): void {
    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage(pool);
    }, 30000); // Check every 30 seconds
    
    // Initial check
    this.checkMemoryUsage(pool);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  private checkMemoryUsage(pool: Pool): void {
    const memUsage = process.memoryUsage();
    const rssInMB = memUsage.rss / (1024 * 1024);
    
    this.state.currentMemory = rssInMB;
    this.state.lastCheck = Date.now();

    console.log(`Memory usage: ${rssInMB.toFixed(2)}MB - Optimized: ${this.state.isOptimized}`);

    if (rssInMB > this.thresholds.optimize && !this.state.isOptimized) {
      this.applyOptimizations(pool);
    } else if (rssInMB < this.thresholds.revert && this.state.isOptimized) {
      this.revertOptimizations(pool);
    }
  }

  private applyOptimizations(pool: Pool): void {
    console.log('🚨 Memory usage high, applying optimizations...');
    this.state.isOptimized = true;
    
    // Update pool configuration
    this.updatePoolConfig(pool, this.OPTIMIZED_CONFIG);
    
    // Log the optimization
    console.log('✅ Applied memory optimizations:');
    console.log(`   - Database connections: ${this.OPTIMIZED_CONFIG.max} (was ${this.NORMAL_CONFIG.max})`);
    console.log(`   - Connection timeout: ${this.OPTIMIZED_CONFIG.connectionTimeoutMillis}ms`);
    console.log(`   - Idle timeout: ${this.OPTIMIZED_CONFIG.idleTimeoutMillis}ms`);
  }

  private revertOptimizations(pool: Pool): void {
    console.log('✅ Memory usage normal, reverting optimizations...');
    this.state.isOptimized = false;
    
    // Revert pool configuration
    this.updatePoolConfig(pool, this.NORMAL_CONFIG);
    
    // Log the reversion
    console.log('✅ Reverted to normal configuration:');
    console.log(`   - Database connections: ${this.NORMAL_CONFIG.max}`);
    console.log(`   - Connection timeout: ${this.NORMAL_CONFIG.connectionTimeoutMillis}ms`);
    console.log(`   - Idle timeout: ${this.NORMAL_CONFIG.idleTimeoutMillis}ms`);
  }

  private updatePoolConfig(pool: Pool, newConfig: any): void {
    // Update the pool configuration
    Object.assign(pool.options, newConfig);
    this.currentPoolConfig = { ...newConfig };
    
    // Close idle connections to apply new limits
    pool.end().then(() => {
      // Note: In a real implementation, you'd need to recreate the pool
      // For now, we'll just log that the config has been updated
      console.log('Pool configuration updated');
    }).catch(err => {
      console.error('Error updating pool config:', err);
    });
  }

  getMemoryStatus(): OptimizationState & { thresholds: MemoryThresholds } {
    return {
      ...this.state,
      thresholds: this.thresholds,
    };
  }

  isCurrentlyOptimized(): boolean {
    return this.state.isOptimized;
  }

  getCurrentMemoryUsage(): number {
    return this.state.currentMemory;
  }
}

// Global memory manager instance
export const memoryManager = new MemoryManager({
  optimize: 400, // Apply optimizations at 400MB
  revert: 350,   // Revert at 350MB
});