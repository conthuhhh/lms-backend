const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { generateCsrfCookie } = require('../middleware/csrfMiddleware');

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name, subjectCategory: user.subjectCategory },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { token: csrfToken, secret: csrfSecret } = generateCsrfCookie(req, res, user._id);

    res.json({
      message: 'Login successful',
      token,
      csrfToken,
      csrfSecret,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subjectCategory: user.subjectCategory,
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Làm mới CSRF (cookie + token) mỗi lần mở app — tránh hết hạn cookie nhưng JWT còn
    const { token: csrfToken, secret: csrfSecret } = generateCsrfCookie(req, res, user._id);
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      subjectCategory: user.subjectCategory,
      csrfToken,
      csrfSecret,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, subjectCategory } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'student',
      subjectCategory: role === 'instructor' ? (subjectCategory || null) : null,
    });
    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: { ...user.toObject(), password: undefined }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const patch = {};
    const { name, email, password, role, subjectCategory } = req.body;

    if (name !== undefined) patch.name = String(name).trim();
    if (email !== undefined) patch.email = String(email).trim().toLowerCase();
    if (password !== undefined && password) {
      const salt = await bcrypt.genSalt(10);
      patch.password = await bcrypt.hash(password, salt);
    }
    if (role !== undefined) patch.role = role;
    if (role === 'instructor' && subjectCategory !== undefined) {
      patch.subjectCategory = subjectCategory || null;
    } else if (role !== 'instructor') {
      patch.subjectCategory = null;
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      patch,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
