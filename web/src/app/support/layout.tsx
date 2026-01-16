import { LayoutHeader } from '@/components/LayoutHeader';

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LayoutHeader />
      {children}
    </>
  );
}
