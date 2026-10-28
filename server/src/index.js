import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import http from 'node:http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { User, Movie, Theatre, Show, Booking } from './models.js';
import { auth, admin } from './auth.js';
import { memoryCache, cacheMiddleware } from './cache.js';
import { createPaymentOrder, verifyPaymentSignature, getRazorpayPublicKey } from './razorpay.js';

// Guarantee .env is loaded regardless of current working directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'imovies_super_secret_jwt_key_2026_modern_cinema';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/imovies';

const app = express();
const server = http.createServer(app);

// Realtime WebSockets for instant seat updates & live occupancy
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Fast backend performance metrics middleware
app.use((req, res, next) => {
  const start = process.hrtime();
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const timeMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    res.setHeader('X-Response-Time', `${timeMs}ms`);
  });
  next();
});

app.use(compression());
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({
  origin: (origin, callback) => callback(null, true), // Allow all local/dev origins safely
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting: 600 requests per 15 mins for fast interactive browsing
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600 }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting'
  });
});

// -------------------------------------------------------------
// AUTHENTICATION
// -------------------------------------------------------------
app.post('/api/auth/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');
    const phone = String(req.body.phone || '').trim();

    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) {
      return res.status(400).json({ message: 'Enter a valid name, email, and password (at least 6 characters)' });
    }

    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'Email is already registered. Please sign in.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword, phone, role: 'user' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    const password = String(req.body.password || '');

    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
    });
  } catch (err) {
    next(err);
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  res.json({ user: req.user });
});

