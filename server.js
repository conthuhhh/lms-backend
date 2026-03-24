const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();

const mongoose = require('mongoose');

const app = express();
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT || 5000;

// ── Socket.io (real-time chat) ──────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:5173', credentials: true },
});
app.set('io', io); // để controller truy cập qua req.app.get('io')

io.on('connection', (socket) => {
  // Join phòng: courseId
  socket.on('join_course', ({ courseId }) => {
    socket.join(courseId);
  });

  // Leave phòng
  socket.on('leave_course', ({ courseId }) => {
    socket.leave(courseId);
  });

  socket.on('disconnect', () => {});
});

// --- Security headers ---
app.use(helmet());

// --- CORS ---
app.use(cors({
  origin: 'http://localhost:5173',   // Vite dev server
  credentials: true,                   // Cho phép gửi nhận cookie
}));

// --- Cookie parser (đọc csrf_secret từ cookie) ---
app.use(cookieParser());

// --- Rate limiting: 100 req / 15 phút / IP ---
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// --- Body parser ---
app.use(express.json({ limit: '10kb' }));  // Giới hạn body tránh DOS

// Test kết nối MongoDB
async function testConnection() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 30000,
      tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true
    });
    console.log("MongoDB Atlas Connected successfully!");
  } catch (error) {
    console.error("MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}

// Routes
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const authRoutes = require('./routes/authRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const metaRoutes = require('./routes/metaRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.get('/', (req, res) => {
  res.json({ message: 'LMS API is running', status: 'connected' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/meta', metaRoutes);

// Serve uploaded files (chỉ đọc, không execute)
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Upload file endpoint
app.use('/api/upload', uploadRoutes);

// Chat theo khóa học (Socket.io real-time)
app.use('/api/chat', chatRoutes);

// Start server
async function startServer() {
  await testConnection();

  server.listen(PORT, () => {
    console.log(`Server + Socket.io running on port ${PORT}`);
  });
}

startServer();
