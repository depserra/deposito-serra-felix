import { Sidebar, Header } from './layout';

export default function PageLayout({ children, title }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pl-64">
        <Header title={title} />
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}