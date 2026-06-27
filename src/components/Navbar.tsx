import { Link, useLocation } from 'react-router-dom';
import { FileText, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { pathname } = useLocation();

  const active = (path: string) =>
    pathname === path || (path !== '/' && pathname.startsWith(path));

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-blue-700 shadow-lg">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <span className="text-white font-bold text-base tracking-wide">
          Sales Challan
        </span>
        <div className="flex gap-1">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active('/') && pathname === '/'
                ? 'bg-white text-blue-700'
                : 'text-blue-100 hover:bg-blue-600'
            }`}
          >
            <FileText size={16} />
            View
          </Link>
          <Link
            to="/new"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              active('/new') || active('/edit')
                ? 'bg-white text-blue-700'
                : 'text-blue-100 hover:bg-blue-600'
            }`}
          >
            <PlusCircle size={16} />
            New
          </Link>
        </div>
      </div>
    </nav>
  );
}
