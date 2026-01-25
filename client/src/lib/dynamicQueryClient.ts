import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { memoryManager } from "../../server/memoryManager";

interface CacheConfig {
  staleTime: number;
  gcTime: number;
  messageCacheTime: number;
}

export class DynamicQueryClient {
  private normalConfig: CacheConfig;
  private optimizedConfig: CacheConfig;
  private currentConfig: CacheConfig;
  private queryClient: QueryClient;

  constructor() {
    this.normalConfig = {
      staleTime: 5 * 60 * 1000,    // 5 minutes
      gcTime: 10 * 60 * 1000,      // 10 minutes
      messageCacheTime: 5 * 60 * 1000, // 5 minutes
    };
    
    this.optimizedConfig = {
      staleTime: 2 * 60 * 1000,    // 2 minutes
      gcTime: 5 * 60 * 1000,       // 5 minutes
      messageCacheTime: 2 * 60 * 1000, // 2 minutes
    };
    
    this.currentConfig = { ...this.normalConfig };
    this.queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          queryFn: this.getQueryFn({ on401: "throw" }),
          refetchInterval: false,
          refetchOnWindowFocus: false,
          staleTime: this.currentConfig.staleTime,
          gcTime: this.currentConfig.gcTime,
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
  }

  private async throwIfResNotOk(res: Response) {
    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }

  private apiRequest(method: string, url: string, data?: unknown | undefined): Promise<Response> {
    return fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    }).then(this.throwIfResNotOk.bind(this));
  }

  private getQueryFn<T>(options: { on401: "returnNull" | "throw" }): QueryFunction<T> {
    return async ({ queryKey }) => {
      const res = await fetch(queryKey.join("/") as string, {
        credentials: "include",
      });

      if (options.on401 === "returnNull" && res.status === 401) {
        return null;
      }

      await this.throwIfResNotOk(res);
      return await res.json();
    };
  }

  updateConfig(): void {
    // Note: In a real implementation, you'd check memory usage from the server
    // For now, we'll use a simple approach to demonstrate the concept
    const isOptimized = this.shouldOptimize();
    const newConfig = isOptimized ? this.optimizedConfig : this.normalConfig;
    
    if (
      this.currentConfig.staleTime !== newConfig.staleTime ||
      this.currentConfig.gcTime !== newConfig.gcTime ||
      this.currentConfig.messageCacheTime !== newConfig.messageCacheTime
    ) {
      this.currentConfig = { ...newConfig };
      
      // Update the query client configuration
      this.queryClient.setDefaultOptions({
        queries: {
          staleTime: this.currentConfig.staleTime,
          gcTime: this.currentConfig.gcTime,
        },
      });
      
      console.log(`📊 Query cache updated: staleTime=${this.currentConfig.staleTime/1000}s, gcTime=${this.currentConfig.gcTime/1000}s`);
    }
  }

  private shouldOptimize(): boolean {
    // In a real implementation, this would check server memory usage
    // For now, we'll use a simple heuristic based on browser memory
    if ('memory' in performance) {
      const mem = (performance as any).memory;
      const usedMB = mem.usedJSHeapSize / (1024 * 1024);
      return usedMB > 100; // Optimize if browser JS heap > 100MB
    }
    return false;
  }

  getQueryClient(): QueryClient {
    return this.queryClient;
  }

  getCurrentConfig(): CacheConfig {
    return { ...this.currentConfig };
  }

  invalidateMessages(): void {
    this.queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
  }

  clearMessageCache(): void {
    this.queryClient.removeQueries({ queryKey: ["/api/conversations"] });
  }
}

// Global dynamic query client instance
export const dynamicQueryClient = new DynamicQueryClient();