import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./app.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Package Analyzer",
    description: "Analyze npm package quality and scores",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className={inter.className}>{children}</body>
        </html>
    );
}
