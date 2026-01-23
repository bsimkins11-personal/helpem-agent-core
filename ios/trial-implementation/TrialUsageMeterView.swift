import SwiftUI

/// Real-time trial usage meter (backend tracks $5 cap invisibly)
struct TrialUsageMeterView: View {
    let usage: TrialUsage
    @State private var animateProgress = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            HStack {
                Image(systemName: "gift.fill")
                    .foregroundColor(.blue)
                Text("Trial Usage")
                    .font(.headline)
                
                Spacer()
                
                if usage.status == .active {
                    Text("\(usage.time.daysRemaining) days left")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.gray.opacity(0.1))
                        .cornerRadius(8)
                }
            }
            
            // Progress Bar (no dollar amounts shown)
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Trial Progress")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Spacer()
                    
                    Text("\(Int(usage.usage.percentUsedDouble))%")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(progressColor)
                }
                
                // Progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        // Background
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 8)
                            .cornerRadius(4)
                        
                        // Progress
                        Rectangle()
                            .fill(progressGradient)
                            .frame(
                                width: animateProgress ? geometry.size.width * CGFloat(usage.usage.percentUsedDouble / 100.0) : 0,
                                height: 8
                            )
                            .cornerRadius(4)
                            .animation(.easeInOut(duration: 1.0), value: animateProgress)
                    }
                }
                .frame(height: 8)
                
                Text("Enjoying your trial? Upgrade anytime!")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Usage Breakdown
            if usage.usage.percentUsedDouble > 20 {
                VStack(alignment: .leading, spacing: 8) {
                    Text("What You've Used")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                    
                    HStack(spacing: 16) {
                        UsageItemSimple(
                            icon: "bubble.left.fill",
                            label: "AI Messages",
                            value: "\(usage.breakdown.aiMessages.count ?? 0)"
                        )
                        
                        UsageItemSimple(
                            icon: "waveform",
                            label: "Voice",
                            value: "\(usage.breakdown.voiceInput.minutes ?? 0)m"
                        )
                        
                        if usage.breakdown.calendarSyncs.count ?? 0 > 0 {
                            UsageItemSimple(
                                icon: "calendar",
                                label: "Syncs",
                                value: "\(usage.breakdown.calendarSyncs.count ?? 0)"
                            )
                        }
                    }
                }
            }
            
            // Warning/Status
            if usage.usage.percentUsedDouble >= 80 {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .foregroundColor(.blue)
                        .font(.caption)
                    
                    Text("You're loving the trial! Upgrade to keep the momentum going.")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
                .padding(8)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(UIColor.secondarySystemGroupedBackground))
        .cornerRadius(12)
        .onAppear {
            animateProgress = true
        }
    }
    
    private var progressColor: Color {
        let percent = usage.usage.percentUsedDouble
        if percent >= 90 {
            return .red
        } else if percent >= 70 {
            return .orange
        } else {
            return .blue
        }
    }
    
    private var progressGradient: LinearGradient {
        let percent = usage.usage.percentUsedDouble
        if percent >= 90 {
            return LinearGradient(
                colors: [.orange, .red],
                startPoint: .leading,
                endPoint: .trailing
            )
        } else if percent >= 70 {
            return LinearGradient(
                colors: [.blue, .orange],
                startPoint: .leading,
                endPoint: .trailing
            )
        } else {
            return LinearGradient(
                colors: [.blue, .blue.opacity(0.8)],
                startPoint: .leading,
                endPoint: .trailing
            )
        }
    }
}

struct UsageItemSimple: View {
    let icon: String
    let label: String
    let value: String
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                Text(label)
                    .font(.caption2)
            }
            .foregroundColor(.secondary)
            
            Text(value)
                .font(.caption)
                .fontWeight(.semibold)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(Color.gray.opacity(0.1))
        .cornerRadius(6)
    }
}

// MARK: - Compact Meter (for top of screen)

struct TrialUsageMeterCompact: View {
    let usage: TrialUsage
    @State private var showFullMeter = false
    
