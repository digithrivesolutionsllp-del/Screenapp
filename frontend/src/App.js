import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PricingPage from "./pages/PricingPage";
import AppPage from "./pages/AppPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/features" element={<HomePage />} />
        <Route path="/features/*" element={<HomePage />} />
        <Route path="/chrome" element={<HomePage />} />
        <Route path="/desktop" element={<HomePage />} />
        <Route path="/mobile" element={<HomePage />} />
        <Route path="/blog" element={<HomePage />} />
        <Route path="/reviews" element={<HomePage />} />
        <Route path="/changelog" element={<HomePage />} />
        <Route path="/enterprise" element={<PricingPage />} />
        <Route path="/login" element={<AppPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
