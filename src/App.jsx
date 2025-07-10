import "./styles/App.css";
import Home from "./pages/Home.jsx";
import Favourites from "./pages/Favourites.jsx";
import NavBar from "./components/NavBar.jsx";
import {MovieProvider} from "./contexts/MovieContext.jsx"
import { Routes, Route } from "react-router-dom";

function App() {
  return (
    <div>
      <MovieProvider>
        <NavBar/>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home></Home>}></Route>
            <Route path="/favourites" element={<Favourites></Favourites>}></Route>
          </Routes>
        </main>
      </MovieProvider>
      
    </div>
  );
}

export default App;
