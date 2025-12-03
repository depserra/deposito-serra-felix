import Sidebar from './Sidebar';
import Header from './Header';

export default function PageLayout({ children, title }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-inter transition-colors">
      <Sidebar />
      <div className="pl-64">
        <Header title={title} />
        <main className="p-8 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}