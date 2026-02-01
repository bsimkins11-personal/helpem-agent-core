import SwiftUI
import Combine
import Contacts

/// Selected contact info for multi-select
struct SelectedContact: Identifiable, Equatable {
    let id: String // contactId (email or phone)
    let name: String

    static func == (lhs: SelectedContact, rhs: SelectedContact) -> Bool {
        lhs.id == rhs.id
    }
}

/// Contacts Picker for inviting Tribe members
///
/// CRITICAL: Request Contacts permission only when user taps "Add someone to Tribe"
/// No background sync, no uploading contact lists
struct ContactsPickerView: View {
    let tribe: Tribe
    let multiSelect: Bool
    let onSelect: (String, String) -> Void // (contactId, contactName) - single select
    let onMultiSelect: ([SelectedContact]) -> Void // multi-select

    @StateObject private var viewModel = ContactsPickerViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var selectedContacts: [SelectedContact] = []

    init(tribe: Tribe, multiSelect: Bool = false, onSelect: @escaping (String, String) -> Void = { _, _ in }, onMultiSelect: @escaping ([SelectedContact]) -> Void = { _ in }) {
        self.tribe = tribe
        self.multiSelect = multiSelect
        self.onSelect = onSelect
        self.onMultiSelect = onMultiSelect
    }

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
            .navigationTitle(multiSelect ? "Select Contacts" : "Invite to Tribe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                if multiSelect && !selectedContacts.isEmpty {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done (\(selectedContacts.count))") {
                            onMultiSelect(selectedContacts)
                            dismiss()
                        }
                    }
                }
            }
            .alert("Invalid Contact", isPresented: $viewModel.showContactError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("This contact doesn't have an email address or phone number. Please select a contact with at least one of these.")
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
            
            Text("Invite Someone Special")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Choose someone to join your HelpEm tribe. They'll get a personal invitation from you when they sign up!")
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
            ForEach(viewModel.filteredContacts, id: \.identifier) { contact in
                Button {
                    handleContactSelection(contact)
                } label: {
                    HStack {
                        if multiSelect {
                            // Checkmark for multi-select
                            Image(systemName: isSelected(contact) ? "checkmark.circle.fill" : "circle")
                                .foregroundColor(isSelected(contact) ? .blue : .gray)
                                .font(.title2)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text("\(contact.givenName) \(contact.familyName)")
                                .font(.body)
                                .foregroundColor(.primary)

                            // Show email if available, otherwise phone
                            if let email = contact.emailAddresses.first?.value as String?,
                               !email.isEmpty {
                                Text(email)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            } else if let phone = contact.phoneNumbers.first?.value.stringValue {
                                Text(phone)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()

                        if !multiSelect {
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .searchable(text: $viewModel.searchText, prompt: "Search contacts")
    }

    private func isSelected(_ contact: CNContact) -> Bool {
        guard let contactId = getContactId(contact) else { return false }
        return selectedContacts.contains { $0.id == contactId }
    }

    private func getContactId(_ contact: CNContact) -> String? {
        if let email = contact.emailAddresses.first?.value as String?, !email.isEmpty {
            return email
        } else if let phone = contact.phoneNumbers.first?.value.stringValue, !phone.isEmpty {
            return phone.replacingOccurrences(of: "[^0-9]", with: "", options: .regularExpression)
        }
        return nil
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
        // Extract email or phone from contact
        guard let contactId = getContactId(contact) else {
            let contactName = "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)
            AppLogger.error("Contact has no email or phone: \(contactName)", logger: AppLogger.general)
            viewModel.showContactError = true
            return
        }

        let contactName = "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)

        if multiSelect {
            // Toggle selection
            if let index = selectedContacts.firstIndex(where: { $0.id == contactId }) {
                selectedContacts.remove(at: index)
            } else {
                selectedContacts.append(SelectedContact(id: contactId, name: contactName))
            }
        } else {
            // Single select - immediately return
            AppLogger.info("Selected contact: \(contactName), userId: \(contactId)", logger: AppLogger.general)
            onSelect(contactId, contactName)
            dismiss()
        }
    }
}

// MARK: - View Model

@MainActor
class ContactsPickerViewModel: ObservableObject {
    @Published var contacts: [CNContact] = []
    @Published var isLoading = false
    @Published var searchText = ""
    @Published var permissionStatus: PermissionStatus = .notDetermined
    @Published var showContactError = false

    private let contactStore = CNContactStore()

    enum PermissionStatus {
        case notDetermined
        case denied
        case authorized
    }

    var filteredContacts: [CNContact] {
        if searchText.isEmpty {
            return contacts
        }
        return contacts.filter { contact in
            let fullName = "\(contact.givenName) \(contact.familyName)".lowercased()
            return fullName.contains(searchText.lowercased())
        }
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
