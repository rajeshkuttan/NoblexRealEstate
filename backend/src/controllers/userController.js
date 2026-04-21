const { User, Role } = require('../models');
const bcrypt = require('bcryptjs');
const { assignUserRole, getUserEffectivePermissions } = require('../services/rbacService');

// Get all users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.findAll({
      where: { isActive: true },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          required: false,
        },
      ],
      order: [['created_at', 'DESC']]
    });

    const normalizedUsers = await Promise.all(
      users.map(async (user) => {
        const plain = user.toJSON();
        const authz = await getUserEffectivePermissions(user);
        return {
          ...plain,
          roles: authz.roles,
          permissions: authz.permissions,
          roleId: authz.roles[0]?.id || null,
          role: authz.roles[0]?.key || plain.role,
        };
      }),
    );

    res.json({
      success: true,
      data: {
        users: normalizedUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
          required: false,
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const plain = user.toJSON();
    const authz = await getUserEffectivePermissions(user);

    res.json({
      success: true,
      data: {
        user: {
          ...plain,
          roles: authz.roles,
          permissions: authz.permissions,
          roleId: authz.roles[0]?.id || null,
          role: authz.roles[0]?.key || plain.role,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create new user
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, roleId, phone, avatar } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    let finalRoleKey = role || 'agent';
    let finalRoleId = roleId || null;
    if (finalRoleId) {
      const selectedRole = await Role.findByPk(finalRoleId);
      if (!selectedRole || !selectedRole.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Selected role is invalid or inactive'
        });
      }
      finalRoleKey = selectedRole.key;
    } else if (role) {
      const selectedRole = await Role.findOne({ where: { key: String(role).toLowerCase() } });
      if (selectedRole && selectedRole.isActive) {
        finalRoleId = selectedRole.id;
        finalRoleKey = selectedRole.key;
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      role: finalRoleKey,
      phone,
      avatar,
      isActive: true
    });

    if (!finalRoleId) {
      const fallbackRole = await Role.findOne({ where: { key: finalRoleKey } });
      if (fallbackRole) {
        finalRoleId = fallbackRole.id;
      }
    }
    if (finalRoleId) {
      await assignUserRole(user.id, finalRoleId);
    }

    const userResponse = user.toJSON();
    const authz = await getUserEffectivePermissions(user);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: {
        user: {
          ...userResponse,
          roles: authz.roles,
          permissions: authz.permissions,
          roleId: authz.roles[0]?.id || null,
          role: authz.roles[0]?.key || userResponse.role,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update user
const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, roleId, phone, avatar, password, isActive } = req.body;
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    let nextRoleKey = role || user.role;
    let nextRoleId = roleId || null;
    if (nextRoleId) {
      const selectedRole = await Role.findByPk(nextRoleId);
      if (!selectedRole || !selectedRole.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Selected role is invalid or inactive'
        });
      }
      nextRoleKey = selectedRole.key;
    } else if (role) {
      const selectedRole = await Role.findOne({ where: { key: String(role).toLowerCase() } });
      if (selectedRole && selectedRole.isActive) {
        nextRoleId = selectedRole.id;
        nextRoleKey = selectedRole.key;
      }
    }

    const updateData = {
      name: name || user.name,
      email: email || user.email,
      role: nextRoleKey,
      phone: phone !== undefined ? phone : user.phone,
      avatar: avatar !== undefined ? avatar : user.avatar,
      isActive: isActive !== undefined ? isActive : user.isActive
    };

    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    await user.update(updateData);
    if (nextRoleId) {
      await assignUserRole(user.id, nextRoleId);
    } else {
      const matchingRole = await Role.findOne({ where: { key: nextRoleKey } });
      if (matchingRole) {
        await assignUserRole(user.id, matchingRole.id);
      }
    }

    const authz = await getUserEffectivePermissions(user);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: {
          ...user.toJSON(),
          roles: authz.roles,
          permissions: authz.permissions,
          roleId: authz.roles[0]?.id || null,
          role: authz.roles[0]?.key || user.role,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete user (Soft delete)
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting your own account
    if (req.user.id === user.id) {
        return res.status(400).json({
            success: false,
            message: 'You cannot delete your own account'
        });
    }

    // Soft delete: set isActive to false
    await user.update({ isActive: false });

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
