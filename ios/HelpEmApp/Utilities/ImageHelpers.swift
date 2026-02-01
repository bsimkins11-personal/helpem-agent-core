import UIKit

extension UIImage {
    func resizedSquare(to size: CGFloat) -> UIImage {
        let side = min(self.size.width, self.size.height)
        let origin = CGPoint(x: (self.size.width - side) / 2, y: (self.size.height - side) / 2)
        let cropRect = CGRect(origin: origin, size: CGSize(width: side, height: side))
        guard let cgImage = self.cgImage?.cropping(to: cropRect) else {
            return self
        }
        
        let cropped = UIImage(cgImage: cgImage, scale: self.scale, orientation: self.imageOrientation)
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size))
        return renderer.image { _ in
            cropped.draw(in: CGRect(x: 0, y: 0, width: size, height: size))
        }
    }
}

extension Data {
    func asDataURL(mimeType: String = "image/jpeg") -> String {
        let base64 = self.base64EncodedString()
        return "data:\(mimeType);base64,\(base64)"
    }
}
