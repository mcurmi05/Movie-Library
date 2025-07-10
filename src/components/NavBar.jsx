import {Link} from "react-router-dom"
import "../styles/NavBar.css"

function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Movie Library</Link>
      </div>

      <div className="navbar-links">
        <Link to="/" className="nav-link">
          Home
        </Link>
        <Link to="/favourites" className="nav-link">
          Favourites
        </Link>
      </div>
    </nav>
  );
}

export default NavBar;
