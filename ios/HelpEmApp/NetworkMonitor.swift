// NetworkMonitor.swift
// Monitor network connectivity and connection type

import Foundation
import Network
import Combine

/// Monitors network reachability and connection type
/// Use to provide better UX when offline or on poor connection
@MainActor
final class NetworkMonitor: ObservableObject {
    
    // MARK: - Singleton
    
    static let shared = NetworkMonitor()
    
    // MARK: - Published Properties
    
    @Published private(set) var isConnected = true
    @Published private(set) var connectionType: ConnectionType = .unknown
    @Published private(set) var isExpensive = false
    @Published private(set) var isConstrained = false
    
    // MARK: - Private Properties
    
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "ai.helpem.network.monitor")
    
    // MARK: - Types
    
    enum ConnectionType {
        case wifi
        case cellular
        case wiredEthernet
        case other
        case unknown
        
        var displayName: String {
            switch self {
            case .wifi: return "Wi-Fi"
            case .cellular: return "Cellular"
            case .wiredEthernet: return "Ethernet"
            case .other: return "Connected"
            case .unknown: return "Unknown"
            }
        }
        
        var isReliable: Bool {
            switch self {
            case .wifi, .wiredEthernet: return true
            case .cellular, .other, .unknown: return false
            }
        }
    }
    
    // MARK: - Initialization
    
    private init() {
        startMonitoring()
    }
    
    deinit {
        stopMonitoring()
    }
    
    // MARK: - Monitoring
    
    private func startMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self = self else { return }
                
                // Update connection status
                self.isConnected = path.status == .satisfied
                
                // Update connection type
                if path.status == .satisfied {
                    if path.usesInterfaceType(.wifi) {
                        self.connectionType = .wifi
                    } else if path.usesInterfaceType(.cellular) {
                        self.connectionType = .cellular
                    } else if path.usesInterfaceType(.wiredEthernet) {
                        self.connectionType = .wiredEthernet
                    } else {
                        self.connectionType = .other
                    }
                } else {
                    self.connectionType = .unknown
                }
                
                // Update connection characteristics
                self.isExpensive = path.isExpensive
                self.isConstrained = path.isConstrained
                
                // Log changes
                self.logConnectionChange(path)
            }
        }
        
        monitor.start(queue: queue)
        AppLogger.info("Network monitoring started", logger: AppLogger.network)
    }
    
    private func stopMonitoring() {
        monitor.cancel()
        AppLogger.info("Network monitoring stopped", logger: AppLogger.network)
    }
    
    private func logConnectionChange(_ path: NWPath) {
        if path.status == .satisfied {
            var details = "Connected via \(connectionType.displayName)"
            if isExpensive {
                details += " (expensive)"
            }
            if isConstrained {
                details += " (constrained)"
            }
            AppLogger.info(details, logger: AppLogger.network)
        } else {
            AppLogger.warning("Network disconnected", logger: AppLogger.network)
        }
    }
    
    // MARK: - Public Methods
    
    /// Check if network is suitable for large downloads/uploads
    var isSuitableForLargeTransfers: Bool {
        isConnected && connectionType.isReliable && !isConstrained
    }
    
    /// Get user-facing connection status message
    var statusMessage: String {
        if !isConnected {
            return "No internet connection"
        }
        
        var message = "Connected"
        if !connectionType.isReliable {
            message += " (limited)"
        }
        if isExpensive {
            message += " • Cellular data charges may apply"
        }
        if isConstrained {
            message += " • Slow connection"
        }
        
        return message
    }
}
