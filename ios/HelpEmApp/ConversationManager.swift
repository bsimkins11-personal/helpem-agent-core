import Foundation
import Combine

@MainActor
final class ConversationManager: ObservableObject {

    @Published var messages: [String] = []

    // Railway Express API base
    private let baseURL = "https://api-production-2989.up.railway.app"

    func sendMessageToDatabase(content: String, type: String = "text") {

        print("🚀 sendMessageToDatabase CALLED")

        guard let url = URL(string: "\(baseURL)/test-db") else {
            print("❌ Bad URL")
            return
        }

        print("🌐 URL:", url.absoluteString)

        // 🔑 Fetch Apple identity token
        guard let identityToken = UserDefaults.standard.string(forKey: "appleIdentityToken"),
              !identityToken.isEmpty else {
            print("❌ Missing Apple identity token")
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // 🔐 Attach Apple token
        request.setValue("Bearer \(identityToken)", forHTTPHeaderField: "Authorization")

        let body: [String: Any] = [
            "message": content,
            "type": type
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, response, error in

            if let error = error {
                print("❌ URLSession ERROR:", error.localizedDescription)
                return
            }

            if let httpResponse = response as? HTTPURLResponse {
                print("✅ HTTP STATUS:", httpResponse.statusCode)
            }

            if let data = data {
                print("📦 RESPONSE DATA:", String(decoding: data, as: UTF8.self))
            }

            Task { @MainActor in
                self.messages.append(content)
            }

        }.resume()
    }
}

