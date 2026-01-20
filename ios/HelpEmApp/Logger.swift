// Logger.swift
// Centralized logging using OSLog

import Foundation
import os.log

/// App-wide logging framework using Apple's unified logging system
/// Replaces print statements with proper structured logging
struct AppLogger {
    
    // MARK: - Subsystem & Categories
    
    nonisolated private static let subsystem = "ai.helpem.app"
    
    nonisolated static let auth = Logger(subsystem: subsystem, category: "auth")
    nonisolated static let network = Logger(subsystem: subsystem, category: "network")
    nonisolated static let speech = Logger(subsystem: subsystem, category: "speech")
    nonisolated static let webview = Logger(subsystem: subsystem, category: "webview")
    nonisolated static let storage = Logger(subsystem: subsystem, category: "storage")
    nonisolated static let notification = Logger(subsystem: subsystem, category: "notification")
    nonisolated static let ui = Logger(subsystem: subsystem, category: "ui")
    nonisolated static let general = Logger(subsystem: subsystem, category: "general")
    
    // MARK: - Convenience Methods
    
    /// Log debug information (only visible in debug builds)
    static func debug(_ message: String, logger: Logger = AppLogger.general, file: String = #file, function: String = #function, line: Int = #line) {
        #if DEBUG
        logger.debug("[\(fileNameFromPath(file)):\(line)] \(function) - \(message)")
        #endif
    }
    
    /// Log informational message (production: only errors and critical)
    static func info(_ message: String, logger: Logger = AppLogger.general) {
        #if DEBUG
        logger.info("\(message)")
        #endif
    }
    
    /// Log warning message
    static func warning(_ message: String, logger: Logger = AppLogger.general) {
        #if DEBUG
        logger.warning("\(message)")
        #endif
    }
    
    /// Log error message (always logged, even in production)
    static func error(_ message: String, logger: Logger = AppLogger.general) {
        logger.error("\(message)")
    }
    
    /// Log critical error that needs immediate attention (always logged)
    static func critical(_ message: String, logger: Logger = AppLogger.general) {
        logger.critical("\(message)")
    }
    
    // MARK: - Helper Methods
    
    private static func fileNameFromPath(_ path: String) -> String {
        let components = path.components(separatedBy: "/")
        return components.last ?? path
    }
}

// MARK: - Migration Helper

/// Temporary wrapper to make migration from print() easier
/// Usage: Replace `print("message")` with `log("message")`
/// Then gradually migrate to AppLogger.info/debug/error
func log(_ message: String, logger: Logger = AppLogger.general) {
    #if DEBUG
    AppLogger.debug(message, logger: logger)
    #endif
    // Production: silent unless it's an error
}

// MARK: - Performance Logging

extension AppLogger {
    /// Measure and log execution time of a code block
    static func measureTime<T>(_ operation: String, logger: Logger = AppLogger.general, _ block: () throws -> T) rethrows -> T {
        let start = CFAbsoluteTimeGetCurrent()
        let result = try block()
        let duration = CFAbsoluteTimeGetCurrent() - start
        
        #if DEBUG
        logger.info("⏱️ \(operation) took \(String(format: "%.3f", duration))s")
        #endif
        
        return result
    }
    
    /// Measure and log execution time of an async code block
    static func measureTime<T>(_ operation: String, logger: Logger = AppLogger.general, _ block: () async throws -> T) async rethrows -> T {
        let start = CFAbsoluteTimeGetCurrent()
        let result = try await block()
        let duration = CFAbsoluteTimeGetCurrent() - start
        
        #if DEBUG
        logger.info("⏱️ \(operation) took \(String(format: "%.3f", duration))s")
        #endif
        
        return result
    }
}
