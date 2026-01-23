import SwiftUI

/// View to activate 1-month free trial with $5 usage cap
struct TrialActivationView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isActivating = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    let onActivated: () -> Void
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 32) {
                    // Hero
                    VStack(spacing: 16) {
                        Image(systemName: "gift.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.blue)
                        
                        Text("Try Basic for Free!")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Experience the full Basic package free for 30 days with a $5 usage budget")
                            .font(.body)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                    .padding(.top, 32)
                    
                    // Features
                    VStack(alignment: .leading, spacing: 16) {
                        Text("What You Get:")
                            .font(.headline)
                            .padding(.horizontal)
                        
                        FeatureRow(
                            icon: "checkmark.circle.fill",
                            title: "100 Todos & 50 Appointments",
                            description: "Stay organized with room to grow",
                            color: .green
                        )
                        
                        FeatureRow(
                            icon: "bubble.left.fill",
                            title: "300 AI Messages",
                            description: "Smart assistant for all your needs",
                            color: .blue
                        )
                        
                        FeatureRow(
                            icon: "calendar",
                            title: "Calendar Sync",
                            description: "Connect with Google & Apple Calendar",
                            color: .orange
                        )
                        
                        FeatureRow(
                            icon: "icloud.fill",
                            title: "Cloud Backup",
                            description: "Never lose your data",
                            color: .blue
                        )
                        
                        FeatureRow(
                            icon: "arrow.down.doc.fill",
                            title: "Data Export",
                            description: "Export your data anytime",
                            color: .purple
                        )
                    }
                    
                    // Usage Budget Info
                    VStack(spacing: 12) {
                        HStack {
                            Image(systemName: "chart.bar.fill")
                                .foregroundColor(.blue)
                            Text("Transparent Usage Tracking")
                                .font(.headline)
                            Spacer()
                        }
                        .padding(.horizontal)
                        
                        Text("Your trial includes $5 of API usage (about 625 AI messages). Track your usage in real-time - no surprises!")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding(.horizontal)
                    }
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal)
                    
                    // Terms
                    VStack(spacing: 8) {
                        Text("Trial ends after 30 days OR $5 usage, whichever comes first")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Text("No credit card required • One trial per account")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .multilineTextAlignment(.center)
                    
                    // CTA
                    Button {
                        Task {
                            await activateTrial()
                        }
                    } label: {
                        if isActivating {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Start My Free Trial")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .disabled(isActivating)
                    .padding(.horizontal)
                    
                    Button("Maybe Later") {
                        dismiss()
                    }
                    .foregroundColor(.secondary)
                    .padding(.bottom, 32)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .alert("Error", isPresented: $showError) {
                Button("OK", role: .cancel) {}
            } message: {
                Text(errorMessage)
            }
        }
    }
    
    private func activateTrial() async {
        isActivating = true
        defer { isActivating = false }
        
        do {
            // Call API to activate trial
            guard let url = URL(string: "\(AppEnvironment.apiURL)/subscriptions/start-trial") else {
                throw NSError(domain: "Invalid URL", code: -1)
            }
            
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("Bearer \(await getAuthToken())", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                throw NSError(domain: "Invalid response", code: -1)
            }
            
            if httpResponse.statusCode == 200 {
                let decoder = JSONDecoder()
                decoder.dateDecodingStrategy = .iso8601
                let result = try decoder.decode(TrialActivationResponse.self, from: data)
                
                // Success!
                AppLogger.info("✅ Trial activated: \(result.message)", logger: AppLogger.general)
                
                onActivated()
                dismiss()
                
            } else {
                // Error from server
                let errorResponse = try? JSONDecoder().decode([String: String].self, from: data)
                errorMessage = errorResponse?["message"] ?? errorResponse?["error"] ?? "Failed to activate trial"
                showError = true
            }
            
        } catch {
            errorMessage = error.localizedDescription
            showError = true
            AppLogger.error("❌ Trial activation error: \(error)", logger: AppLogger.general)
        }
    }
    
    private func getAuthToken() async -> String {
        // Get from Keychain or session manager
        // Placeholder for now
        return "your-auth-token"
    }
}

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    let color: Color
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(.horizontal)
    }
}

// MARK: - Trial Expired View

struct TrialExpiredView: View {
    let reason: String // "time_expired" or "budget_exceeded"
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            VStack(spacing: 32) {
                Spacer()
                
                // Icon
                Image(systemName: reason == "budget_exceeded" ? "chart.bar.xaxis" : "calendar.badge.clock")
                    .font(.system(size: 60))
                    .foregroundColor(.orange)
                
                // Message
                VStack(spacing: 12) {
                    Text(headerMessage)
                        .font(.title2)
                        .fontWeight(.bold)
                        .multilineTextAlignment(.center)
                    
                    Text(subMessage)
                        .font(.body)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                }
                
                // Stats (if budget exceeded)
                if reason == "budget_exceeded" {
                    VStack(spacing: 8) {
                        Text("You used your full $5.00 budget!")
                            .font(.headline)
                        
                        Text("That's about 625 AI messages - you got great value from your trial!")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .background(Color.green.opacity(0.1))
                    .cornerRadius(12)
                    .padding(.horizontal, 32)
                }
                
                Spacer()
                
                // Upgrade options
                VStack(spacing: 16) {
                    Text("Continue with a Paid Plan")
                        .font(.headline)
                    
                    HStack(spacing: 12) {
                        // Basic
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Basic")
                                .font(.headline)
                            Text("$7.99/mo")
                                .font(.title3)
                                .fontWeight(.bold)
                            Text("300 messages")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Button("Choose Basic") {
                                // Navigate to payment
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.blue)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .padding()
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(12)
                        
                        // Premium
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Text("Premium")
                                    .font(.headline)
                                Spacer()
                                Text("BEST")
                                    .font(.caption2)
                                    .fontWeight(.bold)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.purple)
                                    .cornerRadius(4)
                            }
                            Text("$14.99/mo")
                                .font(.title3)
                                .fontWeight(.bold)
                            Text("Unlimited")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            
                            Button("Choose Premium") {
                                // Navigate to payment
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(Color.purple)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .padding()
                        .background(Color.purple.opacity(0.1))
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                }
                
                Button("Continue with Free Plan") {
                    dismiss()
                }
                .foregroundColor(.secondary)
                .padding(.bottom, 32)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
    }
    
    private var headerMessage: String {
        switch reason {
        case "budget_exceeded":
            return "You've Used Your Full Trial Budget!"
        case "time_expired":
            return "Your 30-Day Trial Has Ended"
        default:
            return "Your Trial Has Ended"
        }
    }
    
    private var subMessage: String {
        switch reason {
        case "budget_exceeded":
            return "Great news! You loved the app so much you used all $5 in API credits. Ready to continue?"
        case "time_expired":
            return "Your 30 days are up! We hope you enjoyed experiencing the full Basic package."
        default:
            return "We hope you enjoyed your trial. Choose a plan to continue with all the features."
        }
    }
}

// MARK: - Preview

#if DEBUG
struct TrialActivationView_Previews: PreviewProvider {
    static var previews: some View {
        TrialActivationView(onActivated: {})
        
        TrialExpiredView(reason: "budget_exceeded")
        
        TrialExpiredView(reason: "time_expired")
    }
}
#endif
