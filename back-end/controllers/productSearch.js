const db = require("../config/db");

exports.searchProduct = (req, res) => {
  const productCode = req.params.productCode;

  db.query(
    "SELECT name, sales_price, cost_price FROM products WHERE code = ?",
    [productCode],
    (err, results) => {
      if (err) {
        console.error("Erro ao buscar produto:", err);
        res.status(500).json({ error: "Erro ao buscar produto" });
        return;
      }

      if (results.length === 0) {
        res.status(404).json({ error: "Produto não encontrado" });
      } else {
        const product = results[0];
        res.json(product);
      }
    }
  );
};