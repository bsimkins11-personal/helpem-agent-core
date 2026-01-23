import Foundation
import Network
import Combine

/// Monitors network connectivity status
/// Use to prevent unnecessary API calls when offline and improve UX
@MainActor
class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()
    
    @Published private(set) var isConnected = true
    @Published private(set) var connectionType: ConnectionType = .unknown
    
    private let monitor: NWPathMonitor
    private let queue = DispatchQueue(label: "com.helpem.networkmonitor")
    
    enum ConnectionType {
        case wifi
        case cellular
        case wired
        case unknown
    }
    
    private init() {
        monitor = NWPathMonitor()
        startMonitoring()
    }
    
    deinit {
        monitor.cancel()
    }
    
    private func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            guard let self = self else { return }
            let isConnected = path.status == .satisfied
            let connectionType = self.determineConnectionType(path)
            
            Task { @MainActor in
                self.isConnected = isConnected
                self.connectionType = connectionType
                self.logConnectionChange(isConnected, type: connectionType)
            }
        }
        monitor.start(queue: queue)
    }
    
    nonisolated private func determineConnectionType(_ path: NWPath) -> ConnectionType {
        if path.usesInterfaceType(.wifi) {
            return .wifi
        } else if path.usesInterfaceType(.cellular) {
            return .cellular
        } else if path.usesInterfaceType(.wiredEthernet) {
            return .wired
        } else {
            return .unknown
        }
    }
    
    private func logConnectionChange(_ isConnected: Bool, type: ConnectionType) {
        if isConnected {
            AppLogger.info("Network connected via \(type)", logger: AppLogger.general)
        } else {
            AppLogger.warning("Network disconnected", logger: AppLogger.general)
        }
    }
    
    /// Check if network is available before making requests
    func requiresConnection() throws {
        guard isConnected else {
            throw NetworkError.notConnected
        }
    }
}

// MARK: - Errors

enum NetworkError: LocalizedError {
    case notConnected
    
    var errorDescription: String? {
        switch self {
        case .notConnected:
            return "No internet connection available"
        }
    }
}
