import { useFormik } from "formik";
import * as Yup from "yup";
import { useState } from "react";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Login.scss";
import logo from "../../../Assets/logo/logo.png";
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

        // Store token and user data
        localStorage.setItem("token", response.data.token);

        // Store user with permissions and role
        const userData = {
          userId: response.data.user.userId,
          name: response.data.user.name,
          email: response.data.user.email,
          phone: response.data.user.phone,
          role: response.data.user.role || "user",
          permissions: response.data.user.permissions || []
        };

        localStorage.setItem("user", JSON.stringify(userData));

        toast.success("Login successful! Redirecting...", {
          position: "top-center",
          autoClose: 2000
        });

        // Redirect based on permissions
        setTimeout(() => {
          if (userData.role === 'admin' || userData.permissions.includes('dashboard')) {
            navigate("/");
          } else if (userData.permissions.length > 0) {
            // Redirect to first permitted page
            const firstPermission = userData.permissions[0];
            const redirectPath = firstPermission === 'dashboard' ? '/' :
              firstPermission === 'purchase-order' ? '/purchase-order' :
                `/${firstPermission}`;
            navigate(redirectPath);
          } else {
            // No permissions assigned - show message
            toast.error("No permissions assigned. Please contact administrator.");
            // Keep user logged in but stay on login page
          }
        }, 2000);

      } catch (error) {
        console.error("Login error:", error);
        let errorMessage = "Login failed";
        if (error.response) {
          errorMessage = error.response.data.message || errorMessage;

          // Handle specific error cases
          if (error.response.status === 401) {
            errorMessage = "Invalid email or password";
          } else if (error.response.status === 403) {
            errorMessage = "Account suspended. Please contact administrator";
          }
        }
        toast.error(errorMessage, {
          position: "top-center",
          autoClose: 3000
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const handleSwitchToRegister = () => navigate("/register");

  // Check if user is already logged in but has no permissions
  const checkExistingUser = () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    if (token && user.userId) {
      if (user.role === 'admin' || user.permissions?.length > 0) {
        // User has permissions, redirect to appropriate page
        if (user.permissions?.includes('dashboard') || user.role === 'admin') {
          navigate("/");
        } else {
          const firstPermission = user.permissions[0];
          const redirectPath = firstPermission === 'purchase-order' ? '/purchase-order' : `/${firstPermission}`;
          navigate(redirectPath);
        }
      } else {
        // User is logged in but has no permissions
        toast.info("Your account has no permissions. Please contact administrator.", {
          position: "top-center",
          autoClose: 4000
        });
      }
    }
  };

  // Check on component mount
  useState(() => {
    checkExistingUser();
  }, []);

  return (
    <div className="login-container">
      <ToastContainer />
      <div className="login-wrapper">
        {/* LEFT: welcome text */}
        <div className="login-left">
          <div className="left-inner">
            <img src={logo} alt="Logo" className="left-logo" />
            <h1 className="welcome-title">Welcome Back!</h1>
            <div className="divider" />
            <p className="welcome-desc">
              Access powerful tools for inventory control, from GRNs and BOMs to work orders and sales. Log in to keep your business operations organized and efficient!.
            </p>

            {/* Show different message based on user status */}
            {localStorage.getItem("token") && (
              <div className="left-footer-home">
                <p>Already logged in, Go to Home?</p>
                <div className="home-buttons">
                  <button
                    onClick={() => navigate("/")}
                    className="home-button secondary"
                  >
                    Home
                  </button>
                </div>
              </div>
            )}
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
                  placeholder="Enter your email"
                />
                {formik.touched.email && formik.errors.email ? (
                  <div className="error-message">{formik.errors.email}</div>
                ) : null}
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
                    placeholder="Enter your password"
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
                {formik.touched.password && formik.errors.password ? (
                  <div className="error-message">{formik.errors.password}</div>
                ) : null}
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging in..." : "Sign In"}
              </button>
            </form>



            {/* <div className="switch-auth">
              Don't have an account?
              <button onClick={handleSwitchToRegister} className="switch-button">
                Register here
              </button>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;