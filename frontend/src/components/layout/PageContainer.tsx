interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <main
      className={`flex-1 overflow-y-auto overflow-x-hidden px-3.5 sm:px-4 py-4 sm:py-5 max-w-lg mx-auto w-full min-w-0 ${className}`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)' }}
      data-page-container
    >
      {children}
    </main>
  );
}
