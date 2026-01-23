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
            Task { @MainActor in
                self?.isConnected = path.status == .satisfied
                self?.updateConnectionType(path)
            }
        }
        monitor.start(queue: queue)
    }
    
    private func updateConnectionType(_ path: NWPath) {
        if path.usesInterfaceType(.wifi) {
            connectionType = .wifi
        } else if path.usesInterfaceType(.cellular) {
            connectionType = .cellular
        } else if path.usesInterfaceType(.wiredEthernet) {
            connectionType = .wired
        } else {
            connectionType = .unknown
        }
        
        // Log connectivity changes
        if isConnected {
            AppLogger.info("Network connected via \(connectionType)", logger: AppLogger.general)
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
