const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true, uppercase: true },
  ips: { type: [String], default: [] }
});

module.exports = mongoose.model('Stock', stockSchema);