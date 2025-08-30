import { useFormik } from "formik";
import * as Yup from "yup";
import { useState } from "react";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.scss";
import "react-toastify/dist/ReactToastify.css";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validationSchema: Yup.object({
      email: Yup.string().email("Invalid email address").required("Email is required"),
      password: Yup.string().required("Password is required"),
    }),
    onSubmit: async (values) => {
      try {
        setIsSubmitting(true);
        const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, values);
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        toast.success("Login successful! Redirecting...", { position: "top-center", autoClose: 2000 });
        setTimeout(() => navigate("/"), 2000);
      } catch (error) {
        console.error("Login error:", error);
        let errorMessage = "Login failed";
        if (error.response) errorMessage = error.response.data.message || errorMessage;
        toast.error(errorMessage, { position: "top-center", autoClose: 3000 });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleSwitchToRegister = () => navigate("/register");

  return (
    <div className="login-container">
      <ToastContainer />
      <div className="login-wrapper">
        {/* LEFT: welcome text */}
        <div className="login-left">
          <div className="left-inner">
            <div className="logo-placeholder">TH</div>
            <h1 className="welcome-title">Welcome!</h1>
            <div className="divider" />
            <p className="welcome-desc">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            {/* <button className="left-button"></button>  */}
          </div>
        </div>

        {/* RIGHT: decorative background panel + glass form on top */}
        <div className="login-right">
          {/* decorative rectangle behind the glass card */}
          <div className="form-bg" aria-hidden="true" />

          {/* the translucent glass card with the actual form */}
          <div className="glass-card">
            <h2 className="login-title">Sign in</h2>
            <p className="login-subtitle">Enter your credentials below</p>

            <form onSubmit={formik.handleSubmit} className="login-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <FiMail className="input-icon" />
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  value={formik.values.email}
                  className={`form-input ${formik.touched.email && formik.errors.email ? "error" : ""}`}
                  autoComplete="username"
                />
                {formik.touched.email && formik.errors.email ? <div className="error-message">{formik.errors.email}</div> : null}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  <FiLock className="input-icon" />
                  Password
                </label>
                <div className="password-input-container">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                    value={formik.values.password}
                    className={`form-input ${formik.touched.password && formik.errors.password ? "error" : ""}`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
                {formik.touched.password && formik.errors.password ? <div className="error-message">{formik.errors.password}</div> : null}
              </div>

              <button type="submit" className="submit-button" disabled={isSubmitting}>
                {isSubmitting ? "Logging in..." : "Submit"}
              </button>
            </form>

            <div className="switch-auth">
              Don't have an account?
              <button onClick={handleSwitchToRegister} className="switch-button">Register here</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
