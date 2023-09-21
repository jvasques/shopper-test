// validationRules.js
const db = require("../config/db");

// Função para verificar se o produto está na coluna 'pack_id' ou 'product_id' da tabela 'packs'
async function isProductInPacks(productCode) {
  return new Promise((resolve, reject) => {
    db.query(
      "SELECT * FROM packs WHERE pack_id = ? OR product_id = ?",
      [productCode, productCode],
      (err, results) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.length > 0);
        }
      }
    );
  });
}

module.exports = {
  isProductInPacks,
};