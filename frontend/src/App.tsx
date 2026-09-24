import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { UploadPage } from './pages/UploadPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { AttorneyPrepPage } from './pages/AttorneyPrepPage';
import './styles/index.css';

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <DisclaimerBanner />
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/analysis/:id" element={<AnalysisPage />} />
            <Route path="/compare/:id" element={<ComparisonPage />} />
            <Route path="/prep/:type/:id" element={<AttorneyPrepPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
