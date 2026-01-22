import SwiftUI
import Combine

/// Tribe Settings Screen
/// - Rename Tribe (owner only)
/// - Members list with permissions
/// - Category enable/disable
/// - Notification preferences
/// - Leave/Delete Tribe
struct TribeSettingsView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeSettingsViewModel()
    
    @State private var showingRename = false
    @State private var showingDeleteConfirm = false
    @State private var showingLeaveConfirm = false
    @State private var newTribeName = ""
    
    var body: some View {
        List {
            tribeNameSection
            membersSection
            notificationsSection
            managementScopeSection
            dangerZoneSection
        }
        .task {
            await viewModel.loadSettings(tribeId: tribe.id)
        }
        .alert("Rename Tribe", isPresented: $showingRename) {
            TextField("Tribe Name", text: $newTribeName)
            Button("Cancel", role: .cancel) {}
            Button("Rename") {
                Task {
                    await viewModel.renameTribe(tribeId: tribe.id, newName: newTribeName)
                }
            }
        }
        .alert("Delete Tribe", isPresented: $showingDeleteConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive) {
                Task {
                    await viewModel.deleteTribe(tribeId: tribe.id)
                }
            }
        } message: {
            Text("This will permanently delete the Tribe for all members. This action cannot be undone.")
        }
        .alert("Leave Tribe", isPresented: $showingLeaveConfirm) {
            Button("Cancel", role: .cancel) {}
            Button("Leave", role: .destructive) {
                Task {
                    await viewModel.leaveTribe(tribeId: tribe.id)
                }
            }
        } message: {
            Text("You will no longer see proposals or shared items from this Tribe.")
        }
        .alert("Advanced Option", isPresented: $viewModel.showingAdvancedWarning) {
            Button("Cancel", role: .cancel) {
                viewModel.managementScope = "only_shared"
            }
            Button("Continue") {
                Task {
                    await viewModel.updateManagementScope(tribeId: tribe.id, scope: "shared_and_personal")
                }
            }
        } message: {
            Text("This will allow Tribe members to see your personal items. No notification will be sent to other members.")
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            if let error = viewModel.error {
                Text(error.localizedDescription)
            }
        }
    }

    private var tribeNameSection: some View {
        Group {
            if tribe.isOwner {
                Section("Tribe Name") {
                    HStack {
                        Text(tribe.name)
                        Spacer()
                        Button("Rename") {
                            newTribeName = tribe.name
                            showingRename = true
                        }
                        .font(.subheadline)
                    }
                }
            }
        }
    }

    private var membersSection: some View {
        Section {
            NavigationLink {
                TribeMembersView(tribe: tribe)
            } label: {
                Label("Members", systemImage: "person.3")
            }
        }
    }

    private var notificationsSection: some View {
        Section {
            Toggle("Proposal Notifications", isOn: $viewModel.proposalNotifications)
                .onChange(of: viewModel.proposalNotifications) { _, newValue in
                    Task {
                        await viewModel.updateNotificationPreferences(
                            tribeId: tribe.id,
                            proposalNotifs: newValue,
                            digestNotifs: viewModel.digestNotifications
                        )
                    }
                }

            Toggle("Digest Notifications", isOn: $viewModel.digestNotifications)
                .onChange(of: viewModel.digestNotifications) { _, newValue in
                    Task {
                        await viewModel.updateNotificationPreferences(
                            tribeId: tribe.id,
                            proposalNotifs: viewModel.proposalNotifications,
                            digestNotifs: newValue
                        )
                    }
                }
        } header: {
            Text("Notifications")
        } footer: {
            Text("Proposal notifications alert you once when someone shares something. Digest notifications summarize multiple proposals.")
        }
    }

    private var managementScopeSection: some View {
        Section {
            Picker("Show", selection: $viewModel.managementScope) {
                Text("Only Shared Items").tag("only_shared")
                Text("Shared + Personal Items").tag("shared_and_personal")
            }
            .pickerStyle(.menu)
            .onChange(of: viewModel.managementScope) { _, newValue in
                if newValue == "shared_and_personal" {
                    viewModel.showingAdvancedWarning = true
                } else {
                    Task {
                        await viewModel.updateManagementScope(tribeId: tribe.id, scope: newValue)
                    }
                }
            }
        } header: {
            Text("Management Scope")
        } footer: {
            Text("'Shared + Personal Items' allows Tribe members to see your personal items in this context. This is an advanced option.")
        }
    }

    private var dangerZoneSection: some View {
        Section {
            if tribe.isOwner {
                Button(role: .destructive) {
                    showingDeleteConfirm = true
                } label: {
                    Label("Delete Tribe", systemImage: "trash")
                }
            } else {
                Button(role: .destructive) {
                    showingLeaveConfirm = true
                } label: {
                    Label("Leave Tribe", systemImage: "arrow.right.square")
                }
            }
        } header: {
            Text("Danger Zone")
        }
    }
}

