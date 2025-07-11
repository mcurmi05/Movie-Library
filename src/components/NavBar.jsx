import {Link} from "react-router-dom"
import { useSearch } from "../contexts/SearchContext";
import SearchBar from "./SearchBar";
import "../styles/NavBar.css"

function NavBar() {

  const { clearSearch } = useSearch();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" onClick={clearSearch}>Movie Library</Link>
      </div>

      <SearchBar></SearchBar>

      <div className="navbar-links">
        <Link to="/trending" className="nav-link" onClick={clearSearch}>Trending</Link>
        <Link to="/favourites" className="nav-link" onClick={clearSearch}>
          ♥ Favourites 
        </Link>
      </div>
    </nav>
  );
}

export default NavBar;
