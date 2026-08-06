// Page structure layout

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "T1D World Updates",
    description: "Recent Type 1 diabetes research and clinical trial updates.",
    icons: { icon: "/t1d-ribbon.png", }
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}