// MARK: - Tribe Members View

struct TribeMembersView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeMembersViewModel()
    @State private var showingInvite = false
    
    var body: some View {
        List {
            ForEach(viewModel.members) { member in
                NavigationLink {
                    MemberDetailView(tribe: tribe, member: member)
                } label: {
                    MemberRow(member: member, currentUserId: viewModel.currentUserId)
                }
            }
        }
        .navigationTitle("Members")
        .toolbar {
            if tribe.isOwner {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingInvite = true
                    } label: {
                        Image(systemName: "person.badge.plus")
                    }
                }
            }
        }
        .sheet(isPresented: $showingInvite) {
            InviteMemberView(tribe: tribe) {
                Task {
                    await viewModel.loadMembers(tribeId: tribe.id)
                }
            }
        }
        .task {
            await viewModel.loadMembers(tribeId: tribe.id)
        }
    }
}

// MARK: - Member Row

struct MemberRow: View {
    let member: TribeMember
    let currentUserId: String?
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text("Member")
                        .font(.body)
                    
                    if member.userId == currentUserId {
                        Text("(You)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                if member.isPending {
                    Text("Pending invitation")
                        .font(.caption)
                        .foregroundColor(.orange)
                } else if let summary = permissionSummary {
                    Text(summary)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    private var permissionSummary: String? {
        guard let permissions = member.permissions else { return nil }
        
        var canAdd: [String] = []
        var canRemove: [String] = []
        
        if permissions.canAddTasks { canAdd.append("Tasks") }
        if permissions.canAddRoutines { canAdd.append("Routines") }
        if permissions.canAddAppointments { canAdd.append("Appointments") }
        if permissions.canAddGroceries { canAdd.append("Groceries") }
        
        if permissions.canRemoveTasks { canRemove.append("Tasks") }
        if permissions.canRemoveRoutines { canRemove.append("Routines") }
        if permissions.canRemoveAppointments { canRemove.append("Appointments") }
        if permissions.canRemoveGroceries { canRemove.append("Groceries") }
        
        if canAdd.isEmpty && canRemove.isEmpty {
            return "No permissions"
        } else if canAdd.count == 4 && canRemove.count == 4 {
            return "Full permissions"
        } else {
            let parts = [
                canAdd.isEmpty ? nil : "Add: \(canAdd.count)/4",
                canRemove.isEmpty ? nil : "Remove: \(canRemove.count)/4"
            ].compactMap { $0 }
            return parts.joined(separator: " • ")
        }
    }
}

// MARK: - Member Detail View

struct MemberDetailView: View {
    let tribe: Tribe
    let member: TribeMember
    @StateObject private var viewModel = MemberDetailViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        List {
            // Member info
            Section {
                HStack {
                    Text("Status")
                    Spacer()
                    Text(member.isAccepted ? "Active" : "Pending")
                        .foregroundColor(member.isAccepted ? .green : .orange)
                }
            }
            
            // Permissions (owner only, not for themselves)
            if tribe.isOwner && member.userId != tribe.ownerId {
                Section {
                    permissionsContent
                } header: {
                    Text("Member Permissions")
                } footer: {
                    Text("Control what this member can add or remove in the Tribe. Changes apply immediately after saving.")
                }
            } else if member.userId == tribe.ownerId {
                Section {
                    Text("Owners have full permissions for all categories")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                } header: {
                    Text("Member Permissions")
                }
            } else {
                Section {
                    Text("Only the Tribe owner can manage member permissions")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                } header: {
                    Text("Member Permissions")
                }
            }
        }
        .navigationTitle("Member Details")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Success", isPresented: $viewModel.showSuccess) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text("Permissions updated successfully")
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            if let error = viewModel.error {
                Text(error.localizedDescription)
            }
        }
        .task {
            viewModel.loadMemberPermissions(member: member)
        }
    }
    
