import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import finsightRoutes from "./routes/finsight.routes.js";
import errorHandler from "./middleware/errorHandler.js";

// Load environment variables (Essential for GROQ_API_KEY)
dotenv.config();

const app = express();


// 1. Security & Access
const allowedOrigins = [
  "http://localhost:3000",
  "https://finsightaiapp.vercel.app" // Your production URL
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error('CORS policy: This origin is not allowed'), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  credentials: true
}));

// 2. Request Parsing
// We keep the 10mb limit in case you eventually upload business logos/files for reports
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 3. Request Logging (The "Traffic Monitor")
// app.use((req, res, next) => {
//   console.log(`\n--- ${new Date().toLocaleTimeString()} ---`);
//   console.log(`${req.method} ${req.url}`);
//   if (Object.keys(req.body).length > 0) {
//     console.log("Body Keys:", Object.keys(req.body));
//   }
//   next();
// });

app.use((req, res, next) => {
  console.log(`\n--- ${new Date().toLocaleTimeString()} ---`);
  console.log(`${req.method} ${req.url}`);

  const body = req.body ?? {};

  if (Object.keys(body).length > 0) {
    console.log("Body Keys:", Object.keys(body));
  }

  next();
});
// 4. API Health Check (Good for testing if the server is live)
app.get("/health", (req, res) => res.status(200).send("Finsight Backend is Online"));

// 5. App Routes
app.use("/api", finsightRoutes);

// 6. Global Error Handler
app.use(errorHandler);


export default app;
