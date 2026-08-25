import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StyleGuide from './StyleGuide';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/style-guide" element={<StyleGuide />} />
        <Route path="*" element={<Navigate to="/style-guide" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