    @ViewBuilder
    private var permissionsContent: some View {
        // Tasks
        VStack(alignment: .leading, spacing: 8) {
            Text("Tasks")
                .font(.subheadline)
                .fontWeight(.semibold)
            
            Toggle("Can Add Tasks", isOn: $viewModel.canAddTasks)
            Toggle("Can Remove Tasks", isOn: $viewModel.canRemoveTasks)
        }
        .padding(.vertical, 4)
        
        Divider()
        
        // Routines
        VStack(alignment: .leading, spacing: 8) {
            Text("Routines")
                .font(.subheadline)
                .fontWeight(.semibold)
            
            Toggle("Can Add Routines", isOn: $viewModel.canAddRoutines)
            Toggle("Can Remove Routines", isOn: $viewModel.canRemoveRoutines)
        }
        .padding(.vertical, 4)
        
        Divider()
        
        // Appointments
        VStack(alignment: .leading, spacing: 8) {
            Text("Appointments")
                .font(.subheadline)
                .fontWeight(.semibold)
            
            Toggle("Can Add Appointments", isOn: $viewModel.canAddAppointments)
            Toggle("Can Remove Appointments", isOn: $viewModel.canRemoveAppointments)
        }
        .padding(.vertical, 4)
        
        Divider()
        
        // Groceries
        VStack(alignment: .leading, spacing: 8) {
            Text("Groceries")
                .font(.subheadline)
                .fontWeight(.semibold)
            
            Toggle("Can Add Groceries", isOn: $viewModel.canAddGroceries)
            Toggle("Can Remove Groceries", isOn: $viewModel.canRemoveGroceries)
        }
        .padding(.vertical, 4)
        
        // Save button
        Button {
            Task {
                await viewModel.savePermissions(tribeId: tribe.id, memberId: member.id)
            }
        } label: {
            if viewModel.isSaving {
                ProgressView()
                    .frame(maxWidth: .infinity)
            } else {
                Text("Save Permissions")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
            }
        }
        .buttonStyle(.borderedProminent)
        .disabled(viewModel.isSaving)
        .padding(.top, 8)
    }
}

// MARK: - Invite Member View

struct InviteMemberView: View {
    let tribe: Tribe
    let onComplete: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var showingContacts = false
    @State private var selectedUserId: String?
    @State private var isSending = false
    @State private var error: Error?
    @State private var showError = false

    @State private var canAddTasks = true
    @State private var canRemoveTasks = false
    @State private var canAddRoutines = true
    @State private var canRemoveRoutines = false
    @State private var canAddAppointments = true
    @State private var canRemoveAppointments = false
    @State private var canAddGroceries = true
    @State private var canRemoveGroceries = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Select Contact") {
                    Button {
                        showingContacts = true
                    } label: {
                        HStack {
                            Text(selectedUserId == nil ? "Choose Contact" : "Contact Selected")
                                .foregroundColor(selectedUserId == nil ? .blue : .primary)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                    }
                } footer: {
                    Text("Invites are sent as Tribe proposals. The recipient chooses whether to join.")
                }

