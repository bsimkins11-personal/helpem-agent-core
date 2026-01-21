import SwiftUI

/// Context for items in the app
/// Determines visual styling and behavior
///
/// Color Rules (NON-NEGOTIABLE):
/// - Personal items are BLUE
/// - Tribe items are GREEN
/// - Proposal items are NEUTRAL
///
/// Do not rely on color alone - always include text labels for accessibility
enum ItemContext: String, Codable {
    case personal   // Blue - user's own items
    case tribe      // Green - accepted Tribe items
    case proposal   // Neutral - pending Tribe proposals
    
    /// Primary accent color for this context
    var accentColor: Color {
        switch self {
        case .personal:
            return .blue
        case .tribe:
            return .green
        case .proposal:
            return .gray
        }
    }
    
    /// Accessibility label
    var label: String {
        switch self {
        case .personal:
            return "Personal"
        case .tribe:
            return "From Tribe"
        case .proposal:
            return "Proposal"
        }
    }
    
    /// Icon for visual context
    var icon: String {
        switch self {
        case .personal:
            return "person.fill"
        case .tribe:
            return "person.3.fill"
        case .proposal:
            return "envelope.fill"
        }
    }
}

/// Visual modifier for item context indicators
struct ItemContextIndicator: View {
    let context: ItemContext
    let showLabel: Bool
    
    init(context: ItemContext, showLabel: Bool = false) {
        self.context = context
        self.showLabel = showLabel
    }
    
    var body: some View {
        HStack(spacing: 4) {
            // Colored bar indicator (primary visual)
            Rectangle()
                .fill(context.accentColor)
                .frame(width: 3)
            
            if showLabel {
                // Text label (accessibility)
                Text(context.label)
                    .font(.caption2)
                    .foregroundColor(context.accentColor)
            }
        }
        .accessibilityLabel(context.label)
    }
}

/// Apply context accent to a view (for cards, rows, etc.)
struct ContextAccent: ViewModifier {
    let context: ItemContext
    
    func body(content: Content) -> some View {
        content
            .overlay(alignment: .leading) {
                Rectangle()
                    .fill(context.accentColor)
                    .frame(width: 3)
            }
    }
}

extension View {
    func contextAccent(_ context: ItemContext) -> some View {
        self.modifier(ContextAccent(context: context))
    }
}
