import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Lobby.css"; // reuse same styles

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you can add validation or API call
    console.log("Login Data:", formData);
    navigate("/"); // redirect to home
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1 className="lobby-title">Login</h1>
        <form onSubmit={handleSubmit} className="lobby-form">
          <label htmlFor="email">Email ID</label>
          <input
            type="email"
            id="email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button type="submit" className="join-btn">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
