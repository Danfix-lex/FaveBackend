import express from "express";
import mongoose from "mongoose";
import seedAdmin from "./utils/seedAdmin.js";
import dotenv from "dotenv";
import artistRouter from "./route/ArtistRoute.js";
import fanRouter from "./route/FanRoute.js";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

import session from "express-session";
import adminRouter from "./route/AdminRoute.js"

dotenv.config();

const app = express();

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store active fan connections
const fanConnections = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Fan registers for updates
  socket.on('registerFan', (fanId) => {
    fanConnections.set(fanId, socket.id);
    console.log(`Fan ${fanId} registered for updates`);
  });

  // Artist registers for updates
  socket.on('registerArtist', (artistId) => {
    // Artists might want to receive notifications too
    console.log(`Artist ${artistId} registered for updates`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Remove fan from connections map
    for (let [fanId, socketId] of fanConnections) {
      if (socketId === socket.id) {
        fanConnections.delete(fanId);
        break;
      }
    }
  });
});

// Make io available to other modules
app.set('io', io);

app.use(session({
    secret: process.env.JWT_SECRET || 'fallback_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

const allowedOrigins = [
    "http://localhost:3000",
    "http://localhost:3001",
    process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", artistRouter);
app.use("/api", fanRouter);
app.use("/admin", adminRouter)

app.get("/", (_req, res) => res.send("🚀 Fave Backend API is running..."));

const PORT = process.env.PORT || 3000;

mongoose.connection.on('error', err => {
    console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log(' MongoDB disconnected');
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log(' MongoDB connection closed through app termination');
    process.exit(0);
});

mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(async () => {
        console.log("✅ MongoDB connected");
        await seedAdmin();
        // Use the HTTP server instead of app.listen
        server.listen(PORT, () => {
            console.log(`🚀 Server running on http://localhost:${PORT}`);
        });

        server.on('error', (err) => {
            console.error('❌ Server error:', err);
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB connection error:", err);
        process.exit(1);
    });