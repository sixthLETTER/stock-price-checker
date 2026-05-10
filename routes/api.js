'use strict';

const axios = require('axios');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Stock = require('../models/Stock');

mongoose.connect(process.env.DB);

function anonymizeIp(ip) {
  return crypto.createHash('sha256').update(ip + 'salt').digest('hex');
}

async function fetchPrice(symbol) {
  const url = `https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${symbol}/quote`;
  const { data } = await axios.get(url);
  return { symbol: data.symbol, price: data.latestPrice };
}

async function getStockData(symbol, like, ip) {
  const upper = symbol.toUpperCase();
  const { symbol: stock, price } = await fetchPrice(upper);

  let doc = await Stock.findOne({ symbol: upper });
  if (!doc) doc = await Stock.create({ symbol: upper, ips: [] });

  if (like) {
    const hashed = anonymizeIp(ip);
    if (!doc.ips.includes(hashed)) {
      doc.ips.push(hashed);
      await doc.save();
    }
  }

  return { stock, price, likes: doc.ips.length };
}

module.exports = function (app) {
  app.route('/api/stock-prices')
    .get(async function (req, res) {
      try {
        const { stock, like } = req.query;
        const ip = req.ip;
        const wantLike = like === 'true' || like === true;

        if (Array.isArray(stock)) {
          const [a, b] = await Promise.all([
            getStockData(stock[0], wantLike, ip),
            getStockData(stock[1], wantLike, ip)
          ]);
          return res.json({
            stockData: [
              { stock: a.stock, price: a.price, rel_likes: a.likes - b.likes },
              { stock: b.stock, price: b.price, rel_likes: b.likes - a.likes }
            ]
          });
        }

        const single = await getStockData(stock, wantLike, ip);
        return res.json({ stockData: single });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
      }
    });
};