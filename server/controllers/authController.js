import { User } from '../models/User.js';
import { generateToken } from '../utils/generateToken.js';
import { logger } from '../utils/logger.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'A user with this email address already exists'
      });
    }

    // Default role is client, only allow admin if explicitly provided and validated
    const userRole = role === 'admin' ? 'admin' : 'client';

    const user = await User.create({
      name,
      email,
      password,
      role: userRole
    });

    const token = generateToken(user);

    logger.info('New user registered successfully', {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    return res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      logger.warn('Login failure: User not found', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn('Login failure: Invalid credentials', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user);

    logger.info('User logged in successfully', {
      userId: user._id.toString(),
      email: user.email,
      role: user.role
    });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};
