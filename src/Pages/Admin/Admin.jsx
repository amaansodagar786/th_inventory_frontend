// src/Pages/Admin/Admin.jsx
import React, { useState, useEffect, useMemo } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast, ToastContainer } from "react-toastify";
import {
    FaUser, FaEnvelope, FaPhone, FaPlus,
    FaFileExcel, FaSearch, FaEdit, FaSave, FaTrash, FaKey
} from "react-icons/fa";
import * as XLSX from "xlsx";
import Navbar from "../../Components/Sidebar/Navbar";
import "./Admin.scss";
import "react-toastify/dist/ReactToastify.css";

const Admin = () => {
    const [showForm, setShowForm] = useState(false);
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(9);

    // Available permissions
    const availablePermissions = [
        { key: "dashboard", label: "Dashboard" },
        { key: "customer", label: "Customer" },
        { key: "vendor", label: "Vendor" },
        { key: "items", label: "Items" },
        { key: "purchase-order", label: "Purchase Order" },
        { key: "grn", label: "GRN" },
        { key: "bom", label: "BOM" },
        { key: "work-order", label: "Work Order" },
        { key: "sales", label: "Sales" },
        { key: "inventory", label: "Inventory" },
        { key: "defective", label: "Defective" },
        { key: "report", label: "Report" },
        { key: "admin", label: "Admin" }
    ];

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    // Debounce logic
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(searchTerm.trim().toLowerCase());
            setCurrentPage(1);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Fetch users
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const token = localStorage.getItem("token");
                const response = await fetch(
                    `${import.meta.env.VITE_API_URL}/admin/get-users`,
                    {
                        headers: {
                            "Authorization": `Bearer ${token}`
                        }
                    }
                );

                if (!response.ok) throw new Error("Failed to fetch users");

                const data = await response.json();
                setUsers(data);
            } catch (err) {
                console.error("Error fetching users:", err);
                toast.error("Failed to fetch users");
            }
        };
        fetchUsers();
    }, []);

    // Filtered users
    const filteredUsers = useMemo(() => {
        if (!debouncedSearch) return users;

        return users.filter((user) => {
            return (
                user.name?.toLowerCase().includes(debouncedSearch) ||
                user.email?.toLowerCase().includes(debouncedSearch) ||
                user.phone?.toLowerCase().includes(debouncedSearch)
            );
        });
    }, [debouncedSearch, users]);

    // Pagination logic
    const paginatedUsers = useMemo(() => {
        if (debouncedSearch) return filteredUsers;
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredUsers.slice(0, startIndex + itemsPerPage);
    }, [filteredUsers, currentPage, itemsPerPage, debouncedSearch]);

    const hasMoreUsers = useMemo(() => {
        return debouncedSearch ? false : currentPage * itemsPerPage < filteredUsers.length;
    }, [currentPage, itemsPerPage, filteredUsers.length, debouncedSearch]);

    const loadMoreUsers = () => {
        setCurrentPage(prev => prev + 1);
    };

    const selectUser = (userId) => {
        setSelectedUser((prev) => (prev === userId ? null : userId));
    };

    // Form initial values
    const initialValues = {
        name: "",
        email: "",
        phone: "",
        password: "",
        permissions: []
    };

    // Validation schema
    const validationSchema = Yup.object({
        name: Yup.string()
            .required("Name is required")
            .matches(/^[a-zA-Z\s]*$/, "Name cannot contain numbers"),
        email: Yup.string()
            .email("Invalid email")
            .required("Email is required"),
        phone: Yup.string()
            .required("Phone is required")
            .matches(/^[0-9]+$/, "Must be only digits")
            .min(10, "Must be exactly 10 digits")
            .max(10, "Must be exactly 10 digits"),
        password: Yup.string()
            .required("Password is required")
            .min(6, "Password must be at least 6 characters")
    });

    // Handle form submission - Create User
    const handleSubmit = async (values, { resetForm, setFieldError }) => {
        try {
            const token = localStorage.getItem("token");
            const currentUser = JSON.parse(localStorage.getItem("user"));

            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/create-user`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        ...values,
                        createdBy: currentUser?.userId
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                if (data.field === "email") {
                    setFieldError("email", data.message);
                    toast.error(data.message);
                } else {
                    throw new Error(data.message || "Failed to create user");
                }
                return;
            }

            setUsers(prev => [data.user, ...prev]);
            toast.success("User created successfully!");
            resetForm();
            setShowForm(false);
        } catch (error) {
            console.error("Error creating user:", error);
            toast.error(error.message || "Error creating user");
        }
    };

    // Handle update user
    const handleUpdateUser = async (updatedUser) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/update-user/${updatedUser.userId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(updatedUser),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to update user");
            }

            const data = await response.json();
            setUsers(prev =>
                prev.map(user =>
                    user.userId === updatedUser.userId ? data.user : user
                )
            );
            toast.success("User updated successfully!");
        } catch (error) {
            console.error("Error updating user:", error);
            toast.error(error.message || "Error updating user");
        }
    };

    // Handle change password
    const handleChangePassword = async (userId, newPassword) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/change-password/${userId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ newPassword }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to change password");
            }

            toast.success("Password changed successfully!");
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error(error.message || "Error changing password");
        }
    };

    // Handle delete user
    const handleDeleteUser = async (userId) => {
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(
                `${import.meta.env.VITE_API_URL}/admin/delete-user/${userId}`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete user");
            }

            setUsers(prev => prev.filter(user => user.userId !== userId));
            setSelectedUser(null);
            toast.success("User deleted successfully!");
        } catch (error) {
            console.error("Error deleting user:", error);
            toast.error(error.message || "Error deleting user");
        }
    };

    // Export to Excel
    const exportAllAsExcel = () => {
        const dataToExport = filteredUsers.length > 0 ? filteredUsers : users;

        if (dataToExport.length === 0) {
            toast.warning("No users to export");
            return;
        }

        const worksheet = XLSX.utils.json_to_sheet(
            dataToExport.map((user) => ({
                Name: user.name,
                Email: user.email,
                Phone: user.phone,
                Role: (user.role === 'admin' || user.permissions?.includes('admin')) ? 'Admin' : 'User', // ✅ UPDATED
                Permissions: user.permissions?.join(", ") || "None",
                "Created At": new Date(user.createdAt).toLocaleDateString()
            }))
        );

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Users");

        const fileName = debouncedSearch ? "filtered_users.xlsx" : "all_users.xlsx";
        XLSX.writeFile(workbook, fileName);
    };

    // User Modal Component
    const UserModal = ({ user, onClose, onUpdate, onChangePassword, onDelete }) => {
        const [isEditing, setIsEditing] = useState(false);
        const [isChangingPassword, setIsChangingPassword] = useState(false);
        const [editedUser, setEditedUser] = useState({});
        const [newPassword, setNewPassword] = useState("");
        const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
        const [errors, setErrors] = useState({});

        useEffect(() => {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'auto';
            };
        }, []);

        useEffect(() => {
            if (user) {
                setEditedUser({ ...user });
                setErrors({});
            }
        }, [user]);

        const validateForm = (values) => {
            const newErrors = {};
            if (!values.name) newErrors.name = "Name is required";
            if (!values.email) newErrors.email = "Email is required";
            else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(values.email))
                newErrors.email = "Invalid email address";
            if (!values.phone) newErrors.phone = "Phone is required";
            else if (!/^[0-9]+$/.test(values.phone)) newErrors.phone = "Must be only digits";
            else if (values.phone.length !== 10) newErrors.phone = "Must be exactly 10 digits";
            return newErrors;
        };

        const handleInputChange = (e) => {
            const { name, value } = e.target;
            setEditedUser(prev => ({ ...prev, [name]: value }));
            const fieldErrors = validateForm({ ...editedUser, [name]: value });
            setErrors(prev => ({ ...prev, [name]: fieldErrors[name] }));
        };

        const handlePermissionChange = (permission, isChecked) => {
            setEditedUser(prev => {
                const permissions = isChecked
                    ? [...(prev.permissions || []), permission]
                    : (prev.permissions || []).filter(p => p !== permission);
                return { ...prev, permissions };
            });
        };

        const handleSave = async () => {
            const formErrors = validateForm(editedUser);
            if (Object.keys(formErrors).length > 0) {
                setErrors(formErrors);
                toast.error("Please fix the errors before saving");
                return;
            }

            try {
                await onUpdate(editedUser);
                setIsEditing(false);
                setErrors({});
            } catch (error) {
                console.error("Error updating user:", error);
            }
        };

        const handlePasswordChange = async () => {
            if (!newPassword) {
                toast.error("Please enter a new password");
                return;
            }

            try {
                await onChangePassword(user.userId, newPassword);
                setIsChangingPassword(false);
                setNewPassword("");
            } catch (error) {
                console.error("Error changing password:", error);
            }
        };

        if (!user) return null;

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                    <div className="modal-header">
                        <div className="modal-title">
                            {isEditing ? "Edit User" : `User Details: ${user.name}`}
                        </div>
                        <button className="modal-close" onClick={onClose}>&times;</button>
                    </div>

                    <div className="modal-body">
                        <div className="wo-details-grid">
                            {/* Name */}
                            <div className="detail-row">
                                <span className="detail-label">Name *</span>
                                {isEditing ? (
                                    <div className="edit-field-container">
                                        <input
                                            type="text"
                                            name="name"
                                            value={editedUser.name || ''}
                                            onChange={handleInputChange}
                                            className={`edit-input ${errors.name ? 'error' : ''}`}
                                        />
                                        {errors.name && <div className="error-message">{errors.name}</div>}
                                    </div>
                                ) : (
                                    <span className="detail-value">{user.name}</span>
                                )}
                            </div>

                            {/* Email */}
                            <div className="detail-row">
                                <span className="detail-label">Email *</span>
                                {isEditing ? (
                                    <div className="edit-field-container">
                                        <input
                                            type="email"
                                            name="email"
                                            value={editedUser.email || ''}
                                            onChange={handleInputChange}
                                            className={`edit-input ${errors.email ? 'error' : ''}`}
                                        />
                                        {errors.email && <div className="error-message">{errors.email}</div>}
                                    </div>
                                ) : (
                                    <span className="detail-value">{user.email}</span>
                                )}
                            </div>

                            {/* Phone */}
                            <div className="detail-row">
                                <span className="detail-label">Phone *</span>
                                {isEditing ? (
                                    <div className="edit-field-container">
                                        <input
                                            type="text"
                                            name="phone"
                                            value={editedUser.phone || ''}
                                            onChange={handleInputChange}
                                            className={`edit-input ${errors.phone ? 'error' : ''}`}
                                        />
                                        {errors.phone && <div className="error-message">{errors.phone}</div>}
                                    </div>
                                ) : (
                                    <span className="detail-value">{user.phone}</span>
                                )}
                            </div>

                            {/* Permissions */}
                            <div className="detail-row full-width">
                                <span className="detail-label">Permissions</span>
                                {isEditing ? (
                                    <div className="permissions-grid">
                                        {availablePermissions.map(perm => (
                                            <label key={perm.key} className="permission-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={(editedUser.permissions || []).includes(perm.key)}
                                                    onChange={(e) => handlePermissionChange(perm.key, e.target.checked)}
                                                />
                                                <span>{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="permissions-list">
                                        {user.permissions && user.permissions.length > 0
                                            ? user.permissions.map(perm => (
                                                <span key={perm} className="permission-tag">
                                                    {availablePermissions.find(p => p.key === perm)?.label || perm}
                                                </span>
                                            ))
                                            : <span className="detail-value">No permissions</span>
                                        }
                                    </div>
                                )}
                            </div>

                            {/* Change Password Section */}
                            {isChangingPassword && (
                                <div className="detail-row full-width">
                                    <span className="detail-label">New Password</span>
                                    <div className="password-change-container">
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                            className="edit-input"
                                        />
                                        <div className="password-actions">
                                            <button
                                                className="save-password-btn"
                                                onClick={handlePasswordChange}
                                            >
                                                Save Password
                                            </button>
                                            <button
                                                className="cancel-password-btn"
                                                onClick={() => {
                                                    setIsChangingPassword(false);
                                                    setNewPassword("");
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Created At */}
                            <div className="detail-row">
                                <span className="detail-label">Created At:</span>
                                <span className="detail-value">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        {!isChangingPassword && (
                            <button
                                className="change-password-btn"
                                onClick={() => setIsChangingPassword(true)}
                            >
                                <FaKey /> Change Password
                            </button>
                        )}
                        <button
                            className={`update-btn ${isEditing ? 'save-btn' : ''}`}
                            onClick={isEditing ? handleSave : () => setIsEditing(true)}
                        >
                            {isEditing ? <FaSave /> : <FaEdit />}
                            {isEditing ? "Save Changes" : "Update"}
                        </button>
                        <button
                            className="delete-btn"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            <FaTrash /> Delete
                        </button>
                    </div>
                </div>

                {/* Delete Confirmation Dialog */}
                {showDeleteConfirm && (
                    <div className="confirm-dialog-overlay">
                        <div className="confirm-dialog">
                            <h3>Confirm Deletion</h3>
                            <p>Are you sure you want to delete {user.name}? This action cannot be undone.</p>
                            <div className="confirm-buttons">
                                <button
                                    className="confirm-cancel"
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="confirm-delete"
                                    onClick={() => {
                                        onDelete(user.userId);
                                        setShowDeleteConfirm(false);
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Navbar>
            <ToastContainer position="top-center" autoClose={3000} />
            <div className="main">
                <div className="page-header">
                    <h2>User Management</h2>
                    <div className="right-section">
                        <div className="search-container">
                            <FaSearch className="search-icon" />
                            <input
                                type="text"
                                placeholder="Search Users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="action-buttons-group">
                            <button className="export-all-btn" onClick={exportAllAsExcel}>
                                <FaFileExcel /> Export All
                            </button>
                            <button className="add-btn" onClick={() => setShowForm(!showForm)}>
                                <FaPlus /> {showForm ? "Close" : "Add User"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add User Form */}
                {showForm && (
                    <div className="form-container premium">
                        <h2>Add New User</h2>
                        <Formik
                            initialValues={initialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleSubmit}
                        >
                            {({ values, setFieldValue }) => (
                                <Form>
                                    {/* Name + Email */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label><FaUser /> Name *</label>
                                            <Field name="name" type="text" />
                                            <ErrorMessage name="name" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label><FaEnvelope /> Email *</label>
                                            <Field name="email" type="email" />
                                            <ErrorMessage name="email" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* Phone + Password */}
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label><FaPhone /> Phone *</label>
                                            <Field name="phone" type="text" />
                                            <ErrorMessage name="phone" component="div" className="error" />
                                        </div>
                                        <div className="form-field">
                                            <label><FaKey /> Password *</label>
                                            <Field name="password" type="password" />
                                            <ErrorMessage name="password" component="div" className="error" />
                                        </div>
                                    </div>

                                    {/* Permissions */}
                                    <div className="form-row full-width">
                                        <div className="form-field">
                                            <label>Permissions</label>
                                            <div className="permissions-grid-form">
                                                {availablePermissions.map(perm => (
                                                    <label key={perm.key} className="permission-checkbox-form">
                                                        <Field
                                                            type="checkbox"
                                                            name="permissions"
                                                            value={perm.key}
                                                        />
                                                        <span>{perm.label}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit">Create User</button>
                                </Form>
                            )}
                        </Formik>
                    </div>
                )}

                {/* Users Table */}
                <div className="data-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Phone</th>
                                <th>Role</th>
                                <th>Permissions</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map((user, index) => (
                                <tr
                                    key={user.userId || index}
                                    className={selectedUser === user.userId ? "selected" : ""}
                                    onClick={() => selectUser(user.userId)}
                                >
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.phone}</td>
                                    <td>
                                        <span className={`role-badge ${(user.role === 'admin' || user.permissions?.includes('admin')) ? 'admin' : 'user'}`}>
                                            {(user.role === 'admin' || user.permissions?.includes('admin')) ? 'Admin' : 'User'}
                                        </span>
                                    </td>
                                    <td>
                                        {user.permissions && user.permissions.length > 0
                                            ? `${user.permissions.length} permissions`
                                            : 'No permissions'
                                        }
                                    </td>
                                    <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {hasMoreUsers && (
                        <div className="load-more-container">
                            <button className="load-more-btn" onClick={loadMoreUsers}>
                                Load More
                            </button>
                        </div>
                    )}
                </div>

                {/* User Modal */}
                {selectedUser && (
                    <UserModal
                        user={users.find(u => u.userId === selectedUser)}
                        onClose={() => setSelectedUser(null)}
                        onUpdate={handleUpdateUser}
                        onChangePassword={handleChangePassword}
                        onDelete={handleDeleteUser}
                    />
                )}
            </div>
        </Navbar>
    );
};

export default Admin;