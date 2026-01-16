import { LayoutHeader } from '@/components/LayoutHeader';

export default function PricingLayout({
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
