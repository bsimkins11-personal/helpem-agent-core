import SwiftUI
import Combine
import Contacts

/// Contacts Picker for inviting Tribe members
/// 
/// CRITICAL: Request Contacts permission only when user taps "Add someone to Tribe"
/// No background sync, no uploading contact lists
struct ContactsPickerView: View {
    let tribe: Tribe
    let onSelect: (String) -> Void
    
    @StateObject private var viewModel = ContactsPickerViewModel()
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            Group {
                switch viewModel.permissionStatus {
                case .notDetermined:
                    permissionPrompt
                case .denied:
                    deniedState
                case .authorized:
                    if viewModel.isLoading {
                        ProgressView("Loading contacts...")
                    } else if viewModel.contacts.isEmpty {
                        emptyState
                    } else {
                        contactsList
                    }
                }
            }
            .navigationTitle("Invite to Tribe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .task {
                viewModel.checkPermissionStatus()
            }
        }
    }
    
    private var permissionPrompt: some View {
        VStack(spacing: 20) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 60))
                .foregroundColor(.blue)
            
            Text("Add Someone to Tribe")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("To invite someone, we need access to your contacts. We only request this when you want to add someone.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            
            Button {
                Task {
                    await viewModel.requestPermission()
                }
            } label: {
                Text("Continue")
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
            .padding(.horizontal, 32)
            
            Text("No background sync. No uploading contacts.")
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    private var deniedState: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.orange)
            
            Text("Contacts Access Denied")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("To invite someone from your contacts, please enable Contacts access in Settings.")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
            
            Button {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            } label: {
                Text("Open Settings")
                    .fontWeight(.medium)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
            }
            .padding(.horizontal, 32)
        }
    }
    
    private var contactsList: some View {
        List {
            ForEach(viewModel.contacts, id: \.identifier) { contact in
                Button {
                    handleContactSelection(contact)
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(contact.givenName) \(contact.familyName)")
                                .font(.body)
                            
                            if let phone = contact.phoneNumbers.first?.value.stringValue {
                                Text(phone)
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
            }
        }
        .searchable(text: $viewModel.searchText, prompt: "Search contacts")
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.crop.circle")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Contacts")
                .font(.title3)
                .fontWeight(.semibold)
            
            Text("No contacts available to invite.")
                .font(.body)
                .foregroundColor(.secondary)
        }
    }
    
    private func handleContactSelection(_ contact: CNContact) {
        // In a real implementation, we would:
        // 1. Check if contact is a Helpem user (by phone/email)
        // 2. If yes, send in-app invite
        // 3. If no, send SMS/iMessage/Email with deep link
        
        // For now, simulate user ID
        let userId = contact.identifier
        onSelect(userId)
        dismiss()
    }
}

// MARK: - View Model

@MainActor
class ContactsPickerViewModel: ObservableObject {
    @Published var contacts: [CNContact] = []
    @Published var isLoading = false
    @Published var searchText = ""
    @Published var permissionStatus: PermissionStatus = .notDetermined
    
    private let contactStore = CNContactStore()
    
    enum PermissionStatus {
        case notDetermined
        case denied
        case authorized
    }
    
    func checkPermissionStatus() {
        let status = CNContactStore.authorizationStatus(for: .contacts)
        
        switch status {
        case .notDetermined:
            permissionStatus = .notDetermined
        case .denied, .restricted:
            permissionStatus = .denied
        case .authorized, .limited:
            permissionStatus = .authorized
            Task {
                await loadContacts()
            }
        @unknown default:
            permissionStatus = .notDetermined
        }
    }
    
    func requestPermission() async {
        do {
            let granted = try await contactStore.requestAccess(for: .contacts)
            
            if granted {
                permissionStatus = .authorized
                await loadContacts()
                AppLogger.info("Contacts permission granted", logger: AppLogger.general)
            } else {
                permissionStatus = .denied
                AppLogger.info("Contacts permission denied", logger: AppLogger.general)
            }
        } catch {
            permissionStatus = .denied
            AppLogger.error("Failed to request contacts permission: \(error)", logger: AppLogger.general)
        }
    }
    
    func loadContacts() async {
        isLoading = true
        defer { isLoading = false }
        
        let keys = [
            CNContactGivenNameKey,
            CNContactFamilyNameKey,
            CNContactPhoneNumbersKey,
            CNContactEmailAddressesKey
        ] as [CNKeyDescriptor]
        
        let request = CNContactFetchRequest(keysToFetch: keys)
        
        var fetchedContacts: [CNContact] = []
        
        do {
            try contactStore.enumerateContacts(with: request) { contact, _ in
                fetchedContacts.append(contact)
            }
            
            contacts = fetchedContacts.sorted { c1, c2 in
                let name1 = "\(c1.givenName) \(c1.familyName)"
                let name2 = "\(c2.givenName) \(c2.familyName)"
                return name1 < name2
            }
            
            AppLogger.info("Loaded \(contacts.count) contacts", logger: AppLogger.general)
        } catch {
            AppLogger.error("Failed to load contacts: \(error)", logger: AppLogger.general)
        }
    }
}