                Section("Permissions") {
                    Toggle("Can Add Tasks", isOn: $canAddTasks)
                    Toggle("Can Remove Tasks", isOn: $canRemoveTasks)
                    Toggle("Can Add Routines", isOn: $canAddRoutines)
                    Toggle("Can Remove Routines", isOn: $canRemoveRoutines)
                    Toggle("Can Add Appointments", isOn: $canAddAppointments)
                    Toggle("Can Remove Appointments", isOn: $canRemoveAppointments)
                    Toggle("Can Add Groceries", isOn: $canAddGroceries)
                    Toggle("Can Remove Groceries", isOn: $canRemoveGroceries)
                } footer: {
                    Text("Permissions can be updated any time after the invite is sent.")
                }
            }
            .navigationTitle("Invite Member")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSending ? "Sending..." : "Send Invite") {
                        Task {
                            await sendInvite()
                        }
                    }
                    .disabled(isSending || selectedUserId == nil)
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                if let error {
                    Text(error.localizedDescription)
                }
            }
            .sheet(isPresented: $showingContacts) {
                ContactsPickerView(tribe: tribe) { userId in
                    selectedUserId = userId
                }
            }
        }
    }

    private func sendInvite() async {
        guard let userId = selectedUserId else { return }
        isSending = true
        defer { isSending = false }

        do {
            let member = try await TribeAPIClient.shared.inviteMember(tribeId: tribe.id, userId: userId)
            let permissions = PermissionsUpdate(
                canAddTasks: canAddTasks,
                canRemoveTasks: canRemoveTasks,
                canAddRoutines: canAddRoutines,
                canRemoveRoutines: canRemoveRoutines,
                canAddAppointments: canAddAppointments,
                canRemoveAppointments: canRemoveAppointments,
                canAddGroceries: canAddGroceries,
                canRemoveGroceries: canRemoveGroceries
            )

            _ = try await TribeAPIClient.shared.updateMemberSettings(
                tribeId: tribe.id,
                memberId: member.id,
                permissions: permissions
            )

            onComplete()
            dismiss()
        } catch {
            self.error = error
            self.showError = true
        }
    }
}

// MARK: - View Models

@MainActor
class TribeSettingsViewModel: ObservableObject {
    @Published var proposalNotifications = true
    @Published var digestNotifications = false
    @Published var managementScope = "only_shared"
    @Published var showingAdvancedWarning = false
    @Published var error: Error?
    @Published var showError = false
    
    private var currentMemberId: String?
    
    func loadSettings(tribeId: String) async {
        // Load current member settings
        do {
            _ = try await TribeAPIClient.shared.getTribeMembers(tribeId: tribeId)
            // Find current user's membership
            // Note: In real implementation, we'd need to know current user ID
            // For now, this is a placeholder
            AppLogger.info("Loaded tribe settings", logger: AppLogger.general)
        } catch {
            AppLogger.error("Failed to load settings: \(error)", logger: AppLogger.general)
        }
    }
    
