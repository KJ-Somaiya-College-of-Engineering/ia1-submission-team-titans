import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      {/* Logo */}
      <div className="navbar-logo">AuroraLogo</div>

      {/* Spacer */}
      <div className="navbar-spacer"></div>

      {/* Actions */}
      <div className="navbar-actions">
        <button className="nav-btn">Sign In</button>
        <button className="nav-btn signup-btn">Sign Up</button>
      </div>
    </nav>
  );
};

export default Navbar;
