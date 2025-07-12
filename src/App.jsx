import "./styles/App.css";
import Search from "./pages/Search.jsx";
import Trending from "./pages/Trending.jsx";
import Favourites from "./pages/Favourites.jsx";
import NavBar from "./components/NavBar.jsx";
import {FavouritesProvider} from "./contexts/FavouritesContext.jsx"
import { SearchProvider } from "./contexts/SearchContext";
import { PopularMoviesCacheProvider } from "./contexts/PopularMoviesCacheContext.jsx";
import { Routes, Route } from "react-router-dom";
import MediaDetails from "./pages/MediaDetails.jsx";

function App() {
  return (
    <div>
      <FavouritesProvider>
        <SearchProvider>
          <PopularMoviesCacheProvider>
            <NavBar/>
            <main className="main-content">
              <Routes>
                <Route path="/" element={null}></Route>
                <Route path="/trending" element={<Trending></Trending>}></Route>
                <Route path="/favourites" element={<Favourites></Favourites>}></Route>
                <Route path="/search" element={<Search></Search>}></Route>
                <Route path="/mediadetails/:id" element={<MediaDetails />} />
              </Routes>
            </main>
          </PopularMoviesCacheProvider>
        </SearchProvider>
      </FavouritesProvider>
    </div>
  );
}

export default App;
