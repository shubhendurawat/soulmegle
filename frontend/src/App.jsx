import "./App.css";
import VideoChat from "./components/VideoChat.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import LoginForm from "./pages/LoginForm.jsx";
import SignupForm from "../src/pages/SignUpForm.jsx";
import { Route, Routes, useNavigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { ChatProvider } from "../src/context/ChatContext.jsx"; // make sure this file exists
import "react-toastify/dist/ReactToastify.css";

function App() {
  const navigate = useNavigate();

  const handleSwitchToLogin = () => {
    navigate("/");
  };

  return (
    <ChatProvider>
      <Routes>
        <Route path="/" element={<LoginForm />} />
        <Route
          path="/register"
          element={<SignupForm onSwitchToLogin={handleSwitchToLogin} />}
        />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/video-chat" element={<VideoChat />} />
      </Routes>
      <ToastContainer />
    </ChatProvider>
  );
}

export default App;
