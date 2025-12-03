export default function Header({ title }) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-gray-200">
      <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
    </header>
  );
}