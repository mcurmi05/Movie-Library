import "./styles/App.css";
import Search from "./pages/Search.jsx";
import Trending from "./pages/Trending.jsx";
import NavBar from "./components/NavBar.jsx";
import { SearchProvider } from "./contexts/SearchContext";
import { PopularMoviesCacheProvider } from "./contexts/PopularMoviesCacheContext.jsx";
import { Routes, Route } from "react-router-dom";
import MediaDetails from "./pages/MediaDetails.jsx";
import {SignIn} from "./pages/SignIn.jsx"
import {supabase} from "./services/supabase-client.js"
import {useState, useEffect} from "react"

function App() {

  const [session, setSession] = useState(null);

  const fetchSession = async () => {
    const currentSession = await supabase.auth.getSession();
    console.log(currentSession)
    setSession(currentSession.data.session);
  };


  useEffect(() => {
    fetchSession();
  },[])

  return (
    <div>
      
      <SearchProvider>
        <PopularMoviesCacheProvider>
          <NavBar/>
          <main className="main-content">
            <Routes>
              <Route path="/" element={null}></Route>
              <Route path="/trending" element={<Trending></Trending>}></Route>
              <Route path="/search" element={<Search></Search>}></Route>
              <Route path="/mediadetails/:id" element={<MediaDetails />} />
              <Route path="/signin" element={<SignIn></SignIn>} />
            </Routes>
          </main>
        </PopularMoviesCacheProvider>
      </SearchProvider>
      
    </div>
  );
}

export default App;
