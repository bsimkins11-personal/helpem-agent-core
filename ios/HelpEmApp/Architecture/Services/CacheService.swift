import Foundation

// MARK: - Cache Service

/// Thread-safe cache service with TTL support
@globalActor
actor CacheService {
    static let shared = CacheService()
    
    private var cache: [String: CacheEntry] = [:]
    private let cleanupInterval: TimeInterval = 300 // 5 minutes
    
    private struct CacheEntry {
        let value: Any
        let expiresAt: Date
    }
    
    private init() {
        // Start cleanup timer
        Task {
            await scheduleCleanup()
        }
    }
    
    /// Store a value in cache with TTL (time to live in seconds)
    func set(_ key: String, value: Any, ttl: TimeInterval) {
        let expiresAt = Date().addingTimeInterval(ttl)
        cache[key] = CacheEntry(value: value, expiresAt: expiresAt)
    }
    
    /// Retrieve a value from cache
    func get(_ key: String) -> Any? {
        guard let entry = cache[key] else {
            return nil
        }
        
        // Check if expired
        if Date() > entry.expiresAt {
            cache.removeValue(forKey: key)
            return nil
        }
        
        return entry.value
    }
    
    /// Check if a cache entry is expired
    func isExpired(_ key: String) -> Bool {
        guard let entry = cache[key] else {
            return true
        }
        return Date() > entry.expiresAt
    }
    
    /// Invalidate (remove) a specific cache entry
    func invalidate(_ key: String) {
        cache.removeValue(forKey: key)
    }
    
    /// Invalidate all cache entries matching a pattern
    func invalidatePattern(_ pattern: String) {
        let keysToRemove = cache.keys.filter { $0.contains(pattern) }
        keysToRemove.forEach { cache.removeValue(forKey: $0) }
    }
    
    /// Clear all cache
    func clearAll() {
        cache.removeAll()
    }
    
    /// Get cache statistics
    func getStats() -> CacheStats {
        let now = Date()
        let validEntries = cache.values.filter { now <= $0.expiresAt }.count
        let expiredEntries = cache.count - validEntries
        
        return CacheStats(
            totalEntries: cache.count,
            validEntries: validEntries,
            expiredEntries: expiredEntries
        )
    }
    
    // MARK: - Private Methods
    
    private func scheduleCleanup() async {
        while true {
            try? await Task.sleep(nanoseconds: UInt64(cleanupInterval * 1_000_000_000))
            await cleanup()
        }
    }
    
    private func cleanup() {
        let now = Date()
        let expiredKeys = cache.filter { now > $0.value.expiresAt }.map { $0.key }
        expiredKeys.forEach { cache.removeValue(forKey: $0) }
        
        // Log on main actor if there were expired keys
        let count = expiredKeys.count
        if count > 0 {
            Task { @MainActor in
                AppLogger.info("Cache cleanup: removed \(count) expired entries", logger: AppLogger.general)
            }
        }
    }
}

// MARK: - Cache Statistics

struct CacheStats {
    let totalEntries: Int
    let validEntries: Int
    let expiredEntries: Int
    
    var hitRate: Double {
        guard totalEntries > 0 else { return 0 }
        return Double(validEntries) / Double(totalEntries)
    }
}
