import SwiftUI
import Combine

/// Item types that can be created in a Tribe
enum TribeItemType: String, CaseIterable, Identifiable {
    case appointment = "appointment"
    case task = "task"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .appointment: return "Appointment"
        case .task: return "To-Do"
        }
    }

    var icon: String {
        switch self {
        case .appointment: return "calendar"
        case .task: return "checkmark.circle"
        }
    }

    var color: Color {
        switch self {
        case .appointment: return .blue
        case .task: return .green
        }
    }
}

/// Create a new item to share with tribe members
/// Shows a minimal form: Title, Date (for appointments), and recipient selection
struct TribeCreateItemView: View {
    let tribe: Tribe
    let onCreated: () -> Void

    @StateObject private var viewModel: TribeCreateItemViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var selectedType: TribeItemType = .appointment
    @State private var title = ""
    @State private var selectedDate = Date()
    @State private var selectedRecipients: Set<String> = []
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var isCreating = false
    @State private var showFirstTimeTooltip = false

    init(tribe: Tribe, onCreated: @escaping () -> Void) {
        self.tribe = tribe
        self.onCreated = onCreated
        _viewModel = StateObject(wrappedValue: TribeCreateItemViewModel())
    }

    var body: some View {
        NavigationStack {
            Form {
                // First-time education tooltip
                if showFirstTimeTooltip {
                    Section {
                        HStack(spacing: 12) {
                            Image(systemName: "info.circle.fill")
                                .foregroundColor(.blue)
                                .font(.title3)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("How Tribe Sharing Works")
                                    .font(.subheadline)
                                    .fontWeight(.semibold)

                                Text("You choose who receives this. They'll decide whether to accept it.")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Button {
                                withAnimation {
                                    showFirstTimeTooltip = false
                                    UserDefaults.standard.set(true, forKey: "tribe_create_tooltip_shown")
                                }
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                            .buttonStyle(.plain)
                        }
                        .padding(.vertical, 4)
                    }
                }

                // Item type selection
                Section("What to Share") {
                    Picker("Type", selection: $selectedType) {
                        ForEach(TribeItemType.allCases) { type in
                            Label(type.displayName, systemImage: type.icon)
                                .tag(type)
                        }
                    }
                    .pickerStyle(.segmented)
                }

                // Item details
                Section("Details") {
                    TextField("Title", text: $title)
                        .textContentType(.none)

                    if selectedType == .appointment {
                        DatePicker(
                            "Date & Time",
                            selection: $selectedDate,
                            in: Date()...,
                            displayedComponents: [.date, .hourAndMinute]
                        )
                    }
                }

                // Recipients
                Section {
                    if viewModel.isLoadingMembers {
                        HStack {
                            ProgressView()
                            Text("Loading members...")
                                .foregroundColor(.secondary)
                        }
                    } else if viewModel.availableRecipients.isEmpty {
                        Text("No members available to share with")
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(viewModel.availableRecipients) { member in
                            Toggle(isOn: Binding(
                                get: { selectedRecipients.contains(member.userId) },
                                set: { isSelected in
                                    if isSelected {
                                        selectedRecipients.insert(member.userId)
                                    } else {
                                        selectedRecipients.remove(member.userId)
                                    }
                                }
                            )) {
                                HStack(spacing: 10) {
                                    MemberAvatarView(avatarUrl: member.avatarUrl, size: 32)

                                    Text(viewModel.displayName(for: member))
                                        .font(.body)
                                }
                            }
                        }
                    }
                } header: {
                    Text("Send To")
                } footer: {
                    if !viewModel.availableRecipients.isEmpty {
                        Text("Select who should receive this proposal.")
                    }
                }
            }
            .navigationTitle("Share with Tribe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .disabled(isCreating)
                }

                ToolbarItem(placement: .confirmationAction) {
                    if isCreating {
                        ProgressView()
                    } else {
                        Button("Send") {
                            Task {
                                await createItem()
                            }
                        }
                        .disabled(!canCreate)
                    }
                }
            }
            .task {
                await viewModel.loadMembers(tribeId: tribe.id)

                // Show tooltip if first time
                if !UserDefaults.standard.bool(forKey: "tribe_create_tooltip_shown") {
                    showFirstTimeTooltip = true
                }
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }

    private var canCreate: Bool {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        return !trimmedTitle.isEmpty && !selectedRecipients.isEmpty
    }

    private func createItem() async {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty, !selectedRecipients.isEmpty else { return }

        isCreating = true
        defer { isCreating = false }

        do {
            var data: [String: Any] = ["title": trimmedTitle]

            if selectedType == .appointment {
                data["datetime"] = ISO8601DateFormatter().string(from: selectedDate)
            }

            try await viewModel.createItem(
                tribeId: tribe.id,
                itemType: selectedType.rawValue,
                data: data,
                recipientUserIds: Array(selectedRecipients)
            )

            onCreated()
            dismiss()

        } catch {
            errorMessage = ErrorSanitizer.userFacingMessage(for: error)
            showingError = true
        }
    }
}

// MARK: - View Model

@MainActor
class TribeCreateItemViewModel: ObservableObject {
    @Published var availableRecipients: [TribeMember] = []
    @Published var isLoadingMembers = false

    private let createItemUseCase = AppContainer.shared.makeCreateTribeItemUseCase()
    private var currentUserId: String? {
        AuthManager.shared.currentUserId
    }

    func loadMembers(tribeId: String) async {
        isLoadingMembers = true
        defer { isLoadingMembers = false }

        do {
            let allMembers = try await TribeAPIClient.shared.getTribeMembers(tribeId: tribeId)

            // Filter: only accepted members, exclude current user
            availableRecipients = allMembers.filter { member in
                member.userId != currentUserId && member.isAccepted
            }

            AppLogger.info(
                "Loaded \(availableRecipients.count) available recipients for tribe item creation",
                logger: AppLogger.general
            )
        } catch {
            AppLogger.error("Failed to load tribe members: \(error)", logger: AppLogger.general)
        }
    }

    func displayName(for member: TribeMember) -> String {
        if let name = member.displayName, !name.isEmpty {
            return name
        }
        let shortId = String(member.userId.prefix(8))
        return "Member (\(shortId))"
    }

    func createItem(
        tribeId: String,
        itemType: String,
        data: [String: Any],
        recipientUserIds: [String]
    ) async throws {
        _ = try await createItemUseCase.execute(
            tribeId: tribeId,
            itemType: itemType,
            data: data,
            recipientUserIds: recipientUserIds
        )

        AppLogger.info(
            "Created tribe item: \(itemType), sent to \(recipientUserIds.count) recipients",
            logger: AppLogger.general
        )
    }
}
