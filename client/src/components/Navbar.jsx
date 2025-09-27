import React from 'react';
import './Navbar.css';
import { Link, useNavigate } from 'react-router-dom';

const Navbar = () => {
  const navigate = useNavigate();
  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to={'/'} style={{all: "unset"}}>
        <div className="navbar-logo">AuroraLogo</div>
      </Link>

      {/* Spacer */}
      <div className="navbar-spacer"></div>

      {/* Actions */}
      <div className="navbar-actions">
        <button className="nav-btn" onClick={()=>navigate('/login')}>Sign In</button>
        <button className="nav-btn signup-btn" onClick={()=>navigate('/signup')}>Sign Up</button>
      </div>
    </nav>
  );
};

export default Navbar;
