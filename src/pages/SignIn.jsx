import {useState, FormEvent, ChangeEvent} from "react";
import {supabase} from "../services/supabase-client.js";

export const SignIn = () => {

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");


    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSignUp) {
            const {signUpError} = await supabase.auth.signUp({email,password})
            if(signUpError){
                console.error(signUpError);
                return;
            }
        } else{
            const {signInError} = await supabase.auth.signInWithPassword({email,password})
            if(signInError){
                console.error(signInError);
                return;
            }
        }
        

    };

    return(

        <div>

            <h2>{isSignUp ? "Sign Up" : "Sign In"}</h2>

            <form onSubmit={handleSubmit}>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}/>

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}/>

                <button type="submit">{isSignUp ? "Sign Up" : "Sign In"}</button>

            </form>

            <button onClick={() => {setIsSignUp(!isSignUp);}}>
                {isSignUp ? "Already have an account? Sign in" : "Not registered? Sign up"}
            </button>

        </div>
    );
}
  

