import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import BillList from './pages/BillList';
import BillForm from './pages/BillForm';
import BillView from './pages/BillView';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-dvh bg-slate-100">
        <Navbar />
        <main className="pt-14 max-w-2xl mx-auto">
          <Routes>
            <Route path="/" element={<BillList />} />
            <Route path="/new" element={<BillForm />} />
            <Route path="/edit/:id" element={<BillForm />} />
            <Route path="/view/:id" element={<BillView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
