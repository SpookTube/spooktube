import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "SpookTube",
  description: "Upload Clips From the Horror game Content Warning!",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <div className="shell">{children}</div>
      </body>
    </html>
  );
}
