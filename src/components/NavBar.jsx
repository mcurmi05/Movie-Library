import {Link} from "react-router-dom"
import { useSearch } from "../contexts/SearchContext";
import SearchBar from "./SearchBar";
import { useState, useEffect, useRef } from "react";
import "../styles/NavBar.css"

function NavBar() {

  const { clearSearch } = useSearch();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const burgerMenuRef = useRef(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLinkClick = () => {
    clearSearch();
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (burgerMenuRef.current && !burgerMenuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      
      <Link to="/" className="nav-link home-button" onClick={clearSearch}>
        <img className="nav-icon" src="/home.png"></img>
      </Link>
      

      <SearchBar></SearchBar>

      <div className="burger-menu-container navbar-icon-div nav-link" ref={burgerMenuRef} onClick={toggleMenu}>
        <img className="nav-icon" src="/burgermenu.png"></img>
      
        {isMenuOpen && (
          <div className="burger-dropdown">
            <Link to="/trending" className="dropdown-nav-item" onClick={handleLinkClick}>
              <div className="navbar-icon-div">
                <img className="nav-icon" src="/trending.png"></img>
                <p className="names-to-links">Trending</p>
              </div>
            </Link>

            <Link to="/signin" className="dropdown-nav-item" onClick={handleLinkClick}>
              <div className="navbar-icon-div">
                <img id="auth-img" className="nav-icon" src="/signin.png"></img>
                <p id="auth-text" className="names-to-links">Sign In</p>
              </div>
            </Link>
          </div>
        )}
      </div>
      
      <div className="navbar-links">

        <Link to="/trending" className="nav-link" onClick={clearSearch}>
          <div className="navbar-icon-div">
            <img className="nav-icon" src="/trending.png"></img>
            <p className="names-to-links">Trending</p>
          </div>
        </Link>

        <Link to="/signin" className="nav-link" onClick={clearSearch}>
          <div className="navbar-icon-div" >
            <img id="auth-img" className="nav-icon" src="/signin.png"></img>
            <p id="auth-text" className="names-to-links">Sign In</p>
          </div>
        </Link>

      </div>
    </nav>
  );

}

export default NavBar;
