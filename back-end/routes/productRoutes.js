// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Rota para buscar um produto por código
router.get('/search-product/:productCode', productController.searchProduct);

// Rota para atualizar os preços dos produtos
router.post('/update-prices', productController.updatePrices);

module.exports = router;