import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
  onSearch?: (query: string) => void;
  searchQuery?: string;
  hideFooter?: boolean;
}

export const Layout = ({ children, onSearch, searchQuery, hideFooter }: LayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onSearch={onSearch} searchQuery={searchQuery} />
      <main className="flex-1 w-full">
        {children}
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
};
