import SwiftUI
import Combine
import PhotosUI

/// Tribe Settings Screen
/// - Rename Tribe (owner only)
/// - Members list with permissions
/// - Category enable/disable
/// - Notification preferences
/// - Leave/Delete Tribe
struct TribeSettingsView: View {
    let tribe: Tribe
    @StateObject private var viewModel = TribeSettingsViewModel()
    @Environment(\.dismiss) private var dismiss
    
    @State private var showingRename = false
    @State private var showingDeleteConfirm = false
    @State private var showingLeaveConfirm = false
    @State private var newTribeName = ""
    @State private var selectedAvatarItem: PhotosPickerItem?
    @State private var avatarImage: UIImage?
    
    var body: some View {
        List {
            tribeNameSection
            tribeTypeSection
            if tribe.isOwner {
                tribeDefaultPermissionsSection
            }
            membersSection
            notificationsSection
            managementScopeSection
            dangerZoneSection
        }
        .task {
            viewModel.loadDefaultPermissions(from: tribe)
            await viewModel.loadSettings(tribeId: tribe.id)
        }
        .onChange(of: viewModel.tribeDeleted) { deleted in
            if deleted {
                dismiss()
            }
        }
        .onChange(of: viewModel.tribeLeft) { left in
            if left {
                dismiss()
            }
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
        .onChange(of: selectedAvatarItem) { _, newItem in
            guard let newItem else { return }
            Task {
                await updateAvatar(from: newItem)
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
                
                Section("Tribe Photo") {
                    HStack(spacing: 12) {
                        if let avatarUrl = tribe.avatarUrl, let url = URL(string: avatarUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Circle().fill(Color.gray.opacity(0.2))
                            }
                            .frame(width: 56, height: 56)
                            .clipShape(Circle())
                        } else if let avatarImage = avatarImage {
                            Image(uiImage: avatarImage)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 56, height: 56)
                                .clipShape(Circle())
                        } else {
                            Circle()
                                .fill(Color.gray.opacity(0.2))
                                .frame(width: 56, height: 56)
                                .overlay(
                                    Image(systemName: "person.3")
                                        .foregroundColor(.gray)
                                )
                        }
                        
                        PhotosPicker(
                            selection: $selectedAvatarItem,
                            matching: .images,
                            photoLibrary: .shared()
                        ) {
                            Text(viewModel.isUploadingAvatar ? "Uploading..." : "Upload Photo")
                                .font(.subheadline)
                        }
                        .disabled(viewModel.isUploadingAvatar)
                    }
                }
            }
        }
    }

    private func updateAvatar(from item: PhotosPickerItem) async {
        do {
            if let data = try await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                let resized = image.resizedSquare(to: 256)
                avatarImage = resized
                if let dataUrl = resized.jpegData(compressionQuality: 0.85)?.asDataURL() {
                    await viewModel.updateTribeAvatar(tribeId: tribe.id, avatarUrl: dataUrl)
                }
            }
        } catch {
            viewModel.error = error
            viewModel.showError = true
        }
    }

    // MARK: - Tribe Type Section

    private var tribeTypeSection: some View {
        Section {
            HStack {
                Label(tribe.tribeType.displayName, systemImage: tribe.isFamily ? "house.fill" : "person.2.fill")
                    .foregroundColor(tribe.isFamily ? .purple : .blue)
                Spacer()
                Text(tribe.isFamily ? "Full sharing" : "Proposals only")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        } header: {
            Text("Tribe Type")
        } footer: {
            if tribe.isFriend {
                Text("Friend tribes can message, and propose appointments & tasks. All proposals require approval.")
            } else {
                Text("Family tribes can share all categories. Admin controls whether members can add directly or must propose.")
            }
        }
    }

    // MARK: - Default Permissions Section (Family only, Owner only)

    private var tribeDefaultPermissionsSection: some View {
        Group {
            if tribe.isFamily {
                Section {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Set default permissions for all tribe members. You can override these per-member in Members settings.")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        // Tasks
                        HStack {
                            Label("Tasks", systemImage: "checklist")
                            Spacer()
                            Picker("", selection: $viewModel.defaultTasksPermission) {
                                Text("Propose").tag("propose")
                                Text("Add Directly").tag("add")
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 180)
                            .onChange(of: viewModel.defaultTasksPermission) { _, _ in
                                Task { await viewModel.updateDefaultPermissions(tribeId: tribe.id) }
                            }
                        }

                        // Appointments
                        HStack {
                            Label("Appointments", systemImage: "calendar")
                            Spacer()
                            Picker("", selection: $viewModel.defaultAppointmentsPermission) {
                                Text("Propose").tag("propose")
                                Text("Add Directly").tag("add")
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 180)
                            .onChange(of: viewModel.defaultAppointmentsPermission) { _, _ in
                                Task { await viewModel.updateDefaultPermissions(tribeId: tribe.id) }
                            }
                        }

                        // Routines
                        HStack {
                            Label("Routines", systemImage: "repeat")
                            Spacer()
                            Picker("", selection: $viewModel.defaultRoutinesPermission) {
                                Text("Propose").tag("propose")
                                Text("Add Directly").tag("add")
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 180)
                            .onChange(of: viewModel.defaultRoutinesPermission) { _, _ in
                                Task { await viewModel.updateDefaultPermissions(tribeId: tribe.id) }
                            }
                        }

                        // Groceries
                        HStack {
                            Label("Groceries", systemImage: "cart")
                            Spacer()
                            Picker("", selection: $viewModel.defaultGroceriesPermission) {
                                Text("Propose").tag("propose")
                                Text("Add Directly").tag("add")
                            }
                            .pickerStyle(.segmented)
                            .frame(width: 180)
                            .onChange(of: viewModel.defaultGroceriesPermission) { _, _ in
                                Task { await viewModel.updateDefaultPermissions(tribeId: tribe.id) }
                            }
                        }
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("Default Member Permissions")
                }
            } else {
                // Friend tribe - fixed permissions
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Label("Messages", systemImage: "message")
                        Label("Propose Appointments", systemImage: "calendar.badge.plus")
                        Label("Propose Tasks", systemImage: "checklist")
                    }
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                } header: {
                    Text("Friend Tribe Features")
                } footer: {
                    Text("Friend tribes use proposal-only mode. Routines and groceries are not available.")
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
    @StateObject private var viewModel: TribeMembersViewModel
    @State private var showingInvite = false
    
    init(tribe: Tribe) {
        self.tribe = tribe
        self._viewModel = StateObject(wrappedValue: AppContainer.shared.makeTribeMembersViewModel())
    }
    
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
                HStack(spacing: 6) {
                    Text(memberDisplayName)
                        .font(.body)

                    if member.isAdmin {
                        Label("Admin", systemImage: "star.fill")
                            .font(.caption2)
                            .foregroundColor(.purple)
                    }

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
                } else if member.useTribeDefaults {
                    Text("Using tribe defaults")
                        .font(.caption)
                        .foregroundColor(.blue)
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

    private var memberDisplayName: String {
        if let name = member.displayName, !name.isEmpty {
            return name
        }
        return "Member"
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
            // Member info section
            memberInfoSection

            // Admin role section (owner only, not for themselves)
            if tribe.isOwner && member.userId != tribe.ownerId {
                adminRoleSection
            }

            // Permissions section
            permissionsSection
        }
        .navigationTitle("Member Details")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Success", isPresented: $viewModel.showSuccess) {
            Button("OK") {
                dismiss()
            }
        } message: {
            Text("Settings updated successfully")
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK", role: .cancel) {}
        } message: {
            if let error = viewModel.error {
                Text(error.localizedDescription)
            }
        }
        .task {
            viewModel.loadMemberSettings(member: member, tribe: tribe)
        }
    }

    // MARK: - Member Info Section

    private var memberInfoSection: some View {
        Section {
            HStack {
                Text("Status")
                Spacer()
                Text(member.isAccepted ? "Active" : "Pending")
                    .foregroundColor(member.isAccepted ? .green : .orange)
            }

            if let displayName = member.displayName, !displayName.isEmpty {
                HStack {
                    Text("Display Name")
                    Spacer()
                    Text(displayName)
                        .foregroundColor(.secondary)
                }
            }

            if member.isAdmin || member.userId == tribe.ownerId {
                HStack {
                    Text("Role")
                    Spacer()
                    Label(
                        member.userId == tribe.ownerId ? "Owner" : "Admin",
                        systemImage: member.userId == tribe.ownerId ? "crown.fill" : "star.fill"
                    )
                    .foregroundColor(.purple)
                    .font(.subheadline)
                }
            }
        }
    }

    // MARK: - Admin Role Section

    private var adminRoleSection: some View {
        Section {
            Toggle(isOn: $viewModel.isAdmin) {
                Label("Member Admin", systemImage: "star.fill")
            }
            .onChange(of: viewModel.isAdmin) { _, _ in
                viewModel.hasUnsavedChanges = true
            }
        } header: {
            Text("Admin Role")
        } footer: {
            Text("Admins can manage tribe settings and members, similar to the owner.")
        }
    }

    // MARK: - Permissions Section

    @ViewBuilder
    private var permissionsSection: some View {
        if member.userId == tribe.ownerId {
            Section {
                Text("Owners have full permissions for all categories")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            } header: {
                Text("Member Permissions")
            }
        } else if tribe.isOwner || (tribe.isOwner == false && member.isAdmin) {
            // Show permissions management for owner, or read-only for non-owners
            if tribe.isOwner {
                ownerPermissionsSection
            } else {
                Section {
                    Text("Only the Tribe owner can manage member permissions")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                } header: {
                    Text("Member Permissions")
                }
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

    // MARK: - Owner Permissions Section (Inherit/Override Pattern)

    private var ownerPermissionsSection: some View {
        Group {
            // Use Tribe Defaults toggle
            Section {
                Toggle(isOn: $viewModel.useTribeDefaults) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Use Tribe Defaults")
                        Text("Inherit permissions from tribe settings")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .onChange(of: viewModel.useTribeDefaults) { _, _ in
                    viewModel.hasUnsavedChanges = true
                }
            } header: {
                Text("Permission Mode")
            } footer: {
                if viewModel.useTribeDefaults {
                    Text("This member uses the tribe's default permissions. Turn off to customize.")
                } else {
                    Text("Custom permissions override the tribe defaults for this member.")
                }
            }

            // Permissions content - read-only if using defaults, editable if custom
            Section {
                if viewModel.useTribeDefaults {
                    inheritedPermissionsView
                } else {
                    customPermissionsView
                }
            } header: {
                HStack {
                    Text("Permissions")
                    Spacer()
                    if viewModel.useTribeDefaults {
                        Label("Inherited", systemImage: "arrow.down.circle.fill")
                            .font(.caption)
                            .foregroundColor(.blue)
                    } else {
                        Label("Custom", systemImage: "pencil.circle.fill")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
            }

            // Save button
            if viewModel.hasUnsavedChanges {
                Section {
                    Button {
                        Task {
                            await viewModel.saveSettings(tribeId: tribe.id, memberId: member.id)
                        }
                    } label: {
                        if viewModel.isSaving {
                            HStack {
                                Spacer()
                                ProgressView()
                                Spacer()
                            }
                        } else {
                            Text("Save Changes")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(viewModel.isSaving)
                }
            }
        }
    }

    // MARK: - Inherited Permissions View (Read-only)

    private var inheritedPermissionsView: some View {
        VStack(alignment: .leading, spacing: 12) {
            inheritedPermissionRow(
                category: "Tasks",
                icon: "checklist",
                permission: viewModel.defaultTasksPermission
            )

            Divider()

            inheritedPermissionRow(
                category: "Appointments",
                icon: "calendar",
                permission: viewModel.defaultAppointmentsPermission
            )

            if tribe.isFamily {
                Divider()

                inheritedPermissionRow(
                    category: "Routines",
                    icon: "repeat",
                    permission: viewModel.defaultRoutinesPermission
                )

                Divider()

                inheritedPermissionRow(
                    category: "Groceries",
                    icon: "cart",
                    permission: viewModel.defaultGroceriesPermission
                )
            }
        }
        .padding(.vertical, 4)
    }

    private func inheritedPermissionRow(category: String, icon: String, permission: String) -> some View {
        HStack {
            Label(category, systemImage: icon)
            Spacer()
            Text(permission == "add" ? "Add Directly" : "Propose Only")
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(6)
        }
    }

    // MARK: - Custom Permissions View (Editable)

    private var customPermissionsView: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Tasks
            VStack(alignment: .leading, spacing: 8) {
                Label("Tasks", systemImage: "checklist")
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Toggle("Can Add Tasks", isOn: $viewModel.canAddTasks)
                    .onChange(of: viewModel.canAddTasks) { _, _ in viewModel.hasUnsavedChanges = true }
                Toggle("Can Remove Tasks", isOn: $viewModel.canRemoveTasks)
                    .onChange(of: viewModel.canRemoveTasks) { _, _ in viewModel.hasUnsavedChanges = true }
            }

            Divider()

            // Appointments
            VStack(alignment: .leading, spacing: 8) {
                Label("Appointments", systemImage: "calendar")
                    .font(.subheadline)
                    .fontWeight(.semibold)

                Toggle("Can Add Appointments", isOn: $viewModel.canAddAppointments)
                    .onChange(of: viewModel.canAddAppointments) { _, _ in viewModel.hasUnsavedChanges = true }
                Toggle("Can Remove Appointments", isOn: $viewModel.canRemoveAppointments)
                    .onChange(of: viewModel.canRemoveAppointments) { _, _ in viewModel.hasUnsavedChanges = true }
            }

            if tribe.isFamily {
                Divider()

                // Routines
                VStack(alignment: .leading, spacing: 8) {
                    Label("Routines", systemImage: "repeat")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Toggle("Can Add Routines", isOn: $viewModel.canAddRoutines)
                        .onChange(of: viewModel.canAddRoutines) { _, _ in viewModel.hasUnsavedChanges = true }
                    Toggle("Can Remove Routines", isOn: $viewModel.canRemoveRoutines)
                        .onChange(of: viewModel.canRemoveRoutines) { _, _ in viewModel.hasUnsavedChanges = true }
                }

                Divider()

                // Groceries
                VStack(alignment: .leading, spacing: 8) {
                    Label("Groceries", systemImage: "cart")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Toggle("Can Add Groceries", isOn: $viewModel.canAddGroceries)
                        .onChange(of: viewModel.canAddGroceries) { _, _ in viewModel.hasUnsavedChanges = true }
                    Toggle("Can Remove Groceries", isOn: $viewModel.canRemoveGroceries)
                        .onChange(of: viewModel.canRemoveGroceries) { _, _ in viewModel.hasUnsavedChanges = true }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Invite Member View

struct InviteMemberView: View {
    let tribe: Tribe
    let onComplete: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var showingContacts = false
    @State private var selectedUserId: String?
    @State private var selectedContactName: String?
    @State private var isSending = false
    @State private var error: Error?
    @State private var showError = false
    @State private var showSuccess = false

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
                Section {
                    Button {
                        showingContacts = true
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(selectedUserId == nil ? "Choose Contact" : "Contact Selected")
                                    .foregroundColor(selectedUserId == nil ? .blue : .primary)
                                
                                if let name = selectedContactName {
                                    Text(name)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                            Spacer()
                            Image(systemName: "chevron.right")
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("Select Contact")
                } footer: {
                    Text("Your personal invitation will be waiting for them when they join HelpEm! They'll see it's from you and can choose to accept.")
                }

                Section {
                    Toggle("Can Add Tasks", isOn: $canAddTasks)
                    Toggle("Can Remove Tasks", isOn: $canRemoveTasks)
                    Toggle("Can Add Routines", isOn: $canAddRoutines)
                    Toggle("Can Remove Routines", isOn: $canRemoveRoutines)
                    Toggle("Can Add Appointments", isOn: $canAddAppointments)
                    Toggle("Can Remove Appointments", isOn: $canRemoveAppointments)
                    Toggle("Can Add Groceries", isOn: $canAddGroceries)
                    Toggle("Can Remove Groceries", isOn: $canRemoveGroceries)
                } header: {
                    Text("Permissions")
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
            .alert("Invitation Ready! 🎉", isPresented: $showSuccess) {
                Button("Done") {
                    onComplete()
                    dismiss()
                }
            } message: {
                if let name = selectedContactName {
                    Text("\(name) will see your personal invitation to join '\(tribe.name)' when they sign up for HelpEm. They'll be excited to collaborate with you!")
                } else {
                    Text("Your personal invitation to join '\(tribe.name)' is ready and waiting!")
                }
            }
            .sheet(isPresented: $showingContacts) {
                ContactsPickerView(tribe: tribe) { userId, contactName in
                    selectedUserId = userId
                    selectedContactName = contactName
                }
            }
        }
    }

    private func sendInvite() async {
        guard let contactId = selectedUserId else { 
            AppLogger.error("No contact ID selected for invite", logger: AppLogger.general)
            return 
        }
        
        isSending = true
        defer { isSending = false }

        do {
            AppLogger.info("Sending invite to contact: \(contactId) for tribe: \(tribe.id)", logger: AppLogger.general)
            
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
            
            // Determine contact type (email or phone)
            let contactType = contactId.contains("@") ? "email" : "phone"
            
            let invitation = try await AppContainer.shared.tribeRepository.inviteContact(
                tribeId: tribe.id,
                contactIdentifier: contactId,
                contactType: contactType,
                contactName: selectedContactName,
                permissions: permissions
            )
            AppLogger.info("Contact invited successfully: \(invitation.id)", logger: AppLogger.general)

            showSuccess = true
        } catch {
            AppLogger.error("Failed to send invite: \(error.localizedDescription)", logger: AppLogger.general)
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
    @Published var tribeDeleted = false
    @Published var tribeLeft = false
    @Published var isUploadingAvatar = false

    // Tribe-wide default permissions (Family tribes only)
    @Published var defaultTasksPermission = "propose" // "propose" or "add"
    @Published var defaultAppointmentsPermission = "propose"
    @Published var defaultRoutinesPermission = "propose"
    @Published var defaultGroceriesPermission = "propose"

    private var currentMemberId: String?
    private let repository: TribeRepository
    
    init(repository: TribeRepository) {
        self.repository = repository
    }
    
    convenience init() {
        self.init(repository: AppContainer.shared.tribeRepository)
    }
    
    func loadSettings(tribeId: String) async {
        // Load current member settings
        do {
            _ = try await repository.getMembers(tribeId: tribeId)
            // Find current user's membership
            // Note: In real implementation, we'd need to know current user ID
            // For now, this is a placeholder
            AppLogger.info("Loaded tribe settings", logger: AppLogger.general)
        } catch {
            AppLogger.error("Failed to load settings: \(error)", logger: AppLogger.general)
        }
    }

    /// Load default permissions from tribe
    func loadDefaultPermissions(from tribe: Tribe) {
        defaultTasksPermission = tribe.defaultTasksPermission
        defaultAppointmentsPermission = tribe.defaultAppointmentsPermission
        defaultRoutinesPermission = tribe.defaultRoutinesPermission
        defaultGroceriesPermission = tribe.defaultGroceriesPermission
    }

    /// Update tribe default permissions (owner only)
    func updateDefaultPermissions(tribeId: String) async {
        do {
            _ = try await repository.updateTribeDefaultPermissions(
                id: tribeId,
                defaultTasksPermission: defaultTasksPermission,
                defaultAppointmentsPermission: defaultAppointmentsPermission,
                defaultRoutinesPermission: defaultRoutinesPermission,
                defaultGroceriesPermission: defaultGroceriesPermission
            )
            AppLogger.info("Updated tribe default permissions", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
            AppLogger.error("Failed to update default permissions: \(error)", logger: AppLogger.general)
        }
    }
    
    func updateNotificationPreferences(tribeId: String, proposalNotifs: Bool, digestNotifs: Bool) async {
        guard let memberId = currentMemberId else {
            AppLogger.error("No member ID available", logger: AppLogger.general)
            return
        }
        
        do {
            _ = try await repository.updateMemberSettings(
                tribeId: tribeId,
                memberId: memberId,
                managementScope: nil,
                proposalNotifications: proposalNotifs,
                digestNotifications: digestNotifs,
                permissions: nil,
                isAdmin: nil,
                useTribeDefaults: nil
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
            _ = try await repository.updateMemberSettings(
                tribeId: tribeId,
                memberId: memberId,
                managementScope: scope,
                proposalNotifications: nil,
                digestNotifications: nil,
                permissions: nil,
                isAdmin: nil,
                useTribeDefaults: nil
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
            _ = try await repository.renameTribe(id: tribeId, newName: newName)
            AppLogger.info("Renamed tribe", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
        }
    }
    
    func updateTribeAvatar(tribeId: String, avatarUrl: String) async {
        isUploadingAvatar = true
        defer { isUploadingAvatar = false }
        do {
            _ = try await repository.updateTribeAvatar(id: tribeId, avatarUrl: avatarUrl)
            AppLogger.info("Updated tribe avatar", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
        }
    }
    
    func deleteTribe(tribeId: String) async {
        do {
            try await repository.deleteTribe(id: tribeId)
            AppLogger.info("Deleted tribe", logger: AppLogger.general)
            self.tribeDeleted = true
        } catch {
            self.error = error
            self.showError = true
        }
    }
    
    func leaveTribe(tribeId: String) async {
        do {
            try await repository.leaveTribe(id: tribeId)
            AppLogger.info("Left tribe", logger: AppLogger.general)
            self.tribeLeft = true
        } catch {
            self.error = error
            self.showError = true
        }
    }
}

// Note: TribeMembersViewModel has been moved to Architecture/ViewModels/TribeMembersViewModel.swift
// This provides better separation of concerns and follows Clean Architecture principles

@MainActor
class MemberDetailViewModel: ObservableObject {
    // Member settings
    @Published var isAdmin = false
    @Published var useTribeDefaults = true
    @Published var hasUnsavedChanges = false

    // Custom permissions (used when useTribeDefaults is false)
    @Published var canAddTasks = true
    @Published var canRemoveTasks = false
    @Published var canAddRoutines = true
    @Published var canRemoveRoutines = false
    @Published var canAddAppointments = true
    @Published var canRemoveAppointments = false
    @Published var canAddGroceries = true
    @Published var canRemoveGroceries = false

    // Tribe default permissions (read-only, inherited from tribe)
    @Published var defaultTasksPermission = "propose"
    @Published var defaultAppointmentsPermission = "propose"
    @Published var defaultRoutinesPermission = "propose"
    @Published var defaultGroceriesPermission = "propose"

    @Published var isSaving = false
    @Published var showSuccess = false
    @Published var showError = false
    @Published var error: Error?

    private var memberId: String?
    private let repository: TribeRepository

    init(repository: TribeRepository) {
        self.repository = repository
    }

    convenience init() {
        self.init(repository: AppContainer.shared.tribeRepository)
    }

    func loadMemberSettings(member: TribeMember, tribe: Tribe) {
        self.memberId = member.id
        self.isAdmin = member.isAdmin
        self.useTribeDefaults = member.useTribeDefaults

        // Load member's custom permissions
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

        // Set tribe defaults based on tribe type
        if tribe.isFriend {
            // Friend tribes: propose only for tasks and appointments, no routines/groceries
            defaultTasksPermission = "propose"
            defaultAppointmentsPermission = "propose"
            defaultRoutinesPermission = "none"
            defaultGroceriesPermission = "none"
        } else {
            // Family tribes: load actual tribe defaults
            defaultTasksPermission = tribe.defaultTasksPermission
            defaultAppointmentsPermission = tribe.defaultAppointmentsPermission
            defaultRoutinesPermission = tribe.defaultRoutinesPermission
            defaultGroceriesPermission = tribe.defaultGroceriesPermission
        }

        hasUnsavedChanges = false
    }

    func saveSettings(tribeId: String, memberId: String) async {
        isSaving = true
        defer { isSaving = false }

        // Build permissions update only if using custom permissions
        let permissionsUpdate: PermissionsUpdate? = useTribeDefaults ? nil : PermissionsUpdate(
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
            // Update member settings including isAdmin and useTribeDefaults
            let updatedMember = try await repository.updateMemberSettings(
                tribeId: tribeId,
                memberId: memberId,
                managementScope: nil,
                proposalNotifications: nil,
                digestNotifications: nil,
                permissions: permissionsUpdate,
                isAdmin: isAdmin,
                useTribeDefaults: useTribeDefaults
            )

            // Update local state with server response
            self.isAdmin = updatedMember.isAdmin
            self.useTribeDefaults = updatedMember.useTribeDefaults

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

            hasUnsavedChanges = false
            showSuccess = true
            AppLogger.info("Saved member settings (admin: \(isAdmin), useTribeDefaults: \(useTribeDefaults))", logger: AppLogger.general)
        } catch {
            self.error = error
            self.showError = true
            AppLogger.error("Failed to save member settings: \(error)", logger: AppLogger.general)
        }
    }
}
