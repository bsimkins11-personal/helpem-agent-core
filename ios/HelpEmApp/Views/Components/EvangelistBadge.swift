import SwiftUI

/// Evangelist badge displayed next to profile or in lists
/// Uses an orange/yellow gradient with star icon
struct EvangelistBadge: View {
    var showLabel: Bool = true

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "star.fill")
                .font(.caption2)
            if showLabel {
                Text("Evangelist")
                    .font(.caption2)
                    .fontWeight(.bold)
            }
        }
        .foregroundColor(.white)
        .padding(.horizontal, showLabel ? 8 : 6)
        .padding(.vertical, 4)
        .background(
            LinearGradient(
                colors: [.orange, Color(red: 1.0, green: 0.8, blue: 0.0)],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .clipShape(Capsule())
    }
}

/// Small star icon for inline badge display
struct EvangelistStarIcon: View {
    var body: some View {
        Image(systemName: "star.fill")
            .font(.caption)
            .foregroundStyle(
                LinearGradient(
                    colors: [.orange, .yellow],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
    }
}

#Preview {
    VStack(spacing: 20) {
        EvangelistBadge()
        EvangelistBadge(showLabel: false)
        EvangelistStarIcon()
    }
    .padding()
}
