import {useState} from "react";
import {supabase} from "../services/supabase-client.js";
import { useAuth } from "../contexts/AuthContext.jsx";
import { useNavigate } from "react-router-dom";

export const SignIn = () => {

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    if (isAuthenticated) {
        navigate('/');
        return;
    }


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        
        if (isSignUp) {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
            });
            
            if (error) {
                setMessage("Error: " + error.message);
            } else if (data.user && !data.session) {
                setMessage("Check your email for confirmation link!");
            } else {
                setMessage("Account created successfully!");
                navigate('/');
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                setMessage("Error: " + error.message);
            } else {
                setMessage("Signed in successfully!");
                navigate('/');
            }
        }
        setLoading(false);
    };

    return (
        <div>
            <h2>{isSignUp ? "Sign Up" : "Sign In"}</h2>
            
            {message && (
                <p style={{color: message.includes("Error") ? "red" : "green"}}>
                    {message}
                </p>
            )}

            <form onSubmit={handleSubmit}>
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button type="submit" disabled={loading}>
                    {loading ? "Loading..." : (isSignUp ? "Sign Up" : "Sign In")}
                </button>
            </form>

            <button onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? "Already have an account? Sign in" : "Not registered? Sign up"}
            </button>
        </div>
    );
}
  

