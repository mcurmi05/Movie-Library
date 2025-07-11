import {Link} from "react-router-dom"
import { useSearch } from "../contexts/SearchContext";
import SearchBar from "./SearchBar";
import "../styles/NavBar.css"

function NavBar() {

  const { clearSearch } = useSearch();

  return (
    <nav className="navbar">
      
      <Link to="/" className="nav-link home-button" onClick={clearSearch}>
        <img className="nav-icon" src="/home.png"></img>
      </Link>
      

      <SearchBar></SearchBar>

      <div className="navbar-links">
        <Link to="/trending" className="nav-link" onClick={clearSearch}>
          <div className="navbar-icon-div">
            <img className="nav-icon" src="/trending.png"></img>
            <p className="names-to-links">Trending</p>
          </div>
        </Link>
        <Link to="/favourites" className="nav-link" onClick={clearSearch}>
          <div className="navbar-icon-div">
            <img className="nav-icon" src="/heart.png"></img> 
            <p className="names-to-links">Favourites</p>
          </div>
        </Link>
      </div>
    </nav>
  );
}

export default NavBar;
