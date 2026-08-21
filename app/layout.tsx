import "./globals.css";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "SpookTube",
  description: "Content-warned horror clips, shared by the people who made them.",
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
