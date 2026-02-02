import SwiftUI
import UIKit

/// Evangelist Program section - invite friends, earn badges
struct EvangelistSectionView: View {
    @State private var referralInfo: ReferralInfo?
    @State private var isLoading = true
    @State private var error: Error?
    @State private var referralCode: String?
    @State private var showCopiedToast = false

    var body: some View {
        List {
            // Badge Status Section
            if let info = referralInfo {
                Section {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            if info.hasBadge {
                                HStack(spacing: 8) {
                                    EvangelistBadge()
                                    Text("Active")
                                        .font(.subheadline)
                                        .foregroundColor(.green)
                                }
                                if let expires = info.badgeExpiresAt {
                                    Text("Expires \(expires.formatted(date: .abbreviated, time: .omitted))")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            } else {
                                Text("No active badge")
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(info.lifetimeCount)")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundColor(.orange)
                            Text("lifetime")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    Text("Your Badge")
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
                Text("When a friend signs up with your code and uses HelpEm for 7 days, you earn a 14-day Evangelist badge!")
            }

            // Stats Section (if has referrals)
            if let info = referralInfo, info.pendingReferees > 0 || info.lifetimeCount > 0 {
                Section {
                    HStack {
                        Text("Pending referrals")
                        Spacer()
                        Text("\(info.pendingReferees)")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("This month")
                        Spacer()
                        Text("\(info.monthlyRewardCount) / \(info.monthlyRewardLimit)")
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Lifetime limit")
                        Spacer()
                        Text("\(info.lifetimeCount) / \(info.lifetimeLimit)")
                            .foregroundColor(.secondary)
                    }
                } header: {
                    Text("Stats")
                }
            }

            // How It Works Section
            Section {
                VStack(alignment: .leading, spacing: 16) {
                    HowItWorksRow(number: "1", text: "Share your invite link with friends")
                    HowItWorksRow(number: "2", text: "Friend signs up for HelpEm")
                    HowItWorksRow(number: "3", text: "Friend uses app for 7 days")
                    HowItWorksRow(number: "4", text: "You earn the Evangelist badge!")
                }
                .padding(.vertical, 8)
            } header: {
                Text("How It Works")
            }

            // FAQ Section
            Section {
                DisclosureGroup {
                    Text("Your friend uses your invite code, finishes signup, and is active on 7 different days within their first 14 days.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                } label: {
                    Text("How do I earn a badge?")
                        .font(.subheadline)
                }

                DisclosureGroup {
                    Text("Each badge lasts 14 days from when it's awarded.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                } label: {
                    Text("How long does a badge last?")
                        .font(.subheadline)
                }

                DisclosureGroup {
                    Text("You can earn up to 2 badges per month and 10 total. This helps keep the program fair for everyone.")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                } label: {
                    Text("Is there a limit?")
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
        let shareText = "Join me on HelpEm - your AI assistant for daily life! \(shareURL)"

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
