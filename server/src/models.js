import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  phone: { type: String, default: '' }
}, { timestamps: true });

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, index: true },
  description: { type: String, default: '' },
  poster: { type: String, default: '' },
  backdrop: { type: String, default: '' },
  trailerUrl: { type: String, default: '' },
  genre: [{ type: String }],
  language: { type: String, default: 'Hindi', index: true },
  duration: { type: Number, default: 120 },
  rating: { type: Number, default: 8.0, min: 0, max: 10, index: true },
  releaseDate: { type: String, default: '' },
  certification: { type: String, default: 'UA 16+' },
  status: { type: String, enum: ['now_showing', 'upcoming'], default: 'now_showing', index: true }
}, { timestamps: true });

movieSchema.index({ status: 1, rating: -1 });

const theatreSchema = new mongoose.Schema({
  name: { type: String, required: true },
  city: { type: String, required: true, index: true },
  address: { type: String, default: '' },
  screens: [{ name: String, format: String }],
  amenities: [{ type: String }]
}, { timestamps: true });

theatreSchema.index({ city: 1, name: 1 });

const showSchema = new mongoose.Schema({
  movie: { type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true, index: true },
  theatre: { type: mongoose.Schema.Types.ObjectId, ref: 'Theatre', required: true, index: true },
  screenName: { type: String, default: 'Audi 1 (IMAX)' },
  format: { type: String, default: '2D' },
  startsAt: { type: Date, required: true, index: true },
  endsAt: { type: Date },
  price: { type: Number, required: true, min: 0 },
  pricing: {
    classic: { type: Number, default: 180 },
    premium: { type: Number, default: 260 },
    vip: { type: Number, default: 380 }
  },
  seats: [{
    code: { type: String, required: true },
    row: { type: String },
    number: { type: Number },
    tier: { type: String, enum: ['classic', 'premium', 'vip'], default: 'classic' },
    price: { type: Number, default: 180 },
    status: { type: String, enum: ['available', 'booked'], default: 'available' }
  }]
}, { timestamps: true });

showSchema.index({ movie: 1, startsAt: 1 });
showSchema.index({ theatre: 1, startsAt: 1 });

const bookingSchema = new mongoose.Schema({
  bookingCode: { type: String, unique: true, sparse: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  show: { type: mongoose.Schema.Types.ObjectId, ref: 'Show', required: true, index: true },
  seats: [{
    code: { type: String, required: true },
    tier: { type: String, default: 'classic' },
    price: { type: Number, required: true }
  }],
  subtotal: { type: Number, required: true },
  bookingFee: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  total: { type: Number, required: true },
  promoCode: { type: String, default: '' },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed', index: true },
  payment: {
    gateway: { type: String, default: 'razorpay' },
    orderId: { type: String, default: '' },
    paymentId: { type: String, default: '' },
    signature: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'paid', 'refunded', 'failed'], default: 'paid' },
    method: { type: String, default: 'Razorpay Online' },
    paidAt: { type: Date, default: Date.now }
  },
  customerInfo: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' }
  }
}, { timestamps: true });

bookingSchema.index({ user: 1, createdAt: -1 });

export const User = mongoose.model('User', userSchema);
export const Movie = mongoose.model('Movie', movieSchema);
export const Theatre = mongoose.model('Theatre', theatreSchema);
export const Show = mongoose.model('Show', showSchema);
export const Booking = mongoose.model('Booking', bookingSchema);