    func updateNotificationPreferences(tribeId: String, proposalNotifs: Bool, digestNotifs: Bool) async {
        guard let memberId = currentMemberId else {
            AppLogger.error("No member ID available", logger: AppLogger.general)
            return
        }
        
        do {
            _ = try await TribeAPIClient.shared.updateMemberSettings(
                tribeId: tribeId,
                memberId: memberId,
                proposalNotifications: proposalNotifs,
                digestNotifications: digestNotifs
            )
            AppLogger.info("Updated notification preferences", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
            AppLogger.error("Failed to update notification preferences: \(error)", logger: AppLogger.general)
        }
    }
    
    func updateManagementScope(tribeId: String, scope: String) async {
        guard let memberId = currentMemberId else {
            AppLogger.error("No member ID available", logger: AppLogger.general)
            return
        }
        
        do {
            _ = try await TribeAPIClient.shared.updateMemberSettings(
                tribeId: tribeId,
                memberId: memberId,
                managementScope: scope
            )
            AppLogger.info("Updated management scope to: \(scope)", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
            AppLogger.error("Failed to update management scope: \(error)", logger: AppLogger.general)
        }
    }
    
    func renameTribe(tribeId: String, newName: String) async {
        do {
            _ = try await TribeAPIClient.shared.renameTribe(tribeId: tribeId, newName: newName)
            AppLogger.info("Renamed tribe", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
        }
    }
    
    func deleteTribe(tribeId: String) async {
        do {
            try await TribeAPIClient.shared.deleteTribe(tribeId: tribeId)
            AppLogger.info("Deleted tribe", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
        }
    }
    
    func leaveTribe(tribeId: String) async {
        do {
            try await TribeAPIClient.shared.leaveTribe(tribeId: tribeId)
            AppLogger.info("Left tribe", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
        }
    }
}

@MainActor
class TribeMembersViewModel: ObservableObject {
    @Published var members: [TribeMember] = []
    @Published var currentUserId: String?
    
    func loadMembers(tribeId: String) async {
        do {
            members = try await TribeAPIClient.shared.getTribeMembers(tribeId: tribeId)
            AppLogger.info("Loaded \(members.count) members", logger: AppLogger.general)
        } catch {
            AppLogger.error("Failed to load members: \(error)", logger: AppLogger.general)
        }
    }
    
    func inviteMember(tribeId: String, userId: String) async {
        do {
            let member = try await TribeAPIClient.shared.inviteMember(tribeId: tribeId, userId: userId)
            members.append(member)
            AppLogger.info("Invited member", logger: AppLogger.general)
        } catch {
            AppLogger.error("Failed to invite member: \(error)", logger: AppLogger.general)
        }
    }
}

@MainActor
class MemberDetailViewModel: ObservableObject {
    @Published var canAddTasks = true
    @Published var canRemoveTasks = false
    @Published var canAddRoutines = true
    @Published var canRemoveRoutines = false
    @Published var canAddAppointments = true
    @Published var canRemoveAppointments = false
    @Published var canAddGroceries = true
    @Published var canRemoveGroceries = false
    
    @Published var isSaving = false
    @Published var showSuccess = false
    @Published var showError = false
    @Published var error: Error?
    
    private var memberId: String?
    
    func loadMemberPermissions(member: TribeMember) {
        self.memberId = member.id
        
        if let permissions = member.permissions {
            canAddTasks = permissions.canAddTasks
            canRemoveTasks = permissions.canRemoveTasks
            canAddRoutines = permissions.canAddRoutines
            canRemoveRoutines = permissions.canRemoveRoutines
            canAddAppointments = permissions.canAddAppointments
            canRemoveAppointments = permissions.canRemoveAppointments
            canAddGroceries = permissions.canAddGroceries
            canRemoveGroceries = permissions.canRemoveGroceries
        }
    }
    
    func savePermissions(tribeId: String, memberId: String) async {
        isSaving = true
        defer { isSaving = false }
        
        let update = PermissionsUpdate(
            canAddTasks: canAddTasks,
            canRemoveTasks: canRemoveTasks,
            canAddRoutines: canAddRoutines,
            canRemoveRoutines: canRemoveRoutines,
            canAddAppointments: canAddAppointments,
            canRemoveAppointments: canRemoveAppointments,
            canAddGroceries: canAddGroceries,
            canRemoveGroceries: canRemoveGroceries
        )
        
        do {
            let updatedMember = try await TribeAPIClient.shared.updateMemberSettings(
                tribeId: tribeId,
                memberId: memberId,
                permissions: update
            )
            
            // Update local state with server response
            if let permissions = updatedMember.permissions {
                canAddTasks = permissions.canAddTasks
                canRemoveTasks = permissions.canRemoveTasks
                canAddRoutines = permissions.canAddRoutines
                canRemoveRoutines = permissions.canRemoveRoutines
                canAddAppointments = permissions.canAddAppointments
                canRemoveAppointments = permissions.canRemoveAppointments
                canAddGroceries = permissions.canAddGroceries
                canRemoveGroceries = permissions.canRemoveGroceries
            }
            
            showSuccess = true
            AppLogger.info("Saved member permissions", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
            AppLogger.error("Failed to save permissions: \(error)", logger: AppLogger.general)
        }
    }
}
