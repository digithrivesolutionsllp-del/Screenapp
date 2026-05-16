import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import PricingPage from "./pages/PricingPage";
import AppPage from "./pages/AppPage";
import FeaturesPage from "./pages/FeaturesPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/app" element={<AppPage />} />
        <Route path="/features" element={<FeaturesPage />} />
        <Route path="/features/:featureId" element={<FeaturesPage />} />
        <Route path="/enterprise" element={<PricingPage />} />
        <Route path="/login" element={<AppPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
