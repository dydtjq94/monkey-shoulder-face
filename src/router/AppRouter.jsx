import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home    from '../pages/Home';
import Loading from '../pages/Loading';
import Qr      from '../pages/Qr';
import Result  from '../pages/Result';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/loading" element={<Loading />} />
        <Route path="/qr/:id"  element={<Qr />} /> 
        <Route path="/result/:id" element={<Result />} />

        {/* 잘못된 경로는 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
