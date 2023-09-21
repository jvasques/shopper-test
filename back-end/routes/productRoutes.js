// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productSearch = require('../controllers/productSearch');
const productController = require('../controllers/checkController'); // Importa o novo controlador

// Rota para buscar um produto por código
router.get('/search-product/:productCode', productSearch.searchProduct);

// Rota para atualizar os preços dos produtos
router.post('/update-prices', productController.updatePrices);

module.exports = router;