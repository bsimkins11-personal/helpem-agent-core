import SwiftUI
import PhotosUI

/// Profile setup view - shown after sign-in when user needs to set display name
struct ProfileSetupView: View {
    @ObservedObject var authManager: AuthManager
    @State private var displayName: String = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var avatarImage: UIImage?
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Text("Set Up Your Profile")
                        .font(.title.bold())

                    Text("Choose a name that others in your Tribes will see")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .padding(.top, 40)

                // Avatar picker
                PhotosPicker(selection: $selectedPhoto, matching: .images) {
                    ZStack {
                        if let avatarImage = avatarImage {
                            Image(uiImage: avatarImage)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 120, height: 120)
                                .clipShape(Circle())
                        } else {
                            Circle()
                                .fill(Color.blue.opacity(0.1))
                                .frame(width: 120, height: 120)
                                .overlay {
                                    Image(systemName: "person.fill")
                                        .font(.system(size: 50))
                                        .foregroundColor(.blue.opacity(0.5))
                                }
                        }

                        // Camera badge
                        Circle()
                            .fill(.blue)
                            .frame(width: 36, height: 36)
                            .overlay {
                                Image(systemName: "camera.fill")
                                    .foregroundColor(.white)
                                    .font(.system(size: 16))
                            }
                            .offset(x: 40, y: 40)
                    }
                }
                .onChange(of: selectedPhoto) { _, newItem in
                    Task {
                        if let data = try? await newItem?.loadTransferable(type: Data.self),
                           let uiImage = UIImage(data: data) {
                            // Resize to 128x128 square for small avatars
                            avatarImage = uiImage.resizedSquare(to: 128)
                        }
                    }
                }

                Text("Add Photo (Optional)")
                    .font(.caption)
                    .foregroundColor(.secondary)

                // Name input
                VStack(alignment: .leading, spacing: 8) {
                    Text("Display Name")
                        .font(.subheadline.weight(.medium))
                        .foregroundColor(.secondary)

                    TextField("Enter your name", text: $displayName)
                        .textFieldStyle(.roundedBorder)
                        .textContentType(.name)
                        .autocorrectionDisabled()
                }
                .padding(.horizontal)

                if let error = errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                }

                Spacer()

                // Continue button
                Button(action: saveProfile) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Continue")
                            .font(.headline)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(displayName.trimmingCharacters(in: .whitespaces).isEmpty ? Color.gray : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
                .padding(.horizontal)
                .disabled(displayName.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)

                // Skip button
                Button("Skip for now") {
                    authManager.needsDisplayName = false
                }
                .font(.subheadline)
                .foregroundColor(.secondary)
                .padding(.bottom, 20)
            }
            .padding()
        }
    }

    private func saveProfile() {
        let trimmedName = displayName.trimmingCharacters(in: .whitespaces)
        guard !trimmedName.isEmpty else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                // Convert photo to data URL if provided
                var avatarUrl: String?
                if let image = avatarImage {
                    if let dataUrl = image.jpegData(compressionQuality: 0.6)?.asDataURL() {
                        avatarUrl = dataUrl
                    }
                }

                try await authManager.updateProfile(displayName: trimmedName, avatarUrl: avatarUrl)
                authManager.needsDisplayName = false
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}
