import Foundation
import EventKit
import Combine

/// Service for managing Apple Calendar (EventKit) integration
/// Provides CRUD operations for calendar events
class AppleCalendarService: ObservableObject {
    static let shared = AppleCalendarService()
    
    private let eventStore = EKEventStore()
    
    @Published var authorizationStatus: EKAuthorizationStatus = .notDetermined
    @Published var isAuthorized: Bool = false
    @Published var events: [CalendarEvent] = []
    
    private init() {
        updateAuthorizationStatus()
    }
    
    // MARK: - Authorization
    
    /// Request calendar access from the user
    func requestAccess() async -> Bool {
        do {
            // iOS 17+ uses requestFullAccessToEvents
            if #available(iOS 17.0, *) {
                let granted = try await eventStore.requestFullAccessToEvents()
                await MainActor.run {
                    self.isAuthorized = granted
                    self.authorizationStatus = granted ? .fullAccess : .denied
                }
                return granted
            } else {
                // iOS 16 and earlier
                let granted = try await eventStore.requestAccess(to: .event)
                await MainActor.run {
                    self.isAuthorized = granted
                    self.authorizationStatus = granted ? .authorized : .denied
                }
                return granted
            }
        } catch {
            print("❌ Calendar: Failed to request calendar access: \(error)")
            return false
        }
    }
    
    /// Update the current authorization status
    func updateAuthorizationStatus() {
        if #available(iOS 17.0, *) {
            authorizationStatus = EKEventStore.authorizationStatus(for: .event)
            isAuthorized = authorizationStatus == .fullAccess
        } else {
            authorizationStatus = EKEventStore.authorizationStatus(for: .event)
            isAuthorized = authorizationStatus == .authorized
        }
    }
    
    // MARK: - Read Events
    
    /// Fetch events from the user's calendars within a date range
    func fetchEvents(from startDate: Date, to endDate: Date) async -> [CalendarEvent] {
        guard isAuthorized else {
            print("⚠️ Calendar: Calendar access not authorized")
            return []
        }
        
        let calendars = eventStore.calendars(for: .event)
        let predicate = eventStore.predicateForEvents(withStart: startDate, end: endDate, calendars: calendars)
        let ekEvents = eventStore.events(matching: predicate)
        
        let events = ekEvents.map { CalendarEvent(from: $0) }
        
        await MainActor.run {
            self.events = events
        }
        
        return events
    }
    
    /// Fetch events for the next N days
    func fetchUpcomingEvents(days: Int = 30) async -> [CalendarEvent] {
        let startDate = Date()
        let endDate = Calendar.current.date(byAdding: .day, value: days, to: startDate) ?? startDate
        return await fetchEvents(from: startDate, to: endDate)
    }
    
    // MARK: - Create Event
    
    /// Create a new event in the user's default calendar
    func createEvent(
        title: String,
        startDate: Date,
        endDate: Date? = nil,
        location: String? = nil,
        notes: String? = nil,
        isAllDay: Bool = false
    ) async throws -> CalendarEvent {
        guard isAuthorized else {
            throw CalendarError.notAuthorized
        }
        
        let event = EKEvent(eventStore: eventStore)
        event.title = title
        event.startDate = startDate
        event.endDate = endDate ?? Calendar.current.date(byAdding: .hour, value: 1, to: startDate)
        event.location = location
        event.notes = notes
        event.isAllDay = isAllDay
        event.calendar = eventStore.defaultCalendarForNewEvents
        
        try eventStore.save(event, span: .thisEvent)
        
        print("📅 Calendar: Created event: \(title)")
        
        return CalendarEvent(from: event)
    }
    
    /// Create an event from a helpem appointment
    func createEventFromAppointment(
        title: String,
        datetime: Date,
        durationMinutes: Int = 60,
        location: String? = nil,
        notes: String? = nil
    ) async throws -> CalendarEvent {
        let endDate = Calendar.current.date(byAdding: .minute, value: durationMinutes, to: datetime)
        return try await createEvent(
            title: title,
            startDate: datetime,
            endDate: endDate,
            location: location,
            notes: notes
        )
    }
    
    // MARK: - Update Event
    
    /// Update an existing event
    func updateEvent(
        eventIdentifier: String,
        title: String? = nil,
        startDate: Date? = nil,
        endDate: Date? = nil,
        location: String? = nil,
        notes: String? = nil
    ) async throws -> CalendarEvent {
        guard isAuthorized else {
            throw CalendarError.notAuthorized
        }
        
        guard let event = eventStore.event(withIdentifier: eventIdentifier) else {
            throw CalendarError.eventNotFound
        }
        
        if let title = title { event.title = title }
        if let startDate = startDate { event.startDate = startDate }
        if let endDate = endDate { event.endDate = endDate }
        if let location = location { event.location = location }
        if let notes = notes { event.notes = notes }
        
        try eventStore.save(event, span: .thisEvent)
        
        print("📅 Calendar: Updated event: \(event.title ?? "Unknown")")
        
        return CalendarEvent(from: event)
    }
    
    // MARK: - Delete Event
    
    /// Delete an event from the calendar
    func deleteEvent(eventIdentifier: String) async throws {
        guard isAuthorized else {
            throw CalendarError.notAuthorized
        }
        
        guard let event = eventStore.event(withIdentifier: eventIdentifier) else {
            throw CalendarError.eventNotFound
        }
        
        try eventStore.remove(event, span: .thisEvent)
        
        print("📅 Calendar: Deleted event: \(event.title ?? "Unknown")")
    }
    
    // MARK: - Sync with helpem
    
    /// Get all helpem-created events (those with a specific note tag)
    func getHelpemEvents() async -> [CalendarEvent] {
        let allEvents = await fetchUpcomingEvents(days: 365)
        return allEvents.filter { $0.notes?.contains("[helpem]") == true }
    }
    
    /// Check if an event with the same title and time exists
    func eventExists(title: String, startDate: Date) async -> Bool {
        let endDate = Calendar.current.date(byAdding: .minute, value: 1, to: startDate) ?? startDate
        let events = await fetchEvents(from: startDate, to: endDate)
        return events.contains { $0.title == title }
    }
}

