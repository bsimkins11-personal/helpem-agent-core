import SwiftUI
import UIKit

/// Evangelist Program section - invite friends, earn rewards
struct EvangelistSectionView: View {
    @State private var referralInfo: ReferralInfo?
    @State private var isLoading = true
    @State private var error: Error?
    @State private var referralCode: String?
    @State private var showCopiedToast = false

    var body: some View {
        List {
            // Your Stats Section
            if let info = referralInfo {
                Section {
                    // Badge and signup count
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            if info.hasBadge {
                                HStack(spacing: 8) {
                                    EvangelistBadge()
                                    Text("Evangelist")
                                        .font(.subheadline)
                                        .foregroundColor(.green)
                                }
                            } else {
                                Text("Invite friends to earn your badge!")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(info.signupCount)")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.orange)
                            Text("signups")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)

                    // Premium months earned
                    if info.earnedPremiumMonths > 0 {
                        HStack {
                            Label("Premium months earned", systemImage: "star.fill")
                                .foregroundColor(.purple)
                            Spacer()
                            Text("\(info.earnedPremiumMonths)")
                                .fontWeight(.bold)
                                .foregroundColor(.purple)
                        }
                    }

                    // Progress to next month
                    if info.signupCount > 0 {
                        HStack {
                            Text("Next premium month")
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(info.signupsToNextMonth) more signup\(info.signupsToNextMonth == 1 ? "" : "s")")
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("Your Rewards")
                }
            }

            // Invite Section
            Section {
                Button {
                    Task {
                        await shareInviteLink()
                    }
                } label: {
                    Label("Share Invite Link", systemImage: "square.and.arrow.up")
                }

                if let code = referralCode ?? referralInfo?.referralCode {
                    HStack {
                        Text("Your code:")
                            .foregroundColor(.secondary)
                        Spacer()
                        Text(code)
                            .font(.system(.body, design: .monospaced))
                            .fontWeight(.medium)
                        Button {
                            copyCode(code)
                        } label: {
                            Image(systemName: "doc.on.doc")
                                .foregroundColor(.blue)
                        }
                        .buttonStyle(.plain)
                    }
                }
            } header: {
                Text("Invite Friends")
            } footer: {
                Text("Friends get 2 free months when they sign up with your code!")
            }

            // How It Works Section
            Section {
                VStack(alignment: .leading, spacing: 16) {
                    HowItWorksRow(number: "1", text: "Share your invite link with friends")
                    HowItWorksRow(number: "2", text: "Friend signs up with your code")
                    HowItWorksRow(number: "3", text: "Friend gets 2 free months, you get the badge!")
                    HowItWorksRow(number: "4", text: "Every 5 signups = 1 premium month for you")
                }
                .padding(.vertical, 8)
            } header: {
                Text("How It Works")
            }

            // FAQ Section
            Section {
                DisclosureGroup {
                    Text("When a friend signs up using your referral code, you immediately earn the Evangelist badge. It shows next to your name in Tribes!")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                } label: {
                    Text("What's the Evangelist badge?")
                        .font(.subheadline)
                }

                DisclosureGroup {
                    Text("For every 5 friends who sign up with your code, you earn 1 month of Premium at the Basic rate.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                } label: {
                    Text("How do I earn Premium months?")
                        .font(.subheadline)
                }

                DisclosureGroup {
                    Text("Your friends get 2 months of HelpEm Basic for free when they sign up with your code. It's a win-win!")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                } label: {
                    Text("What do my friends get?")
                        .font(.subheadline)
                }
            } header: {
                Text("FAQ")
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle("Evangelist Program")
        .overlay {
            if showCopiedToast {
                VStack {
                    Spacer()
                    Text("Copied! Share it with a friend.")
                        .font(.subheadline)
                        .padding()
                        .background(.ultraThinMaterial)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .padding(.bottom, 32)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeInOut, value: showCopiedToast)
        .task {
            await loadReferralInfo()
        }
        .refreshable {
            await loadReferralInfo()
        }
    }

    private func loadReferralInfo() async {
        do {
            referralInfo = try await TribeAPIClient.shared.getReferralInfo()
            referralCode = referralInfo?.referralCode
        } catch {
            self.error = error
            AppLogger.error("Failed to load referral info: \(error)", logger: AppLogger.general)
        }
        isLoading = false
    }

    private func shareInviteLink() async {
        // Generate code if user doesn't have one
        if referralCode == nil && referralInfo?.referralCode == nil {
            do {
                referralCode = try await TribeAPIClient.shared.generateReferralCode()
            } catch {
                AppLogger.error("Failed to generate referral code: \(error)", logger: AppLogger.general)
                return
            }
        }

        guard let code = referralCode ?? referralInfo?.referralCode else { return }

        let shareURL = "https://helpem.ai/join?ref=\(code)"
        let shareText = "Join me on HelpEm - your AI assistant for daily life! Get 2 free months with my code: \(shareURL)"

        // Present share sheet
        let activityVC = UIActivityViewController(
            activityItems: [shareText],
            applicationActivities: nil
        )

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            var topVC = rootVC
            while let presented = topVC.presentedViewController {
                topVC = presented
            }
            topVC.present(activityVC, animated: true)
        }
    }

    private func copyCode(_ code: String) {
        UIPasteboard.general.string = code
        showCopiedToast = true

        // Hide toast after 2 seconds
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            showCopiedToast = false
        }
    }
}

/// Step indicator row for "How It Works" section
private struct HowItWorksRow: View {
    let number: String
    let text: String

    var body: some View {
        HStack(spacing: 12) {
            Text(number)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .frame(width: 24, height: 24)
                .background(Color.orange)
                .clipShape(Circle())
            Text(text)
                .font(.subheadline)
        }
    }
}

#Preview {
    NavigationStack {
        EvangelistSectionView()
    }
}