// -------------------------------------------------------------
// MOVIES (Cached for high performance)
// -------------------------------------------------------------
app.get('/api/movies', cacheMiddleware(45), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.search) {
      const sanitized = String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { 'genre': { $regex: sanitized, $options: 'i' } },
        { language: { $regex: sanitized, $options: 'i' } }
      ];
    }
    if (req.query.language && req.query.language !== 'All') {
      filter.language = req.query.language;
    }
    if (req.query.genre && req.query.genre !== 'All') {
      filter.genre = req.query.genre;
    }
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(req.query.limit) || 20));

    const [items, total] = await Promise.all([
      Movie.find(filter)
        .sort({ rating: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Movie.countDocuments(filter)
    ]);

    res.json({ items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

app.get('/api/movies/featured', cacheMiddleware(60), async (_req, res, next) => {
  try {
    const featured = await Movie.find({ status: 'now_showing' })
      .sort({ rating: -1 })
      .limit(5)
      .lean();
    res.json(featured);
  } catch (err) {
    next(err);
  }
});

app.get('/api/movies/:id', async (req, res, next) => {
  try {
    const movie = await Movie.findById(req.params.id).lean();
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    res.json(movie);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// THEATRES & CITIES
// -------------------------------------------------------------
app.get('/api/theatres', cacheMiddleware(60), async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.city) {
      filter.city = { $regex: new RegExp(`^${req.query.city}$`, 'i') };
    }
    const theatres = await Theatre.find(filter).sort({ city: 1, name: 1 }).lean();
    res.json(theatres);
  } catch (err) {
    next(err);
  }
});

app.get('/api/cities', cacheMiddleware(120), async (_req, res, next) => {
  try {
    const cities = await Theatre.distinct('city');
    res.json(cities.filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// SHOWS
// -------------------------------------------------------------
app.get('/api/shows', async (req, res, next) => {
  try {
    const filter = { startsAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) } };
    if (req.query.movie) filter.movie = req.query.movie;
    if (req.query.theatre) filter.theatre = req.query.theatre;

    if (req.query.date) {
      const selected = new Date(req.query.date);
      const startOfDay = new Date(selected.setHours(0, 0, 0, 0));
      const endOfDay = new Date(selected.setHours(23, 59, 59, 999));
      filter.startsAt = { $gte: startOfDay, $lte: endOfDay };
    }

    const shows = await Show.find(filter)
      .populate('movie')
      .populate('theatre')
      .sort({ startsAt: 1 })
      .limit(80)
      .lean();

    res.json(shows);
  } catch (err) {
    next(err);
  }
});

app.get('/api/shows/:id', async (req, res, next) => {
  try {
    const show = await Show.findById(req.params.id)
      .populate('movie')
      .populate('theatre')
      .lean();
    if (!show) return res.status(404).json({ message: 'Show not found' });
    res.json(show);
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// RAZORPAY PAYMENT & BOOKING FLOW
// -------------------------------------------------------------
app.get('/api/payment/key', (_req, res) => {
  res.json({
    keyId: getRazorpayPublicKey(),
    currency: process.env.RAZORPAY_CURRENCY || 'INR'
  });
});

app.post('/api/payment/create-order', auth, async (req, res, next) => {
  try {
    const { showId, seats, promoCode } = req.body;
    const seatCodes = [...new Set((Array.isArray(seats) ? seats : []).map(String))];

    if (!seatCodes.length || seatCodes.length > 10) {
      return res.status(400).json({ message: 'Please select between 1 and 10 seats' });
    }

    const show = await Show.findById(showId).populate('movie').populate('theatre');
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }
    if (new Date(show.startsAt) <= new Date()) {
      return res.status(400).json({ message: 'This show has already started' });
    }

    const unavailableSeats = [];
    let subtotal = 0;
    const seatDetails = [];

    for (const code of seatCodes) {
      const seatObj = show.seats.find(s => s.code === code);
      if (!seatObj) {
        return res.status(400).json({ message: `Seat ${code} is invalid` });
      }
      if (seatObj.status !== 'available') {
        unavailableSeats.push(code);
      }

      const seatPrice = seatObj.price || (show.pricing && show.pricing[seatObj.tier]) || show.price;
      subtotal += seatPrice;
      seatDetails.push({
        code,
        tier: seatObj.tier || 'classic',
        price: seatPrice
      });
    }

    if (unavailableSeats.length > 0) {
      return res.status(409).json({
        message: `Seats ${unavailableSeats.join(', ')} are already booked. Please choose other seats.`
      });
    }

    const bookingFee = seatCodes.length * 20;

    let discount = 0;
    let validPromo = '';
    if (promoCode) {
      const codeUpper = String(promoCode).toUpperCase().trim();
      if (codeUpper === 'IMOVIES50' || codeUpper === 'CINEMA50') {
        discount = Math.min(50, subtotal);
        validPromo = codeUpper;
      } else if (codeUpper === 'BLOCKBUSTER' || codeUpper === 'FESTIVE100') {
        discount = Math.min(100, subtotal);
        validPromo = codeUpper;
      }
    }

    const finalTotal = Math.max(1, subtotal + bookingFee - discount);

    const receiptId = `imv_rcpt_${Date.now()}_${String(req.user._id || req.user.id).slice(-4)}`;
    const razorpayOrder = await createPaymentOrder({
      amount: finalTotal,
      currency: 'INR',
      receipt: receiptId,
      notes: {
        userId: String(req.user._id || req.user.id),
        showId: String(show._id),
        movie: show.movie?.title,
        seats: seatCodes.join(',')
      }
    });

    res.json({
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: razorpayOrder.keyId,
      isSimulated: razorpayOrder.isSimulated,
      breakdown: {
        seats: seatDetails,
        subtotal,
        bookingFee,
        discount,
        promoCode: validPromo,
        total: finalTotal
      },
      movieTitle: show.movie?.title,
      theatreName: show.theatre?.name,
      startsAt: show.startsAt
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/payment/verify-and-book', auth, async (req, res, next) => {
  try {
    const {
      showId,
      seats,
      orderId,
      paymentId,
      signature,
      paymentMethod = 'Razorpay UPI/Card',
      promoCode = '',
      customerInfo = {}
    } = req.body;

    const seatCodes = [...new Set((Array.isArray(seats) ? seats : []).map(String))];
    if (!seatCodes.length) {
      return res.status(400).json({ message: 'No seats provided' });
    }

    const isValidPayment = verifyPaymentSignature({ orderId, paymentId, signature });
    if (!isValidPayment) {
      return res.status(400).json({ message: 'Payment verification failed: invalid signature' });
    }

    const show = await Show.findById(showId).populate('movie').populate('theatre');
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Atomic MongoDB seat update with valid alphanumeric array filter identifiers
    const updatedShow = await Show.findOneAndUpdate(
      {
        _id: showId,
        seats: {
          $all: seatCodes.map(code => ({
            $elemMatch: { code, status: 'available' }
          }))
        }
      },
      {
        $set: Object.fromEntries(
          seatCodes.map((code, idx) => [`seats.$[elem${idx}].status`, 'booked'])
        )
      },
      {
        arrayFilters: seatCodes.map((code, idx) => ({
          [`elem${idx}.code`]: code,
          [`elem${idx}.status`]: 'available'
        })),
        new: true
      }
    );

    if (!updatedShow) {
      return res.status(409).json({
        message: 'One or more seats were booked moments ago. A full refund has been scheduled.'
      });
    }

    let subtotal = 0;
    const seatsWithDetails = [];
    for (const code of seatCodes) {
      const sObj = updatedShow.seats.find(s => s.code === code);
      const price = sObj?.price || (updatedShow.pricing && updatedShow.pricing[sObj?.tier]) || updatedShow.price;
      subtotal += price;
      seatsWithDetails.push({
        code,
        tier: sObj?.tier || 'classic',
        price
      });
    }

    const bookingFee = seatCodes.length * 20;
    let discount = 0;
    if (promoCode === 'IMOVIES50' || promoCode === 'CINEMA50') discount = 50;
    if (promoCode === 'BLOCKBUSTER' || promoCode === 'FESTIVE100') discount = 100;
    const grandTotal = Math.max(1, subtotal + bookingFee - discount);

    const bookingCode = `IMV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const booking = await Booking.create({
      bookingCode,
      user: req.user._id || req.user.id,
      show: showId,
      seats: seatsWithDetails,
      subtotal,
      bookingFee,
      discount,
      total: grandTotal,
      promoCode,
      status: 'confirmed',
      payment: {
        gateway: 'razorpay',
        orderId,
        paymentId,
        signature: signature || 'verified',
        status: 'paid',
        method: paymentMethod,
        paidAt: new Date()
      },
      customerInfo: {
        name: customerInfo.name || req.user.name,
        email: customerInfo.email || req.user.email,
        phone: customerInfo.phone || req.user.phone || ''
      }
    });

    memoryCache.invalidatePrefix('/api/shows');
    io.to(showId).emit('seats-updated', { showId, bookedSeats: seatCodes });

    const populated = await Booking.findById(booking._id).populate({
      path: 'show',
      populate: ['movie', 'theatre']
    });

    res.status(201).json({
      message: 'Booking confirmed successfully!',
      booking: populated
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// USER BOOKINGS
// -------------------------------------------------------------
app.get('/api/bookings/mine', auth, async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const bookings = await Booking.find({ user: userId })
      .populate({
        path: 'show',
        populate: ['movie', 'theatre']
      })
      .sort({ createdAt: -1 })
      .lean();

    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

app.get('/api/bookings/:id', auth, async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const booking = await Booking.findOne({ _id: req.params.id, user: userId })
      .populate({
        path: 'show',
        populate: ['movie', 'theatre']
      })
      .lean();

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    next(err);
  }
});

app.post('/api/bookings/:id/cancel', auth, async (req, res, next) => {
  try {
    const userId = req.user._id || req.user.id;
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: userId,
      status: 'confirmed'
    }).populate('show');

    if (!booking) {
      return res.status(404).json({ message: 'Active booking not found' });
    }

    if (new Date(booking.show.startsAt) <= new Date()) {
      return res.status(400).json({ message: 'Cannot cancel a show that has already started' });
    }

    booking.status = 'cancelled';
    booking.payment.status = 'refunded';
    await booking.save();

    const seatCodes = booking.seats.map(s => (typeof s === 'string' ? s : s.code));
    await Show.updateOne(
      { _id: booking.show._id },
      {
        $set: Object.fromEntries(
          seatCodes.map((code, idx) => [`seats.$[elem${idx}].status`, 'available'])
        )
      },
      {
        arrayFilters: seatCodes.map((code, idx) => ({
          [`elem${idx}.code`]: code
        }))
      }
    );

    memoryCache.invalidatePrefix('/api/shows');
    io.to(String(booking.show._id)).emit('seats-updated', { showId: String(booking.show._id) });

    res.json({
      message: 'Booking cancelled successfully. Refund has been initiated.',
      booking
    });
  } catch (err) {
    next(err);
  }
});

// -------------------------------------------------------------
// ADMIN MANAGEMENT & ANALYTICS
// -------------------------------------------------------------
app.get('/api/admin/stats', auth, admin, async (_req, res, next) => {
  try {
    const [movieCount, theatreCount, showCount, totalBookings, revenueAgg] = await Promise.all([
      Movie.countDocuments(),
      Theatre.countDocuments(),
      Show.countDocuments({ startsAt: { $gte: new Date() } }),
      Booking.countDocuments(),
      Booking.aggregate([
        { $match: { status: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    res.json({
      movies: movieCount,
      theatres: theatreCount,
      activeShows: showCount,
      totalBookings,
      revenue: revenueAgg[0]?.total || 0
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/admin/movies', auth, admin, async (req, res, next) => {
  try {
    const movie = await Movie.create(req.body);
    memoryCache.invalidatePrefix('/api/movies');
    res.status(201).json(movie);
  } catch (err) {
    next(err);
  }
});

app.put('/api/admin/movies/:id', auth, admin, async (req, res, next) => {
  try {
    const movie = await Movie.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!movie) return res.status(404).json({ message: 'Movie not found' });
    memoryCache.invalidatePrefix('/api/movies');
    res.json(movie);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/admin/movies/:id', auth, admin, async (req, res, next) => {
  try {
    await Movie.findByIdAndDelete(req.params.id);
    memoryCache.invalidatePrefix('/api/movies');
    res.json({ message: 'Movie deleted' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/admin/theatres', auth, admin, async (req, res, next) => {
  try {
    const theatre = await Theatre.create(req.body);
    memoryCache.invalidatePrefix('/api/theatres');
    memoryCache.invalidatePrefix('/api/cities');
    res.status(201).json(theatre);
  } catch (err) {
    next(err);
  }
});

app.post('/api/admin/shows', auth, admin, async (req, res, next) => {
  try {
    const { movie, theatre, startsAt, rows = 6, columns = 10, classicPrice = 180, premiumPrice = 260, vipPrice = 380, screenName = 'Audi 1 (Dolby 7.1)' } = req.body;

    if (!(await Movie.exists({ _id: movie })) || !(await Theatre.exists({ _id: theatre }))) {
      return res.status(400).json({ message: 'Valid movie and theatre required' });
    }

    const seats = [];
    const numRows = Math.min(10, Math.max(1, Number(rows)));
    const numCols = Math.min(14, Math.max(1, Number(columns)));

    for (let r = 0; r < numRows; r++) {
      const rowLetter = String.fromCharCode(65 + r);
      let tier = 'classic';
      let price = Number(classicPrice);
      if (r < 2) {
        tier = 'vip';
        price = Number(vipPrice);
      } else if (r < 4) {
        tier = 'premium';
        price = Number(premiumPrice);
      }

      for (let c = 1; c <= numCols; c++) {
        seats.push({
          code: `${rowLetter}${c}`,
          row: rowLetter,
          number: c,
          tier,
          price,
          status: 'available'
        });
      }
    }

    const show = await Show.create({
      movie,
      theatre,
      screenName,
      startsAt: new Date(startsAt),
      price: Number(classicPrice),
      pricing: { classic: Number(classicPrice), premium: Number(premiumPrice), vip: Number(vipPrice) },
      seats
    });

    memoryCache.invalidatePrefix('/api/shows');
    res.status(201).json(show);
  } catch (err) {
    next(err);
  }
});

app.get('/api/admin/bookings', auth, admin, async (_req, res, next) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email phone')
      .populate({ path: 'show', populate: ['movie', 'theatre'] })
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json(bookings);
  } catch (err) {
    next(err);
  }
});

// Realtime room events
io.on('connection', (socket) => {
  socket.on('join-show', (showId) => {
    if (typeof showId === 'string' && showId.length < 50) {
      socket.join(showId);
    }
  });

  socket.on('leave-show', (showId) => {
    if (typeof showId === 'string') {
      socket.leave(showId);
    }
  });
});

// Centralized error handling
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid ID format' });
  if (err.code === 11000) return res.status(409).json({ message: 'Record already exists' });
  res.status(500).json({ message: err.message || 'Internal server error' });
});

// Robust process & server error handling
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err.message);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Port Conflict] Port ${PORT} is in use. Attempting fallback on port ${PORT + 1}...`);
    server.listen(PORT + 1, () => {
      console.log(`[IMovies API] Fallback service running at http://localhost:${PORT + 1}`);
    });
  } else {
    console.error('[Server listen error]:', err.message);
  }
});

// Connect to MongoDB and start HTTP/WebSocket listener
async function startServer() {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected successfully to ${MONGO_URI}`);
    server.listen(PORT, () => {
      console.log(`[IMovies API] Ultra-fast cinema service running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[MongoDB connection error]:', err.message);
    console.log('[Notice] Retrying MongoDB connection in 4 seconds...');
    setTimeout(startServer, 4000);
  }
}

startServer();