// MARK: - Supporting Types

/// Represents a calendar event
struct CalendarEvent: Identifiable, Equatable {
    let id: String
    let title: String
    let startDate: Date
    let endDate: Date
    let location: String?
    let notes: String?
    let isAllDay: Bool
    let calendarTitle: String?
    let calendarColor: String?
    
    init(from ekEvent: EKEvent) {
        self.id = ekEvent.eventIdentifier
        self.title = ekEvent.title ?? "Untitled"
        self.startDate = ekEvent.startDate
        self.endDate = ekEvent.endDate
        self.location = ekEvent.location
        self.notes = ekEvent.notes
        self.isAllDay = ekEvent.isAllDay
        self.calendarTitle = ekEvent.calendar?.title
        self.calendarColor = ekEvent.calendar?.cgColor?.components?.description
    }
    
    // Manual initializer for testing/preview
    init(
        id: String = UUID().uuidString,
        title: String,
        startDate: Date,
        endDate: Date,
        location: String? = nil,
        notes: String? = nil,
        isAllDay: Bool = false,
        calendarTitle: String? = nil,
        calendarColor: String? = nil
    ) {
        self.id = id
        self.title = title
        self.startDate = startDate
        self.endDate = endDate
        self.location = location
        self.notes = notes
        self.isAllDay = isAllDay
        self.calendarTitle = calendarTitle
        self.calendarColor = calendarColor
    }
}

/// Calendar service errors
enum CalendarError: Error, LocalizedError {
    case notAuthorized
    case eventNotFound
    case saveFailed
    case deleteFailed
    
    var errorDescription: String? {
        switch self {
        case .notAuthorized:
            return "Calendar access not authorized"
        case .eventNotFound:
            return "Event not found"
        case .saveFailed:
            return "Failed to save event"
        case .deleteFailed:
            return "Failed to delete event"
        }
    }
}
