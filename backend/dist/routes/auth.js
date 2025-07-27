"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authService_1 = require("../services/authService");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        const result = await authService_1.AuthService.login(email, password);
        if (!result) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        res.json(result);
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get current user
router.get('/me', auth_1.authenticateToken, async (req, res) => {
    try {
        const users = await authService_1.AuthService.getAllUsers();
        const user = users.find(u => u.id === req.user?.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get all users (admin only)
router.get('/users', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const users = await authService_1.AuthService.getAllUsers();
        res.json({ users });
    }
    catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Create user (admin only)
router.post('/users', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }
        if (role && !['admin', 'user'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const user = await authService_1.AuthService.createUser(username, email, password, role);
        res.status(201).json({ user });
    }
    catch (error) {
        console.error('Create user error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Update user (admin only)
router.put('/users/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, role } = req.body;
        const updates = {};
        if (username)
            updates.username = username;
        if (email)
            updates.email = email;
        if (role) {
            if (!['admin', 'user'].includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }
            updates.role = role;
        }
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid updates provided' });
        }
        const user = await authService_1.AuthService.updateUser(id, updates);
        res.json({ user });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Set user password (admin only)
router.put('/users/:id/password', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        if (!password) {
            return res.status(400).json({ error: 'Password is required' });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        await authService_1.AuthService.setUserPassword(id, password);
        res.json({ message: 'Password updated successfully' });
    }
    catch (error) {
        console.error('Set user password error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Get user LLM token usage (admin only)
router.get('/users/:id/token-usage', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const tokenUsage = await authService_1.AuthService.getUserTokenUsage(id);
        res.json({ tokenUsage });
    }
    catch (error) {
        console.error('Get user token usage error:', error);
        res.status(400).json({ error: error.message });
    }
});
// Get all users with token usage (admin only)
router.get('/users-with-usage', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const usersWithUsage = await authService_1.AuthService.getAllUsersWithTokenUsage();
        res.json({ users: usersWithUsage });
    }
    catch (error) {
        console.error('Get users with usage error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Delete user (admin only)
router.delete('/users/:id', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        // Prevent admin from deleting themselves
        if (id === req.user?.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        await authService_1.AuthService.deleteUser(id);
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete user error:', error);
        res.status(400).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map