import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sbu Backoffice',
  description: 'Sbu Commerce administration panel',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
