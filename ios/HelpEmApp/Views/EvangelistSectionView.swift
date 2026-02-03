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

                    // Premium months earned (lifetime)
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

                    // Yearly cap status
                    if info.premiumMonthsThisYear > 0 || info.earnedPremiumMonths > 0 {
                        HStack {
                            Text("This year")
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(info.premiumMonthsThisYear)/\(info.maxPremiumMonthsPerYear)")
                                .foregroundColor(info.premiumMonthsRemainingThisYear == 0 ? .orange : .secondary)
                        }
                    }

                    if let inProgress = info.freeMonthsInProgress, inProgress > 0 {
                        HStack {
                            Text("Free months in progress")
                                .foregroundColor(.secondary)
                            Spacer()
                            Text("\(inProgress)")
                                .foregroundColor(.secondary)
                        }
                    }

                    if let activeUntil = info.freeMonthActiveUntil {
                        HStack {
                            Text("Free month active until")
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(activeUntil.formatted(date: .abbreviated, time: .omitted))
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
                Text("Friends get +1 free month when they subscribe. You earn a free Premium month when they complete a paid month.")
            }

            // How It Works Section
            Section {
                VStack(alignment: .leading, spacing: 16) {
                    HowItWorksRow(number: "1", text: "Share your 6-digit invite code")
                    HowItWorksRow(number: "2", text: "Friend signs up and uses your code")
                    HowItWorksRow(number: "3", text: "They subscribe to Basic or Premium and get +1 free month")
                    HowItWorksRow(number: "4", text: "You earn a free Premium month when they complete a paid month within 60 days")
                }
                .padding(.vertical, 8)
            } header: {
                Text("How It Works")
            }

            // FAQ Link
            Section {
                Link("View full FAQ", destination: URL(string: "https://helpem.ai/referrals")!)
            } header: {
                Text("Learn More")
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
        let shareText = "Join me on HelpEm - your AI assistant for daily life! Subscribe with my code and we both get a free month: \(shareURL)"

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
