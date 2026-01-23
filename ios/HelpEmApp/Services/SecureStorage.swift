import Foundation
import Security

/// Secure storage for sensitive data using iOS Keychain
/// Encrypts data before storage, preventing exposure in device backups or memory dumps
/// 
/// Use this instead of UserDefaults for:
/// - Pending operations (contains idempotency keys and tribe IDs)
/// - Suppression list (contains user IDs and item IDs)
/// - Any data that could be used to identify users or their actions
final class SecureStorage {
    static let shared = SecureStorage()
    private init() {}
    
    /// Save Codable data to secure storage
    func save<T: Codable>(_ value: T, forKey key: String) throws {
        let data = try JSONEncoder().encode(value)
        try saveData(data, forKey: key)
    }
    
    /// Load Codable data from secure storage
    func load<T: Codable>(forKey key: String, as type: T.Type) throws -> T? {
        guard let data = try loadData(forKey: key) else {
            return nil
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    
    /// Delete data from secure storage
    func delete(forKey key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: "com.helpem.securestorage"
        ]
        SecItemDelete(query as CFDictionary)
    }
    
    /// Clear all secure storage (for logout or reset)
    func clearAll() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "com.helpem.securestorage"
        ]
        SecItemDelete(query as CFDictionary)
    }
    
    // MARK: - Private Methods
    
    private func saveData(_ data: Data, forKey key: String) throws {
        // Delete existing entry first
        delete(forKey: key)
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: "com.helpem.securestorage",
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecAttrSynchronizable as String: false // Don't sync to iCloud
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        
        guard status == errSecSuccess else {
            throw SecureStorageError.saveFailed(status)
        }
    }
    
    private func loadData(forKey key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: "com.helpem.securestorage",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecItemNotFound {
            return nil
        }
        
        guard status == errSecSuccess else {
            throw SecureStorageError.loadFailed(status)
        }
        
        return result as? Data
    }
}

// MARK: - Errors

enum SecureStorageError: LocalizedError {
    case saveFailed(OSStatus)
    case loadFailed(OSStatus)
    
    var errorDescription: String? {
        switch self {
        case .saveFailed(let status):
            return "Failed to save to secure storage. Status: \(status)"
        case .loadFailed(let status):
            return "Failed to load from secure storage. Status: \(status)"
        }
    }
}