    var body: some View {
        Button {
            showFullMeter = true
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "gift.fill")
                    .foregroundColor(.blue)
                    .font(.caption)
                
                Text("Trial")
                    .font(.caption)
                    .fontWeight(.medium)
                
                // Mini progress bar
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 4)
                            .cornerRadius(2)
                        
                        Rectangle()
                            .fill(progressColor)
                            .frame(
                                width: geometry.size.width * CGFloat(usage.usage.percentUsedDouble / 100.0),
                                height: 4
                            )
                            .cornerRadius(2)
                    }
                }
                .frame(width: 60, height: 4)
                
                Text("\(Int(usage.usage.percentUsedDouble))%")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundColor(progressColor)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color(UIColor.secondarySystemGroupedBackground))
            .cornerRadius(20)
        }
        .sheet(isPresented: $showFullMeter) {
            TrialUsageDetailView(usage: usage)
        }
    }
    
    private var progressColor: Color {
        let percent = usage.usage.percentUsedDouble
        if percent >= 90 {
            return .red
        } else if percent >= 70 {
            return .orange
        } else {
            return .blue
        }
    }
}

// MARK: - Full Detail Sheet

struct TrialUsageDetailView: View {
    let usage: TrialUsage
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    TrialUsageMeterView(usage: usage)
                        .padding()
                    
                    // Upgrade CTA
                    VStack(spacing: 12) {
                        Text("Upgrade to Remove Limits")
                            .font(.title3)
                            .fontWeight(.bold)
                        
                        Text("Get unlimited AI messages, todos, and appointments")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Basic")
                                    .font(.headline)
                                Text("$7.99/mo")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text("300 AI messages")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(12)
                            
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Premium")
                                    .font(.headline)
                                Text("$14.99/mo")
                                    .font(.title2)
                                    .fontWeight(.bold)
                                Text("Unlimited")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.purple.opacity(0.1))
                            .cornerRadius(12)
                        }
                        .padding(.horizontal)
                    }
                    .padding()
                }
            }
            .navigationTitle("Trial Usage")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Preview

#if DEBUG
struct TrialUsageMeterView_Previews: PreviewProvider {
    static var previews: some View {
        VStack(spacing: 20) {
            // Low usage
            TrialUsageMeterView(usage: TrialUsage(
                status: .active,
                usage: UsageCosts(
                    total: "1.25",
                    cap: "5.00",
                    remaining: "3.75",
                    percentUsed: "25.0"
                ),
                time: TimeInfo(
                    startedAt: Date(),
                    expiresAt: Date().addingTimeInterval(20 * 24 * 60 * 60),
                    daysRemaining: 20
                ),
                breakdown: UsageBreakdown(
                    aiMessages: OperationUsage(count: 150, minutes: nil, chars: nil, cost: "1.20"),
                    voiceInput: OperationUsage(count: nil, minutes: 1, chars: nil, cost: "0.05"),
                    voiceOutput: OperationUsage(count: nil, minutes: nil, chars: 0, cost: "0.00"),
                    calendarSyncs: OperationUsage(count: 0, minutes: nil, chars: nil, cost: "0.00")
                )
            ))
            
            // High usage warning
            TrialUsageMeterView(usage: TrialUsage(
                status: .active,
                usage: UsageCosts(
                    total: "4.25",
                    cap: "5.00",
                    remaining: "0.75",
                    percentUsed: "85.0"
                ),
                time: TimeInfo(
                    startedAt: Date(),
                    expiresAt: Date().addingTimeInterval(5 * 24 * 60 * 60),
                    daysRemaining: 5
                ),
                breakdown: UsageBreakdown(
                    aiMessages: OperationUsage(count: 520, minutes: nil, chars: nil, cost: "4.16"),
                    voiceInput: OperationUsage(count: nil, minutes: 15, chars: nil, cost: "0.09"),
                    voiceOutput: OperationUsage(count: nil, minutes: nil, chars: 0, cost: "0.00"),
                    calendarSyncs: OperationUsage(count: 0, minutes: nil, chars: nil, cost: "0.00")
                )
            ))
            
            Spacer()
        }
        .padding()
    }
}
#endif
