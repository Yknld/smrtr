import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './LoginSignup.css'

function LoginSignup() {
  const navigate = useNavigate()
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleBack = () => {
    navigate(-1)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle login/signup logic here
    console.log(isSignup ? 'Signup' : 'Login', { email, password })
    // For now, just navigate to home after "login"
    navigate('/home')
  }

  const handleGoogleLogin = () => {
    console.log('Login with Google')
    // Handle Google login
  }

  const handleGithubLogin = () => {
    console.log('Login with Github')
    // Handle Github login
  }

  const toggleMode = () => {
    setIsSignup(!isSignup)
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="login-signup">
      <div className="login-signup__header">
        <button className="login-signup__back-link" onClick={handleBack}>
          ← Back
        </button>
        <button className="login-signup__help-link" onClick={() => console.log('Help')}>
          Need any help?
        </button>
      </div>

      <div className="login-signup__container">
        <div className="login-signup__form-wrapper">
          <h1 className="login-signup__title">
            {isSignup ? 'Sign up' : 'Login'}
          </h1>
          <p className="login-signup__subtitle">
            {isSignup ? 'Create an account to get started' : 'Sign-in to continue'}
          </p>

          <form className="login-signup__form" onSubmit={handleSubmit}>
            <div className="login-signup__input-group">
              <label htmlFor="email" className="login-signup__label">Email</label>
              <input
                id="email"
                type="email"
                className="login-signup__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="login-signup__input-group">
              <label htmlFor="password" className="login-signup__label">Password</label>
              <input
                id="password"
                type="password"
                className="login-signup__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {isSignup && (
              <div className="login-signup__input-group">
                <label htmlFor="confirmPassword" className="login-signup__label">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="login-signup__input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
            )}

            <button type="submit" className="login-signup__submit-button">
              {isSignup ? 'Create Account' : 'Submit'}
            </button>
          </form>

          <div className="login-signup__divider">
            <div className="login-signup__divider-line"></div>
            <span className="login-signup__divider-text">OR</span>
            <div className="login-signup__divider-line"></div>
          </div>

          <div className="login-signup__social-buttons">
            <button
              type="button"
              className="login-signup__social-button login-signup__social-button--google"
              onClick={handleGoogleLogin}
            >
              <span className="login-signup__social-icon login-signup__social-icon--google">G</span>
              <span>Login with Google</span>
            </button>
            <button
              type="button"
              className="login-signup__social-button login-signup__social-button--github"
              onClick={handleGithubLogin}
            >
              <span className="login-signup__social-icon login-signup__social-icon--github">⚫</span>
              <span>With Github</span>
            </button>
          </div>

          <div className="login-signup__footer">
            <span className="login-signup__footer-text">
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
            </span>
            <button
              type="button"
              className="login-signup__footer-link"
              onClick={toggleMode}
            >
              {isSignup ? 'Login here' : 'Register here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginSignup
