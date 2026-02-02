import SwiftUI
import PhotosUI

/// Profile settings view - allows users to manage their profile
struct ProfileSettingsView: View {
    @ObservedObject var authManager: AuthManager
    @State private var displayName: String = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var avatarImage: UIImage?
    @State private var hasPhotoChanged = false
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    var body: some View {
        Form {
            // Avatar section
            Section {
                HStack {
                    Spacer()
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        ZStack {
                            if let avatarImage = avatarImage {
                                Image(uiImage: avatarImage)
                                    .resizable()
                                    .scaledToFill()
                                    .frame(width: 100, height: 100)
                                    .clipShape(Circle())
                            } else {
                                Circle()
                                    .fill(Color.blue.opacity(0.1))
                                    .frame(width: 100, height: 100)
                                    .overlay {
                                        Image(systemName: "person.fill")
                                            .font(.system(size: 40))
                                            .foregroundColor(.blue.opacity(0.5))
                                    }
                            }

                            Circle()
                                .fill(.blue)
                                .frame(width: 30, height: 30)
                                .overlay {
                                    Image(systemName: "camera.fill")
                                        .foregroundColor(.white)
                                        .font(.system(size: 14))
                                }
                                .offset(x: 35, y: 35)
                        }
                    }
                    Spacer()
                }
                .listRowBackground(Color.clear)
            }
            .onChange(of: selectedPhoto) { _, newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let uiImage = UIImage(data: data) {
                        // Resize to 128x128 square for small avatars
                        avatarImage = uiImage.resizedSquare(to: 128)
                        hasPhotoChanged = true
                    }
                }
            }

            // Display name section
            Section {
                TextField("Display Name", text: $displayName)
                    .textContentType(.name)
                    .autocorrectionDisabled()
            } header: {
                Text("Display Name")
            } footer: {
                Text("This is the name others will see in your Tribes.")
            }

            // Info section
            Section {
                HStack {
                    Text("Email")
                    Spacer()
                    Text(authManager.currentUserId != nil ? "Connected via Apple" : "Not connected")
                        .foregroundColor(.secondary)
                }
            } header: {
                Text("Account")
            }

            // Evangelist Program
            Section {
                NavigationLink {
                    EvangelistSectionView()
                } label: {
                    HStack {
                        Label("Evangelist Program", systemImage: "star.circle.fill")
                            .foregroundColor(.orange)
                        Spacer()
                        // Show badge if active (would need to load this)
                    }
                }
            } header: {
                Text("Spread the Word")
            } footer: {
                Text("Earn Evangelist badges by inviting friends to HelpEm!")
            }

            // Save button
            Section {
                Button(action: saveProfile) {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("Save Changes")
                        }
                        Spacer()
                    }
                }
                .disabled(isSaving || displayName.trimmingCharacters(in: .whitespaces).isEmpty)
            }

            if let error = errorMessage {
                Section {
                    HStack {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundColor(.red)
                        Text(error)
                            .foregroundColor(.red)
                    }
                }
            }

            if let success = successMessage {
                Section {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                        Text(success)
                            .foregroundColor(.green)
                            .fontWeight(.medium)
                    }
                }
            }
        }
        .onAppear {
            displayName = authManager.currentDisplayName ?? ""
            loadExistingAvatar()
        }
    }

    private func loadExistingAvatar() {
        guard let avatarUrlString = authManager.currentAvatarUrl else { return }

        // Handle data URLs (base64)
        if avatarUrlString.hasPrefix("data:") {
            if let commaIndex = avatarUrlString.firstIndex(of: ",") {
                let base64String = String(avatarUrlString[avatarUrlString.index(after: commaIndex)...])
                if let data = Data(base64Encoded: base64String),
                   let image = UIImage(data: data) {
                    avatarImage = image
                }
            }
        } else if let url = URL(string: avatarUrlString) {
            // Handle regular URLs
            Task {
                if let (data, _) = try? await URLSession.shared.data(from: url),
                   let image = UIImage(data: data) {
                    await MainActor.run {
                        avatarImage = image
                    }
                }
            }
        }
    }

    private func saveProfile() {
        let trimmedName = displayName.trimmingCharacters(in: .whitespaces)
        guard !trimmedName.isEmpty else { return }

        isSaving = true
        errorMessage = nil
        successMessage = nil

        Task {
            do {
                // Convert photo to data URL if changed
                var avatarUrl: String?
                if hasPhotoChanged, let image = avatarImage {
                    if let dataUrl = image.jpegData(compressionQuality: 0.6)?.asDataURL() {
                        avatarUrl = dataUrl
                    }
                }

                try await authManager.updateProfile(displayName: trimmedName, avatarUrl: avatarUrl)
                hasPhotoChanged = false
                successMessage = "Profile saved!"
            } catch {
                errorMessage = error.localizedDescription
            }
            isSaving = false
        }
    }
}
