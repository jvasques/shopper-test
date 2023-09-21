// checkController.js
const validationRules = require("../utils/validationRules");
const updatePacks = require("../utils/updatePacks");
const updateProducts = require("../utils/updateProducts");
const db = require("../config/db");

// Função para atualizar os preços dos produtos
async function updatePrices(req, res) {
  const priceUpdates = req.body;
  console.log("Dados de atualização recebidos do cliente:", priceUpdates);
  db.beginTransaction(async (err) => {
    if (err) {
      console.error("Erro ao iniciar transação:", err);
      res.status(500).json({ error: "Erro ao iniciar transação" });
      return;
    }

    try {
      const productCodesWithRepetitions = [];

      for (const update of priceUpdates) {
        const productCode = update.productCode;
        const newPrice = update.newPrice;

        const isProductInPacks = await validationRules.isProductInPacks(productCode);

        if (isProductInPacks) {
          console.log("Produto está em pacotes");
          const packRepeat = await new Promise(
            (resolve, reject) => {
              db.query(
                "SELECT pack_id, COUNT(*) AS repetitions FROM packs WHERE pack_id = ? HAVING repetitions > 1",
                [productCode],
                (err, results) => {
                  if (err) {
                    // Trate o erro aqui
                    console.error("Erro na consulta SQL:", err);
                    return;
                  }
                  
                  if (results.length > 0) {
                    // Se houver resultados, adicione o productCode à matriz de repetições
                    productCodesWithRepetitions.push(productCode);
                    console.log("O productCode está presente mais de uma vez em pack_id:", productCode);
                  } else {
                    // Se não houver resultados, significa que o productCode não está presente mais de uma vez em pack_id
                    console.log("O productCode não está presente mais de uma vez em pack_id.");
                  }
                }
              );                
            }
          );
          // await updatePacks(newPrice, productCode, packId, qty);
          // Produto está em pacotes, usar a lógica de atualização de pacotes
          // updatePacks.updateAllPackProducts(newPrice, productCode, packId, qty);
        } else {
          console.log("Produto não está em pacotes");
          await updateProducts(newPrice, productCode);
          // Produto não está em pacotes, usar a lógica de atualização de produtos
          // updateProducts.updateProductPriceDirectly(newPrice, productCode);
        }
      }

      // Exiba os códigos de produtos com repetições
      if (productCodesWithRepetitions.length > 0) {
        console.log("Códigos de produtos com repetições:", productCodesWithRepetitions);
      }

      // Commit da transação após todas as atualizações bem-sucedidas
      db.commit((err) => {
        if (err) {
          console.error("Erro ao confirmar transação:", err);
          res.status(500).json({ error: "Erro ao confirmar transação" });
        } else {
          res.json({ success: true });
        }
      });
    } catch (err) {
      console.error("Erro durante a transação:", err);
      // Reverta a transação em caso de erro
      db.rollback(() => {
        res.status(500).json({ error: "Erro durante a transação" });
      });
    }
  });
}

module.exports = {
  updatePrices,
};

