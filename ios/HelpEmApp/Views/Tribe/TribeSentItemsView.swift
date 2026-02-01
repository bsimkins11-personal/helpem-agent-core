import SwiftUI

/// Sent items view - shows items created by the current user with responses
/// For appointments: Shows who responded Yes/No/Maybe
/// For other items: Just shows recipient count (privacy)
struct TribeSentItemsView: View {
    let tribe: Tribe
    @State private var items: [SentTribeItem] = []
    @State private var isLoading = false
    @State private var error: Error?

    var body: some View {
        Group {
            if isLoading && items.isEmpty {
                ProgressView("Loading sent items...")
            } else if items.isEmpty {
                emptyState
            } else {
                itemsList
            }
        }
        .navigationTitle("Sent Items")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadItems()
        }
        .refreshable {
            await loadItems()
        }
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "No Sent Items",
            systemImage: "paperplane",
            description: Text("Items you share with this tribe will appear here")
        )
    }

    private var itemsList: some View {
        List {
            // Appointments section (with responses)
            let appointments = items.filter { $0.isAppointment }
            if !appointments.isEmpty {
                Section("Appointments") {
                    ForEach(appointments) { item in
                        AppointmentItemRow(item: item)
                    }
                }
            }

            // Other items section (privacy - no responses shown)
            let otherItems = items.filter { !$0.isAppointment }
            if !otherItems.isEmpty {
                Section("Other Items") {
                    ForEach(otherItems) { item in
                        OtherItemRow(item: item)
                    }
                }
            }
        }
    }

    private func loadItems() async {
        isLoading = true
        defer { isLoading = false }

        do {
            items = try await TribeAPIClient.shared.getSentItems(tribeId: tribe.id)
        } catch {
            self.error = error
            AppLogger.error("Failed to load sent items: \(error.localizedDescription)", logger: AppLogger.general)
        }
    }
}

// MARK: - Appointment Item Row (with responses)

struct AppointmentItemRow: View {
    let item: SentTribeItem

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Item header
            HStack {
                Image(systemName: "calendar")
                    .foregroundColor(.blue)
                Text(item.title)
                    .font(.headline)
                Spacer()
                Text(item.createdAt.formatted(date: .abbreviated, time: .omitted))
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            // Appointment details
            if let datetime = item.data["datetime"],
               case let datetimeString as String = datetime.value,
               let date = ISO8601DateFormatter().date(from: datetimeString) {
                HStack {
                    Image(systemName: "clock")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text(date.formatted(date: .abbreviated, time: .shortened))
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            // Responses summary
            if let responses = item.responses, !responses.isEmpty {
                responseSummary(responses)
                responsesList(responses)
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func responseSummary(_ responses: [ProposalResponse]) -> some View {
        let yesCount = responses.filter { $0.state == .accepted }.count
        let maybeCount = responses.filter { $0.state == .maybe }.count
        let noCount = responses.filter { $0.state == .dismissed }.count
        let pendingCount = responses.filter { $0.state == .proposed || $0.state == .notNow }.count

        HStack(spacing: 16) {
            if yesCount > 0 {
                Label("\(yesCount)", systemImage: "checkmark.circle.fill")
                    .font(.caption)
                    .foregroundColor(.green)
            }
            if maybeCount > 0 {
                Label("\(maybeCount)", systemImage: "questionmark.circle.fill")
                    .font(.caption)
                    .foregroundColor(.blue)
            }
            if noCount > 0 {
                Label("\(noCount)", systemImage: "xmark.circle.fill")
                    .font(.caption)
                    .foregroundColor(.red)
            }
            if pendingCount > 0 {
                Label("\(pendingCount)", systemImage: "clock")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func responsesList(_ responses: [ProposalResponse]) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            ForEach(responses, id: \.recipientId) { response in
                HStack {
                    responseIcon(for: response.state)
                    Text(response.recipientName)
                        .font(.subheadline)
                    Spacer()
                    Text(response.state.displayName)
                        .font(.caption)
                        .foregroundColor(responseColor(for: response.state))
                }
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }

    private func responseIcon(for state: ProposalState) -> some View {
        let (icon, color) = iconAndColor(for: state)
        return Image(systemName: icon)
            .font(.caption)
            .foregroundColor(color)
    }

    private func iconAndColor(for state: ProposalState) -> (String, Color) {
        switch state {
        case .accepted:
            return ("checkmark.circle.fill", .green)
        case .maybe:
            return ("questionmark.circle.fill", .blue)
        case .dismissed:
            return ("xmark.circle.fill", .red)
        case .proposed, .notNow:
            return ("clock", .secondary)
        }
    }

    private func responseColor(for state: ProposalState) -> Color {
        switch state {
        case .accepted:
            return .green
        case .maybe:
            return .blue
        case .dismissed:
            return .red
        case .proposed, .notNow:
            return .secondary
        }
    }
}

// MARK: - Other Item Row (privacy - no responses)

struct OtherItemRow: View {
    let item: SentTribeItem

    var body: some View {
        HStack {
            Image(systemName: iconForType)
                .foregroundColor(colorForType)
            VStack(alignment: .leading, spacing: 4) {
                Text(item.title)
                    .font(.headline)
                if let count = item.recipientCount {
                    Text("Sent to \(count) \(count == 1 ? "person" : "people")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            Spacer()
            Text(item.createdAt.formatted(date: .abbreviated, time: .omitted))
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }

    private var iconForType: String {
        switch item.itemType {
        case "task": return "checkmark.circle"
        case "routine": return "repeat"
        case "grocery": return "cart"
        default: return "circle"
        }
    }

    private var colorForType: Color {
        switch item.itemType {
        case "task": return .green
        case "routine": return .purple
        case "grocery": return .orange
        default: return .gray
        }
    }
}
