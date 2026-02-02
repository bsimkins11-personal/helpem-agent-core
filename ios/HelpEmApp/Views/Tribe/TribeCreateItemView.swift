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
/// Option to send to all members or select specific ones
struct TribeCreateItemView: View {
    let tribe: Tribe
    let onCreated: () -> Void

    @StateObject private var viewModel: TribeCreateItemViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var selectedType: TribeItemType = .appointment
    @State private var title = ""
    @State private var selectedDate = Date()
    @State private var sendToAll = true
    @State private var selectedRecipients: Set<String> = []
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var isCreating = false

    init(tribe: Tribe, onCreated: @escaping () -> Void) {
        self.tribe = tribe
        self.onCreated = onCreated
        _viewModel = StateObject(wrappedValue: TribeCreateItemViewModel())
    }

    var body: some View {
        NavigationStack {
            Form {
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

                // Recipients section
                Section {
                    if viewModel.isLoadingMembers {
                        HStack {
                            ProgressView()
                            Text("Loading members...")
                                .foregroundColor(.secondary)
                        }
                    } else {
                        // Send to all toggle
                        Toggle(isOn: $sendToAll) {
                            HStack(spacing: 10) {
                                Image(systemName: "person.3.fill")
                                    .foregroundColor(.blue)
                                Text("Send to all members")
                            }
                        }
                        .onChange(of: sendToAll) { _, newValue in
                            if newValue {
                                // Select all when toggled on
                                selectedRecipients = Set(viewModel.allRecipients.map { $0.userId })
                            }
                        }

                        // Individual member selection (only when not sending to all)
                        if !sendToAll {
                            ForEach(viewModel.allRecipients) { member in
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
                    }
                } header: {
                    Text("Send To")
                } footer: {
                    if !viewModel.isLoadingMembers {
                        if sendToAll {
                            Text("All \(viewModel.allRecipients.count) members will receive this. Each decides whether to accept.")
                        } else {
                            Text("\(selectedRecipients.count) member(s) selected. Each decides whether to accept.")
                        }
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
                // Default to all selected
                selectedRecipients = Set(viewModel.allRecipients.map { $0.userId })
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
        let hasRecipients = sendToAll ? viewModel.allRecipients.count > 0 : selectedRecipients.count > 0
        return !trimmedTitle.isEmpty && hasRecipients && !viewModel.isLoadingMembers
    }

    private func createItem() async {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedTitle.isEmpty else { return }

        isCreating = true
        defer { isCreating = false }

        do {
            var data: [String: Any] = ["title": trimmedTitle]

            if selectedType == .appointment {
                data["datetime"] = ISO8601DateFormatter().string(from: selectedDate)
            }

            let recipients: [String]
            if sendToAll {
                recipients = viewModel.allRecipients.map { $0.userId }
            } else {
                recipients = Array(selectedRecipients)
            }

            try await viewModel.createItem(
                tribeId: tribe.id,
                itemType: selectedType.rawValue,
                data: data,
                recipientUserIds: recipients
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
    @Published var allRecipients: [TribeMember] = []
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
            allRecipients = allMembers.filter { member in
                member.userId != currentUserId && member.isAccepted
            }

            AppLogger.info(
                "Loaded \(allRecipients.count) tribe members for sharing",
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
        guard !recipientUserIds.isEmpty else {
            throw NSError(
                domain: "TribeCreateItem",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "No tribe members selected"]
            )
        }

        _ = try await createItemUseCase.execute(
            tribeId: tribeId,
            itemType: itemType,
            data: data,
            recipientUserIds: recipientUserIds
        )

        AppLogger.info(
            "Created tribe item: \(itemType), sent to \(recipientUserIds.count) members",
            logger: AppLogger.general
        )
    }
}
