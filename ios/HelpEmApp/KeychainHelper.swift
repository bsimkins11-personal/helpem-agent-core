// KeychainHelper.swift
// Secure storage for session tokens

import Foundation
import Security

final class KeychainHelper {
    static let shared = KeychainHelper()
    private init() {}

    private enum Keys {
        static let sessionToken = "com.helpem.agent.sessionToken"
        static let appleUserId = "com.helpem.agent.appleUserId"
        static let userId = "com.helpem.agent.userId"
    }

    var sessionToken: String? {
        get { read(key: Keys.sessionToken) }
        set { write(key: Keys.sessionToken, value: newValue) }
    }

    var appleUserId: String? {
        get { read(key: Keys.appleUserId) }
        set { write(key: Keys.appleUserId, value: newValue) }
    }

    var userId: String? {
        get { read(key: Keys.userId) }
        set { write(key: Keys.userId, value: newValue) }
    }

    var isAuthenticated: Bool {
        sessionToken != nil && appleUserId != nil
    }

    func clearAll() {
        sessionToken = nil
        appleUserId = nil
        userId = nil
    }

    private func write(key: String, value: String?) {
        if let value {
            save(key: key, value: value)
        } else {
            delete(key: key)
        }
    }

    private func save(key: String, value: String) {
        guard let data = value.data(using: .utf8) else { return }
        delete(key: key)

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]

        SecItemAdd(query as CFDictionary, nil)
    }

    private func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }

        return value
    }

    private func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }
}
